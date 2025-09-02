
import React, { useState, useEffect } from 'react';
import { subscribeToReceivedDistributions } from '../services/logisticsService';
import { getProfilesByIds } from '../services/profileService';
import Loader from './Loader';
import { toast } from 'react-toastify';

const PastTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    const unsubscribe = subscribeToReceivedDistributions(async (receivedTransfers) => {
      setTransfers(receivedTransfers);
      setFilteredTransfers(receivedTransfers);

      const teamLeadIds = [...new Set(receivedTransfers.map(t => t.teamLeadId))];
      if (teamLeadIds.length > 0) {
        const profiles = await getProfilesByIds(teamLeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setTeamLeadProfiles(profilesMap);
      }
      setLoading(false);
    }, (err) => {
      toast.error('Error subscribing to past transfers.');
      console.error('Error subscribing to past transfers:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filterTransfers = () => {
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
                filtered = transfers.filter(t => new Date(t.receivedAt.seconds * 1000).toDateString() === now.toDateString());
                break;
            case 'This Week':
                filtered = transfers.filter(t => new Date(t.receivedAt.seconds * 1000) >= thisWeekStart);
                break;
            case 'Last Week':
                filtered = transfers.filter(t => {
                    const receivedDate = new Date(t.receivedAt.seconds * 1000);
                    return receivedDate >= lastWeekStart && receivedDate <= lastWeekEnd;
                });
                break;
            case 'This Month':
                filtered = transfers.filter(t => new Date(t.receivedAt.seconds * 1000) >= thisMonthStart);
                break;
            case 'Last Month':
                filtered = transfers.filter(t => {
                    const receivedDate = new Date(t.receivedAt.seconds * 1000);
                    return receivedDate >= lastMonthStart && receivedDate <= lastMonthEnd;
                });
                break;
            case 'Till Now':
                filtered = transfers;
                break;
            default:
                break;
        }

        setFilteredTransfers(filtered);
    };

    filterTransfers();
  }, [timePeriod, transfers]);

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Past Successful Transfers</h3>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransfers.map(transfer => (
                      <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teamLeadProfiles[transfer.teamLeadId]?.subrole || transfer.teamLeadId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transfer.receivedAt.seconds * 1000).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <ul className="list-disc list-inside space-y-1">
                                  {transfer.items.map((item, index) => (
                                      <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                                  ))}
                              </ul>
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

export default PastTransfers;
