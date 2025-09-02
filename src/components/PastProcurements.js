
import React, { useState, useEffect } from 'react';
import { subscribeToSuccessfulProcurements } from '../services/procurementService';
import Loader from './Loader';
import { toast } from 'react-toastify';

const PastProcurements = () => {
  const [procurements, setProcurements] = useState([]);
  const [filteredProcurements, setFilteredProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    const unsubscribe = subscribeToSuccessfulProcurements((successfulProcurements) => {
      setProcurements(successfulProcurements);
      setFilteredProcurements(successfulProcurements);
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to past procurements.');
      console.error('Error subscribing to past procurements:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filterProcurements = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastWeekStart = new Date(new Date().setDate(thisWeekStart.getDate() - 7));
        const lastWeekEnd = new Date(new Date().setDate(thisWeekStart.getDate() - 1));
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        let filtered = [];

        switch (timePeriod) {
            case 'Today':
                filtered = procurements.filter(p => new Date(p.purchasedAt.seconds * 1000).toDateString() === now.toDateString());
                break;
            case 'This Week':
                filtered = procurements.filter(p => new Date(p.purchasedAt.seconds * 1000) >= thisWeekStart);
                break;
            case 'Last Week':
                filtered = procurements.filter(p => {
                    const purchasedDate = new Date(p.purchasedAt.seconds * 1000);
                    return purchasedDate >= lastWeekStart && purchasedDate <= lastWeekEnd;
                });
                break;
            case 'This Month':
                filtered = procurements.filter(p => new Date(p.purchasedAt.seconds * 1000) >= thisMonthStart);
                break;
            case 'Last Month':
                filtered = procurements.filter(p => {
                    const purchasedDate = new Date(p.purchasedAt.seconds * 1000);
                    return purchasedDate >= lastMonthStart && purchasedDate <= lastMonthEnd;
                });
                break;
            case 'Till Now':
                filtered = procurements;
                break;
            default:
                break;
        }

        setFilteredProcurements(filtered);
    };

    filterProcurements();
  }, [timePeriod, procurements]);

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Past Successful Procurements</h3>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <TimePeriodButton period="Today" />
        <TimePeriodButton period="This Week" />
        <TimePeriodButton period="Last Week" />
        <TimePeriodButton period="This Month" />
        <TimePeriodButton period="Last Month" />
        <TimePeriodButton period="Till Now" />
      </div>
      {loading && <div className="flex justify-center items-center h-32"><Loader /></div>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProcurements.map(procurement => (
                      <tr key={procurement.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{procurement.forecastId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(procurement.purchasedAt.seconds * 1000).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <ul className="list-disc list-inside space-y-1">
                                  {procurement.ingredients.map((ing, index) => (
                                      <li key={index}>{ing.quantity} {ing.unit} of {ing.name}</li>
                                  ))}
                              </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{procurement.status}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PastProcurements;
