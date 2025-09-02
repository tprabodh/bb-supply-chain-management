
import React from 'react';
import { toast } from 'react-toastify';
import { collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const StockBackRequests = ({ stockBackData, teamLeadId, onProcess, processed }) => {
  const handleProcessToLogistics = async () => {
    if (stockBackData.length === 0) {
      toast.error('No stock back requests to process.');
      return;
    }

    try {
      const vendorEmails = stockBackData.map(vendor => vendor.email);
      const profilesQuery = query(collection(db, 'profiles'), where('email', 'in', vendorEmails));
      const profilesSnapshot = await getDocs(profilesQuery);
      const profilesMap = profilesSnapshot.docs.reduce((map, doc) => {
        const profile = doc.data();
        map[profile.email] = doc.id;
        return map;
      }, {});

      const items = stockBackData.flatMap(vendor => 
        vendor.menu.filter(item => item.stockBacked > 0).map(item => ({
          name: item.name,
          quantity: item.stockBacked,
          salesExecutiveId: profilesMap[vendor.email],
        }))
      );

      await addDoc(collection(db, 'stockBackRequests'), {
        teamLeadId,
        items,
        status: 'Pending Logistics Pickup',
        createdAt: Timestamp.now(),
      });

      toast.success('Stock back requests processed to logistics.');
      onProcess();
    } catch (error) {
      toast.error('Error processing stock back requests.');
      console.error('Error processing stock back requests:', error);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Stock Back Requests</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Executive</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stockBackData.length > 0 ? (
              stockBackData.map(vendor => (
                vendor.menu.filter(item => item.stockBacked > 0).map((item, index) => (
                  <tr key={`${vendor.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stockBacked}</td>
                  </tr>
                ))
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No stock back requests for today.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 text-right">
        <button 
          onClick={handleProcessToLogistics}
          className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transform hover:-translate-y-0.5 transition-all duration-300"
          disabled={stockBackData.length === 0 || processed}
        >
          Process to Logistics
        </button>
      </div>
    </div>
  );
};

export default StockBackRequests;
