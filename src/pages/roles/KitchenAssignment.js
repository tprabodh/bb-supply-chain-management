
import React, { useState, useEffect } from 'react';
import { subscribeToDailyTargetsByDate } from '../../services/dailyTargetService';
import { createCookingAssignment } from '../../services/kitchenService';
import { subscribeToProfilesByRole } from '../../services/profileService';
import { formatDate } from '../../utils/dateUtils';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';

const KitchenAssignment = () => {
  const [dailyTargets, setDailyTargets] = useState([]);
  const [aggregatedTargets, setAggregatedTargets] = useState([]);
  const [kitchenManagers, setKitchenManagers] = useState([]);
  const [preparedStock, setPreparedStock] = useState([]);
  const [assignmentQuantities, setAssignmentQuantities] = useState({}); // { kitchenManagerId: { itemName: quantity } }
  const [preparedStockAssignment, setPreparedStockAssignment] = useState({}); // { kitchenManagerId: { itemName: quantity } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const today = formatDate(new Date());

  useEffect(() => {
    let unsubscribeDailyTargets;
    let unsubscribeKitchenManagers;
    let unsubscribePreparedStock;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribeDailyTargets = subscribeToDailyTargetsByDate(today, (targets) => {
          const aggregated = targets.reduce((acc, target) => {
              target.items.forEach(item => {
                  const existingItem = acc.find(i => i.recipeId === item.recipeId);
                  if (existingItem) {
                      existingItem.quantity += item.quantity;
                  } else {
                      acc.push({ 
                        ...item,
                        forecastId: target.forecastId,
                        forecastWeek: target.forecastWeek
                      });
                  }
              });
              return acc;
          }, []);

          setDailyTargets(targets);
          setAggregatedTargets(aggregated);
        }, (err) => {
          setError('Failed to subscribe to daily targets.');
          console.error('Error subscribing to daily targets:', err);
          setLoading(false);
        });

        unsubscribeKitchenManagers = subscribeToProfilesByRole('Kitchen Manager', (fetchedKitchenManagers) => {
          setKitchenManagers(fetchedKitchenManagers);
        }, (err) => {
          setError('Failed to subscribe to kitchen managers.');
          console.error('Error subscribing to kitchen managers:', err);
          setLoading(false);
        });

        const qPreparedStock = query(collection(db, 'preparedStock'));
        unsubscribePreparedStock = onSnapshot(qPreparedStock, (snapshot) => {
          const stock = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPreparedStock(stock);
          setLoading(false);
        });

      } catch (err) {
        setError('Error setting up subscriptions.');
        console.error('Error setting up subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeDailyTargets) unsubscribeDailyTargets();
      if (unsubscribeKitchenManagers) unsubscribeKitchenManagers();
      if (unsubscribePreparedStock) unsubscribePreparedStock();
    };
  }, []);

  const handleAssignmentQuantityChange = (kitchenManagerId, itemName, value) => {
    setAssignmentQuantities(prevQuantities => ({
      ...prevQuantities,
      [kitchenManagerId]: {
        ...prevQuantities[kitchenManagerId],
        [itemName]: parseFloat(value) || 0,
      },
    }));
  };

  const handlePreparedStockAssignmentChange = (kitchenManagerId, itemName, value) => {
    setPreparedStockAssignment(prevQuantities => ({
      ...prevQuantities,
      [kitchenManagerId]: {
        ...prevQuantities[kitchenManagerId],
        [itemName]: parseFloat(value) || 0,
      },
    }));
  };

  const calculateTotalAssigned = (itemName) => {
    let total = 0;
    Object.values(assignmentQuantities).forEach(kmAssignments => {
      total += kmAssignments[itemName] || 0;
    });
    return total;
  };

  const calculateTotalPreparedAssigned = (itemName) => {
    let total = 0;
    Object.values(preparedStockAssignment).forEach(kmAssignments => {
      total += kmAssignments[itemName] || 0;
    });
    return total;
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    let allQuantitiesMatch = true;
    const cookingAssignmentsToCreate = [];

    for (const item of aggregatedTargets) {
      const totalAssignedForItem = calculateTotalAssigned(item.name) + calculateTotalPreparedAssigned(item.name);
      if (totalAssignedForItem !== parseFloat(item.quantity)) {
        setError(`Total assigned quantity for ${item.name} (${totalAssignedForItem}) does not match aggregated quantity (${item.quantity}).`);
        allQuantitiesMatch = false;
        break;
      }
    }

    if (!allQuantitiesMatch) {
      setLoading(false);
      return;
    }

    const firstTargetWithForecast = aggregatedTargets.find(t => t.forecastId);
    const forecastId = firstTargetWithForecast ? firstTargetWithForecast.forecastId : null;
    const forecastWeek = firstTargetWithForecast ? firstTargetWithForecast.forecastWeek : null;

    kitchenManagers.forEach(km => {
      const itemsForThisKitchenManager = [];
      const fromPreparedStockForThisManager = [];

      aggregatedTargets.forEach(item => {
        const assignedQty = assignmentQuantities[km.id]?.[item.name] || 0;
        if (assignedQty > 0) {
          itemsForThisKitchenManager.push({
            ...item,
            quantity: assignedQty,
          });
        }

        const assignedPreparedQty = preparedStockAssignment[km.id]?.[item.name] || 0;
        if (assignedPreparedQty > 0) {
          fromPreparedStockForThisManager.push({
            name: item.name,
            quantity: assignedPreparedQty,
          });
        }
      });

      if (itemsForThisKitchenManager.length > 0 || fromPreparedStockForThisManager.length > 0) {
        cookingAssignmentsToCreate.push({
          date: today,
          kitchenId: km.id,
          kitchenName: km.name,
          kitchenManagerId: km.id,
          items: itemsForThisKitchenManager,
          fromPreparedStock: fromPreparedStockForThisManager,
          status: 'Pending Dispersal',
          forecastId: forecastId, 
          forecastWeek: forecastWeek,
        });
      }
    });

    try {
      for (const assignment of cookingAssignmentsToCreate) {
        await createCookingAssignment(assignment);
      }

      setSuccess('Kitchen assignments created successfully!');
      setAssignmentQuantities({});
      setPreparedStockAssignment({});
    } catch (err) {
      setError(`Failed to create assignments: ${err.message}`);
      console.error('Error creating assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Kitchen Assignment for {today}</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      {loading && <p className="text-blue-500 mb-4">Loading...</p>}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Assign Daily Targets to Kitchens</h2>
        <form onSubmit={handleAssign} className="space-y-4">
          {aggregatedTargets.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Aggregated Items:</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Item (Prepared Stock)</th>
                      <th className="py-2 px-4 border-b">Total Qty</th>
                      {kitchenManagers.map(km => (
                        <th key={km.id} className="py-2 px-4 border-b">{km.name} (Cook)</th>
                      ))}
                      {kitchenManagers.map(km => (
                        <th key={km.id} className="py-2 px-4 border-b">{km.name} (Prepared)</th>
                      ))}
                      <th className="py-2 px-4 border-b">Total Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedTargets.map((item) => {
                      const preparedQty = preparedStock.find(ps => ps.name === item.name)?.quantity || 0;
                      return (
                        <tr key={item.name}>
                          <td className="py-2 px-4 border-b">{item.name} ({preparedQty})</td>
                          <td className="py-2 px-4 border-b">{item.quantity}</td>
                          {kitchenManagers.map(km => (
                            <td key={km.id} className="py-2 px-4 border-b">
                              <input
                                type="number"
                                min="0"
                                value={assignmentQuantities[km.id]?.[item.name] || 0}
                                onChange={(e) => handleAssignmentQuantityChange(km.id, item.name, e.target.value)}
                                className="w-20 border border-gray-300 rounded-md p-1 text-center"
                              />
                            </td>
                          ))}
                          {kitchenManagers.map(km => (
                            <td key={km.id} className="py-2 px-4 border-b">
                              <input
                                type="number"
                                min="0"
                                max={preparedQty}
                                value={preparedStockAssignment[km.id]?.[item.name] || 0}
                                onChange={(e) => handlePreparedStockAssignmentChange(km.id, item.name, e.target.value)}
                                className="w-20 border border-gray-300 rounded-md p-1 text-center"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-4 border-b font-semibold">
                            {calculateTotalAssigned(item.name) + calculateTotalPreparedAssigned(item.name)}
                            {(calculateTotalAssigned(item.name) + calculateTotalPreparedAssigned(item.name)) !== parseFloat(item.quantity) && (
                              <span className="text-red-500 ml-2">!</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p>No daily targets set for today.</p>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
            disabled={loading || aggregatedTargets.length === 0}
          >
            {loading ? 'Assigning...' : 'Assign to Kitchens'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default KitchenAssignment;
