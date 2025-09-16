
import React, { useState, useEffect } from 'react';
import { subscribeToPendingPurchaseRequests, updateProcurementRequestStatus } from '../../services/procurementService';
import { subscribeToApprovedBulkBuyOrders, markBulkBuyOrderAsPurchased } from '../../services/bulkBuyOrderService';
import { getProfilesByIds } from '../../services/profileService';
import Loader from '../../components/Loader';
import PastProcurements from '../../components/PastProcurements';
import BulkBuyOrderDetailsModal from '../../components/BulkBuyOrderDetailsModal';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

const ProcurementManagerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [bulkBuyOrders, setBulkBuyOrders] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBulkBuyOrder, setSelectedBulkBuyOrder] = useState(null);
  const [isBulkBuyOrderModalOpen, setIsBulkBuyOrderModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeRequests = subscribeToPendingPurchaseRequests(async (pendingRequests) => {
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

    const unsubscribeBulkBuyOrders = subscribeToApprovedBulkBuyOrders(setBulkBuyOrders, (err) => {
      toast.error('Error subscribing to bulk buy orders.');
      console.error('Error subscribing to bulk buy orders:', err);
      setLoading(false);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeBulkBuyOrders();
    };
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

  const handleBulkBuyOrderReviewClick = (order) => {
    setSelectedBulkBuyOrder(order);
    setIsBulkBuyOrderModalOpen(true);
  };

  const handleBulkBuyOrderCloseModal = () => {
    setIsBulkBuyOrderModalOpen(false);
    setSelectedBulkBuyOrder(null);
  };

  const handleMarkBulkBuyOrderAsPurchased = async (orderId) => {
    try {
      await markBulkBuyOrderAsPurchased(orderId);
      toast.success('Order marked as purchased!');
      handleBulkBuyOrderCloseModal();
    } catch (error) {
      toast.error('Failed to mark order as purchased.');
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
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Approved Bulk Buy Orders</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkBuyOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.approvedAt.seconds * 1000).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{order.totalOrderCost.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleBulkBuyOrderReviewClick(order)} className="px-4 py-2 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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

      {isBulkBuyOrderModalOpen && (
        <BulkBuyOrderDetailsModal 
            order={selectedBulkBuyOrder}
            onClose={handleBulkBuyOrderCloseModal}
            onApprove={handleMarkBulkBuyOrderAsPurchased}
            isProcurement={true}
        />
      )}
    </div>
  );
};

export default ProcurementManagerDashboard;

