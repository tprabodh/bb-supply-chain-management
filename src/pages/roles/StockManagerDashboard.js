import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot, query, where, doc, updateDoc, runTransaction, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getProfilesByIds } from '../../services/profileService';
import { reportSpoilage } from '../../services/stockService';
import { subscribeToPurchasedBulkBuyOrders, confirmBulkBuyOrderReceipt } from '../../services/bulkBuyOrderService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import StockManagerStock from '../../components/StockManagerStock';
import { subscribeToStockManagerForecasts, updateForecastStatus, updateMultipleForecastStatuses } from '../../services/forecastService';
import { subscribeToDailyTargetsByDate } from '../../services/dailyTargetService';
import { subscribeToProfilesByRole } from '../../services/profileService';
import StockManagerKitchenAssignment from '../../components/StockManagerKitchenAssignment';

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const StockManagerDashboard = () => {
  const { user } = useAuth();
  const [pendingDispersalAssignments, setPendingDispersalAssignments] = useState([]);
  const [stockBackRequests, setStockBackRequests] = useState([]);
  
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [spoilageQuantities, setSpoilageQuantities] = useState({});
  const [spoilageHistory, setSpoilageHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [purchasedRequests, setPurchasedRequests] = useState([]);
  const [bulkBuyOrders, setBulkBuyOrders] = useState([]);
  const [pendingForecasts, setPendingForecasts] = useState([]);
  const [dailyTargets, setDailyTargets] = useState([]);
  const [pendingCookedFoodCollection, setPendingCookedFoodCollection] = useState([]);
  const [kitchenManagers, setKitchenManagers] = useState([]);
  const [preparedStockData, setPreparedStockData] = useState([]); // Renamed to avoid conflict with preparedStock state in KitchenAssignment

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const qAssignments = query(collection(db, 'cookingAssignments'), where('status', '==', 'Pending Dispersal'));
    const unsubscribeAssignments = onSnapshot(qAssignments, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingDispersalAssignments(assignments);
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to cooking assignments.');
      console.error('Error subscribing to cooking assignments:', err);
      setLoading(false);
    });

    const qStockBack = query(collection(db, 'stockBackRequests'), where('status', '==', 'Ready for Restock'));
    const unsubscribeStockBack = onSnapshot(qStockBack, async (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStockBackRequests(requests);

      const teamLeadIds = [...new Set(requests.map(r => r.teamLeadId))];
      if (teamLeadIds.length > 0) {
        const profiles = await getProfilesByIds(teamLeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setTeamLeadProfiles(profilesMap);
      }
    }, (err) => {
      toast.error('Error subscribing to stock back requests.');
      console.error('Error subscribing to stock back requests:', err);
    });

    

    const qSpoilageHistory = query(collection(db, 'spoilageLog'), where('stockManagerId', '==', user.uid));
    const unsubscribeSpoilageHistory = onSnapshot(qSpoilageHistory, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpoilageHistory(history);
    });

    const qPurchased = query(collection(db, 'procurementRequests'), where('status', '==', 'Purchased'));
    const unsubscribePurchased = onSnapshot(qPurchased, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchasedRequests(requests);
    });

    const unsubscribeBulkBuyOrders = subscribeToPurchasedBulkBuyOrders(setBulkBuyOrders, (err) => {
      toast.error('Error subscribing to bulk buy orders.');
      console.error('Error subscribing to bulk buy orders:', err);
    });

    const today = formatDate(new Date()); // Define today here

    const unsubscribeForecasts = subscribeToStockManagerForecasts(async (fetchedForecasts) => {
      setPendingForecasts(fetchedForecasts);
    }, (err) => {
      toast.error('Error subscribing to pending forecasts for Stock Manager.');
      console.error('Error subscribing to pending forecasts for Stock Manager:', err);
    });

    const unsubscribeDailyTargets = subscribeToDailyTargetsByDate(today, setDailyTargets, (err) => {
      toast.error('Error subscribing to daily targets.');
      console.error('Error subscribing to daily targets:', err);
    });

    const unsubscribeKitchenManagers = subscribeToProfilesByRole('Kitchen Manager', setKitchenManagers, (err) => {
      toast.error('Error subscribing to kitchen managers.');
      console.error('Error subscribing to kitchen managers:', err);
    });

    const qPreparedStock = query(collection(db, 'preparedStock'));
    const unsubscribePreparedStockData = onSnapshot(qPreparedStock, (snapshot) => {
      const stock = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPreparedStockData(stock);
    }, (err) => {
      toast.error('Error subscribing to prepared stock.');
      console.error('Error subscribing to prepared stock:', err);
    });

    const qPendingCookedFood = query(collection(db, 'cookingAssignments'), where('status', '==', 'Pending Stock Manager Collection'));
    const unsubscribePendingCookedFood = onSnapshot(qPendingCookedFood, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingCookedFoodCollection(assignments);
    }, (err) => {
      toast.error('Error subscribing to pending cooked food collection.');
      console.error('Error subscribing to pending cooked food collection:', err);
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeStockBack();
      unsubscribeSpoilageHistory();
      unsubscribePurchased();
      unsubscribeBulkBuyOrders();
      unsubscribeForecasts();
      unsubscribeDailyTargets();
      unsubscribeKitchenManagers();
      unsubscribePreparedStockData();
      unsubscribePendingCookedFood();
    };
  }, [user]);

  const handleDisperse = async (task) => {
    try {
      // Get recipes outside of the transaction
      const recipePromises = task.items.map(item => 
        getDocs(query(collection(db, 'recipes'), where('name', '==', item.name)))
      );
      const recipeSnapshots = await Promise.all(recipePromises);

      const recipes = recipeSnapshots.map((snapshot, index) => {
        if (snapshot.empty) {
          throw new Error(`Recipe for ${task.items[index].name} not found.`);
        }
        return snapshot.docs[0].data();
      });

      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, 'cookingAssignments', task.id);

        // 1. READS
        const preparedStockRefs = (task.fromPreparedStock || []).map(item => doc(db, 'preparedStock', item.name));
        const preparedStockDocs = await Promise.all(preparedStockRefs.map(ref => transaction.get(ref)));

        const allIngredients = [];
        recipes.forEach((recipe, index) => {
            recipe.ingredients.forEach(ingredient => {
                allIngredients.push({
                    name: ingredient.name,
                    quantity: ingredient.quantity * task.items[index].quantity
                });
            });
        });
        
        const stockRefs = allIngredients.map(ing => doc(db, 'stock', ing.name));
        const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

        // 2. WRITES
        (task.fromPreparedStock || []).forEach((item, index) => {
            const preparedStockDoc = preparedStockDocs[index];
            if (!preparedStockDoc.exists()) {
                throw new Error(`Prepared stock for ${item.name} not found`);
            }
            const newQuantity = preparedStockDoc.data().quantity - item.quantity;
            if (newQuantity < 0) {
                throw new Error(`Not enough prepared stock for ${item.name}`);
            }
            transaction.update(preparedStockRefs[index], { quantity: newQuantity });
        });

        allIngredients.forEach((ingredient, index) => {
            const stockDoc = stockDocs[index];
            if (!stockDoc.exists()) {
                throw new Error(`Raw stock for ${ingredient.name} not found`);
            }
            const newQuantity = stockDoc.data().quantity - ingredient.quantity;
            if (newQuantity < 0) {
                throw new Error(`Not enough raw stock for ${ingredient.name}`);
            }
            transaction.update(stockRefs[index], { quantity: newQuantity });
        });

        transaction.update(taskRef, { status: 'Dispersed' });
      });

      toast.success('Items dispersed successfully!');
    } catch (error) {
      toast.error(`Error dispersing items: ${error.message}`);
      console.error('Error dispersing items:', error);
    }
  };

  const handleConfirmRestock = async (requestId) => {
    try {
      const request = stockBackRequests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found.');
        return;
      }

      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'stockBackRequests', requestId);
        const requestDoc = await transaction.get(requestRef);

        if (!requestDoc.exists()) {
          throw new Error('Request document not found in transaction.');
        }

        const requestData = requestDoc.data();
        const itemsToRestock = requestData.items;
        const preparedStockRefs = {};
        const preparedStockDocs = {};

        for (const item of itemsToRestock) {
          preparedStockRefs[item.name] = doc(db, 'preparedStock', item.name);
          preparedStockDocs[item.name] = await transaction.get(preparedStockRefs[item.name]);
        }

        transaction.update(requestRef, { status: 'Restocked' });

        for (const item of itemsToRestock) {
          const preparedStockDoc = preparedStockDocs[item.name];

          if (preparedStockDoc.exists()) {
            const newQuantity = (preparedStockDoc.data().quantity || 0) + item.quantity;
            transaction.update(preparedStockRefs[item.name], { quantity: newQuantity });
          } else {
            transaction.set(preparedStockRefs[item.name], { 
              quantity: item.quantity, 
              name: item.name, 
              returnedAt: Timestamp.now() 
            });
          }
        }
      });

      toast.success('Restock confirmed!');
    } catch (error) {
      toast.error(`Error confirming restock: ${error.message}`);
      console.error('Error confirming restock:', error);
    }
  };

  const handleSpoilageQuantityChange = (itemId, value) => {
    setSpoilageQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleReportSpoilage = async (itemId, quantity) => {
    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid spoilage quantity.');
      return;
    }

    try {
      await reportSpoilage({
        itemType: 'preparedStock',
        itemId: itemId,
        quantity: Number(quantity),
        stockManagerId: user.uid,
      });
      toast.success('Spoilage reported successfully!');
      setSpoilageQuantities(prev => ({ ...prev, [itemId]: '' }));
    } catch (error) {
      toast.error(`Error reporting spoilage: ${error.message}`);
      console.error('Error reporting spoilage:', error);
    }
  };

  const handleConfirmReceipt = async (request) => {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'procurementRequests', request.id);
        
        // 1. Read all stock documents first
        const stockDocs = await Promise.all(
          request.ingredients.map(ingredient => {
            const stockRef = doc(db, 'stock', ingredient.name);
            return transaction.get(stockRef);
          })
        );

        // 2. Perform all writes
        request.ingredients.forEach((ingredient, index) => {
          const stockDoc = stockDocs[index];
          const stockRef = doc(db, 'stock', ingredient.name);

          if (stockDoc.exists()) {
            const newQuantity = (stockDoc.data().quantity || 0) + ingredient.quantity;
            transaction.update(stockRef, { quantity: newQuantity });
          } else {
            transaction.set(stockRef, {
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            });
          }
        });

        transaction.update(requestRef, { status: 'Received' });
      });

      toast.success('Stock updated successfully!');
    } catch (error) {
      toast.error(`Error confirming receipt: ${error.message}`);
      console.error('Error confirming receipt:', error);
    }
  };

  const handleConfirmBulkBuyReceipt = async (order) => {
    try {
      await confirmBulkBuyOrderReceipt(order);
      toast.success('Bulk buy order received and stock updated!');
    } catch (error) {
      toast.error(`Error confirming bulk buy receipt: ${error.message}`);
      console.error('Error confirming bulk buy receipt:', error);
    }
  };

  const handleApproveForecast = async (individualForecasts) => {
    try {
      await updateMultipleForecastStatuses(individualForecasts, 'Pending Finance Approval');
      toast.success('Forecasts approved and sent to Finance!');
    } catch (error) {
      toast.error(`Error approving forecasts: ${error.message}`);
      console.error('Error approving forecasts:', error);
    }
  };

  const handleRejectForecast = async (individualForecasts) => {
    try {
      await updateMultipleForecastStatuses(individualForecasts, 'Rejected by Stock Manager');
      toast.info('Forecasts rejected.');
    } catch (error) {
      toast.error(`Error rejecting forecasts: ${error.message}`);
      console.error('Error rejecting forecasts:', error);
    }
  };

  const handleConfirmCookedFoodCollection = async (assignmentId) => {
    try {
      await updateDoc(doc(db, 'cookingAssignments', assignmentId), { status: 'Ready for Logistics Collection' });
      toast.success('Cooked food marked as ready for logistics collection!');
    } catch (error) {
      toast.error(`Error confirming cooked food collection: ${error.message}`);
      console.error('Error confirming cooked food collection:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Stock Manager Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Purchased Bulk Buy Orders</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkBuyOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.purchasedAt.seconds * 1000).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {order.ingredients.map((item, index) => (
                              <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleConfirmBulkBuyReceipt(order)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Receipt</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Pending Forecasts for Approval</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zonal Head EmpCode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zonal Head Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast Week</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aggregated Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingForecasts.map(forecast => (
                      <tr key={forecast.zonalHeadEmpCode} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{forecast.zonalHeadEmpCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{forecast.zonalHeadName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{forecast.forecastWeek}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {Object.values(forecast.items).map((item, index) => (
                              <li key={index}>{item.quantity} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleApproveForecast(forecast.individualForecasts)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300 mr-2">Approve</button>
                          <button onClick={() => handleRejectForecast(forecast.individualForecasts)} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transform hover:-translate-y-0.5 transition-all duration-300">Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Ingredient Dispersal Tasks</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitchen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingDispersalAssignments.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.kitchenName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.forecastId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {task.items.map((item, index) => (
                              <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleDisperse(task)} className="px-4 py-2 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Disperse</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Purchased Ingredients Ready for Stocking</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procurement ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchasedRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {req.ingredients.map((item, index) => (
                              <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleConfirmReceipt(req)} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Receipt</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Ready for Restock</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockBackRequests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teamLeadProfiles[req.teamLeadId]?.name || req.teamLeadId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {req.items.map((item, index) => (
                              <li key={index}>{item.quantity} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleConfirmRestock(req.id)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Restock</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Prepared Stock</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returned On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Spoilage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preparedStockData.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.returnedAt ? formatDate(item.returnedAt.seconds * 1000) : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={spoilageQuantities[item.id] || ''}
                              onChange={(e) => handleSpoilageQuantityChange(item.id, e.target.value)}
                              className="w-24 pl-3 pr-1 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                              placeholder="Qty"
                            />
                            <button
                              onClick={() => handleReportSpoilage(item.id, spoilageQuantities[item.id])}
                              className="px-3 py-1 font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transform hover:-translate-y-0.5 transition-all duration-300"
                            >
                              Report
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Cooked Food Ready for Collection</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitchen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingCookedFoodCollection.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.kitchenName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {assignment.items.map((item, index) => (
                              <li key={index}>{item.quantity} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleConfirmCookedFoodCollection(assignment.id)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Collection</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <StockManagerKitchenAssignment
              dailyTargets={dailyTargets}
              kitchenManagers={kitchenManagers}
              preparedStock={preparedStockData}
            />

            <StockManagerStock />

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
              <button
                onClick={() => setHistoryVisible(!historyVisible)}
                className="w-full text-left px-4 py-2 font-semibold text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-300 flex justify-between items-center"
              >
                <span>Spoilage History</span>
                <svg className={`w-5 h-5 transform transition-transform ${historyVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {historyVisible && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {spoilageHistory.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.itemType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reportedAt ? formatDate(item.reportedAt.seconds * 1000) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManagerDashboard;