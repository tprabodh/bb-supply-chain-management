
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToDistributionsByTeamLead, updateDistributionStatus } from '../../services/logisticsService';
import { getStockBackDataForTeamLead } from '../../services/stockBackService';
import { getProfilesByIds } from '../../services/profileService';
import Loader from '../../components/Loader';
import SalesData from '../../components/SalesData';
import StockBackRequests from '../../components/StockBackRequests';
import { toast } from 'react-toastify';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const TeamLeadDashboard = () => {
  const { user } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [stockBackData, setStockBackData] = useState([]);
  const [processedStockBack, setProcessedStockBack] = useState(false);
  const [logisticsManagerProfiles, setLogisticsManagerProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStockBackData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      const q = query(
        collection(db, 'stockBackRequests'), 
        where('teamLeadId', '==', user.id), 
        where('createdAt', '>=', todayTimestamp)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setProcessedStockBack(true);
      }

      const data = await getStockBackDataForTeamLead(user.id);
      setStockBackData(data);
    } catch (error) {
      toast.error('Error fetching stock back data.');
      console.error('Error fetching stock back data:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeDistributions = subscribeToDistributionsByTeamLead(user.id, async (fetchedDistributions) => {
      setDistributions(fetchedDistributions);

      const logisticsManagerIds = [...new Set(fetchedDistributions.map(d => d.logisticsManagerId))];
      if (logisticsManagerIds.length > 0) {
        const profiles = await getProfilesByIds(logisticsManagerIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setLogisticsManagerProfiles(profilesMap);
      }
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to distributions.');
      console.error('Error subscribing to distributions:', err);
      setLoading(false);
    });

    fetchStockBackData();

    return () => {
      unsubscribeDistributions();
    };
  }, [user]);

  const handleConfirmReceipt = async (distributionId) => {
    try {
      await updateDistributionStatus(distributionId, 'Received');
      toast.success('Receipt confirmed!');
    } catch (error) {
      toast.error('Error confirming receipt. Please try again.');
      console.error('Error confirming receipt:', error);
    }
  };

  const incomingDeliveries = distributions.filter(d => d.status === 'In Transit');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Team Lead Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Incoming Deliveries</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent On</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {incomingDeliveries.map(dist => (
                                <tr key={dist.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{logisticsManagerProfiles[dist.logisticsManagerId]?.subrole || dist.logisticsManagerId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(dist.createdAt.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <ul className="list-disc list-inside space-y-1">
                                            {dist.items.map((item, index) => (
                                                <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleConfirmReceipt(dist.id)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Confirm Receipt</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <StockBackRequests 
              stockBackData={stockBackData} 
              teamLeadId={user.id} 
              onProcess={() => {
                setProcessedStockBack(true);
                fetchStockBackData();
              }}
              processed={processedStockBack}
            />
            <SalesData />
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeadDashboard;
