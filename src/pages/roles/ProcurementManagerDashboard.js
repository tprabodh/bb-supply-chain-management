
import React, { useState, useEffect } from 'react';
import { subscribeToPendingPurchaseRequests, updateProcurementRequestStatus } from '../../services/procurementService';
import { getProfilesByIds } from '../../services/profileService';
import Loader from '../../components/Loader';
import PastProcurements from '../../components/PastProcurements';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

const ProcurementManagerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPendingPurchaseRequests(async (pendingRequests) => {
      setRequests(pendingRequests);

      const teamLeadIds = [...new Set(pendingRequests.map(r => r.teamLeadId).filter(id => id))];
      if (teamLeadIds.length > 0) {
        const profiles = await getProfilesByIds(teamLeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setTeamLeadProfiles(profilesMap);
      }
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to procurement requests.');
      console.error('Error subscribing to procurement requests:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const cumulativeIngredients = requests.reduce((acc, req) => {
      req.ingredients.forEach(ing => {
          if (acc[ing.name]) {
              acc[ing.name].quantity += ing.quantity;
          } else {
              acc[ing.name] = { ...ing };
          }
      });
      return acc;
  }, {});

  const handleMarkAsPurchased = async () => {
    try {
        for (const req of requests) {
            await updateProcurementRequestStatus(req.id, 'Purchased');
        }
      toast.success('All requests marked as purchased!');
    } catch (error) {
      toast.error('Error marking as purchased. Please try again.');
      console.error('Error marking as purchased:', error);
    }
  };

  const getWeekRange = (startDate) => {
    const [day, month, year] = startDate.split('-');
    const start = new Date(year, month - 1, day);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Procurement Manager Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Cumulative Ingredient List to Buy</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.values(cumulativeIngredients).map((ing, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ing.forecastId && ing.forecastWeek ? `${teamLeadProfiles[ing.teamLeadId]?.subrole} (${getWeekRange(ing.forecastWeek)})` : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ing.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ing.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ing.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={handleMarkAsPurchased} className="px-6 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Mark All as Purchased</button>
                </div>
            </div>
            <PastProcurements />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcurementManagerDashboard;

