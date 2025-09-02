import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot, query, where, doc, updateDoc, runTransaction, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getProfilesByIds } from '../../services/profileService';
import { reportSpoilage } from '../../services/stockService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import StockManagerStock from '../../components/StockManagerStock';

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
  const [preparedStock, setPreparedStock] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [spoilageQuantities, setSpoilageQuantities] = useState({});
  const [spoilageHistory, setSpoilageHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);

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

    const qPreparedStock = query(collection(db, 'preparedStock'));
    const unsubscribePreparedStock = onSnapshot(qPreparedStock, (snapshot) => {
      const stock = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPreparedStock(stock);
    });

    const qSpoilageHistory = query(collection(db, 'spoilageLog'), where('stockManagerId', '==', user.uid));
    const unsubscribeSpoilageHistory = onSnapshot(qSpoilageHistory, (snapshot) => {
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpoilageHistory(history);
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeStockBack();
      unsubscribePreparedStock();
      unsubscribeSpoilageHistory();
    };
  }, [user]);

  const handleDisperse = async (task) => {
    try {
      await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, 'cookingAssignments', task.id);
        
        if (task.fromPreparedStock) {
          for (const item of task.fromPreparedStock) {
            const preparedStockRef = doc(db, 'preparedStock', item.name);
            const preparedStockDoc = await transaction.get(preparedStockRef);
            if (preparedStockDoc.exists()) {
              const newQuantity = preparedStockDoc.data().quantity - item.quantity;
              if (newQuantity < 0) {
                throw new Error(`Not enough prepared stock for ${item.name}`);
              }
              transaction.update(preparedStockRef, { quantity: newQuantity });
            } else {
              throw new Error(`Prepared stock for ${item.name} not found`);
            }
          }
        }

        for (const item of task.items) {
          const recipeQuery = query(collection(db, 'recipes'), where('name', '==', item.name));
          const recipeSnapshot = await getDocs(recipeQuery);

          if (recipeSnapshot.empty) {
            throw new Error(`Recipe for ${item.name} not found. Cannot disperse ingredients.`);
          }

          const recipe = recipeSnapshot.docs[0].data();
          const ingredients = recipe.ingredients;

          for (const ingredient of ingredients) {
            const stockRef = doc(db, 'stock', ingredient.name);
            const stockDoc = await transaction.get(stockRef);

            if (stockDoc.exists()) {
              const newQuantity = stockDoc.data().quantity - (ingredient.quantity * item.quantity);
              if (newQuantity < 0) {
                throw new Error(`Not enough raw stock for ${ingredient.name}`);
              }
              transaction.update(stockRef, { quantity: newQuantity });
            } else {
              throw new Error(`Raw stock for ${ingredient.name} not found`);
            }
          }
        }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Stock Manager Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
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
                    {preparedStock.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.returnedAt.seconds * 1000)}</td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.reportedAt.seconds * 1000)}</td>
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