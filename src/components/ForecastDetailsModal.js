import React, { useState, useEffect } from 'react';
import { getProfileById } from '../services/profileService';
import { toast } from 'react-toastify';

const ForecastDetailsModal = ({ forecast, onClose, onApprove, zonalHeadProfile }) => {
  const [editableItems, setEditableItems] = useState([]);
  const [teamLeadProfile, setTeamLeadProfile] = useState(null);

  useEffect(() => {
    setEditableItems(JSON.parse(JSON.stringify(forecast.items)));
    const fetchTeamLeadProfile = async () => {
        if (forecast) {
            const profile = await getProfileById(forecast.teamLeadId);
            setTeamLeadProfile(profile);
        }
    };
    fetchTeamLeadProfile();
  }, [forecast]);

  const handleQuantityChange = (index, newQuantity) => {
    const updatedItems = [...editableItems];
    updatedItems[index].quantity = newQuantity;
    setEditableItems(updatedItems);
  };

  const handleApprove = () => {
    onApprove(forecast.id, 'Accepted by Finance', forecast.items);
    toast.success('Forecast accepted successfully!');
  };

  const handleApproveWithModifications = () => {
    onApprove(forecast.id, 'Accepted by Finance', editableItems);
    toast.success('Forecast accepted with modifications!');
  };

  const handleReject = () => {
    onApprove(forecast.id, 'Rejected by Finance', forecast.items);
    toast.info('Forecast rejected by Finance.');
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-6 lg:p-8">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition duration-150 ease-in-out">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-6">Review Forecast</h3>
        <div className="space-y-4 text-gray-700">
            <p><span className="font-semibold">Zonal Head:</span> {zonalHeadProfile?.subrole || forecast.zonalHeadId}</p>
            <p><span className="font-semibold">Team Lead:</span> {teamLeadProfile?.subrole || forecast.teamLeadId}</p>
            <p><span className="font-semibold">Submitted:</span> {forecast.createdAt ? new Date(forecast.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
            
            <div className="mt-6">
                <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">Forecasted Items</h4>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {editableItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{forecast.items[index].quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input 
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
                <button onClick={handleReject} className="w-full sm:w-auto px-6 py-3 font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5">Reject</button>
                <button onClick={handleApprove} className="w-full sm:w-auto px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5">Approve Original</button>
                <button onClick={handleApproveWithModifications} className="w-full sm:w-auto px-6 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5">Approve with Modifications</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastDetailsModal;
