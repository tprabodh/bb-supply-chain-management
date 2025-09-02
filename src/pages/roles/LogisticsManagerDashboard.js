import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getProfilesByIds } from '../../services/profileService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const LogisticsManagerDashboard = () => {
  const { user } = useAuth();
  const [stockBackRequests, setStockBackRequests] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'stockBackRequests'), where('status', 'in', ['Pending Logistics Pickup', 'Picked Up by Logistics']));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStockBackRequests(requests);

      const teamLeadIds = [...new Set(requests.map(r => r.teamLeadId))];
      if (teamLeadIds.length > 0) {
        const profiles = await getProfilesByIds(teamLeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setTeamLeadProfiles(profilesMap);
      }
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to stock back requests.');
      console.error('Error subscribing to stock back requests:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleConfirmPickup = async (requestId) => {
    try {
      const requestRef = doc(db, 'stockBackRequests', requestId);
      await updateDoc(requestRef, { status: 'Picked Up by Logistics' });

      const request = stockBackRequests.find(r => r.id === requestId);
      await addDoc(collection(db, 'logisticsStockBack'), {
        teamLeadId: request.teamLeadId,
        items: request.items,
        collectedAt: Timestamp.now(),
      });

      toast.success('Pickup confirmed!');
    } catch (error) {
      toast.error('Error confirming pickup. Please try again.');
      console.error('Error confirming pickup:', error);
    }
  };

  const handleReadyToRestock = async () => {
    try {
      const promises = stockBackRequests
        .filter(r => r.status === 'Picked Up by Logistics')
        .map(r => updateDoc(doc(db, 'stockBackRequests', r.id), { status: 'Ready for Restock' }));
      await Promise.all(promises);
      toast.success('All picked up items are now ready for restock.');
    } catch (error) {
      toast.error('Error marking items as ready for restock.');
      console.error('Error marking items as ready for restock:', error);
    }
  };

  const pendingPickups = stockBackRequests.filter(r => r.status === 'Pending Logistics Pickup');
  const pickedUp = stockBackRequests.filter(r => r.status === 'Picked Up by Logistics');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Logistics Manager Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Pending Pickups</h3>
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
                    {pendingPickups.map(req => (
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
                          <button onClick={() => handleConfirmPickup(req.id)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Pickup</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Picked Up Items</h3>
                <button 
                  onClick={handleReadyToRestock}
                  className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transform hover:-translate-y-0.5 transition-all duration-300"
                  disabled={pickedUp.length === 0}
                >
                  Ready to Restock
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pickedUp.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teamLeadProfiles[req.teamLeadId]?.name || req.teamLeadId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <ul className="list-disc list-inside space-y-1">
                            {req.items.map((item, index) => (
                              <li key={index}>{item.quantity} of {item.name}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsManagerDashboard;