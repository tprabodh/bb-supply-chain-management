
import React, { useState, useEffect } from 'react';
import { subscribeToStock } from '../services/procurementService';
import { reportSpoilage } from '../services/stockService';
import Loader from './Loader';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const StockManagerStock = () => {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spoilageQuantities, setSpoilageQuantities] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToStock((stockData) => {
      setStock(stockData);
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to stock data.');
      console.error('Error subscribing to stock data:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        itemType: 'ingredient',
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
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Current Stock</h3>
      {loading && <div className="flex justify-center items-center h-32"><Loader /></div>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Spoilage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stock.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
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
      )}
    </div>
  );
};

export default StockManagerStock;
