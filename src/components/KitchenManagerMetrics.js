
import React, { useState, useEffect } from 'react';
import { subscribeToCompletedAssignments } from '../services/kitchenService';
import { subscribeToProfilesByRole } from '../services/profileService';
import Loader from './Loader';
import { toast } from 'react-toastify';

const KitchenManagerMetrics = () => {
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [kitchenManagers, setKitchenManagers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    let unsubscribeAssignments, unsubscribeKitchenManagers;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribeAssignments = subscribeToCompletedAssignments(setAssignments, (err) => {
          toast.error('Error loading completed assignments.');
          console.error('Error subscribing to completed assignments:', err);
          setLoading(false);
        });

        unsubscribeKitchenManagers = subscribeToProfilesByRole('Kitchen Manager', (profiles) => {
          const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
          setKitchenManagers(profilesMap);
          setLoading(false);
        }, (err) => {
          toast.error('Error loading kitchen manager profiles.');
          console.error('Error subscribing to kitchen manager profiles:', err);
          setLoading(false);
        });

      } catch (error) {
        toast.error('Error setting up subscriptions.');
        console.error('Error setting up subscriptions:', error);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeAssignments) unsubscribeAssignments();
      if (unsubscribeKitchenManagers) unsubscribeKitchenManagers();
    };
  }, []);

  useEffect(() => {
    const filterAssignments = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(new Date().setDate(today.getDate() - 1));
        const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastWeekStart = new Date(new Date().setDate(thisWeekStart.getDate() - 7));
        const lastWeekEnd = new Date(new Date().setDate(thisWeekStart.getDate() - 1));
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        let filtered = [];

        switch (timePeriod) {
            case 'Today':
                filtered = assignments.filter(a => a.completedAt && new Date(a.completedAt.seconds * 1000).toDateString() === now.toDateString());
                break;
            case 'Yesterday':
                filtered = assignments.filter(a => a.completedAt && new Date(a.completedAt.seconds * 1000).toDateString() === yesterday.toDateString());
                break;
            case 'This Week':
                filtered = assignments.filter(a => a.completedAt && new Date(a.completedAt.seconds * 1000) >= thisWeekStart);
                break;
            case 'Last Week':
                filtered = assignments.filter(a => {
                    const completedDate = a.completedAt && new Date(a.completedAt.seconds * 1000);
                    return completedDate && completedDate >= lastWeekStart && completedDate <= lastWeekEnd;
                });
                break;
            case 'This Month':
                filtered = assignments.filter(a => a.completedAt && new Date(a.completedAt.seconds * 1000) >= thisMonthStart);
                break;
            case 'Last Month':
                filtered = assignments.filter(a => {
                    const completedDate = a.completedAt && new Date(a.completedAt.seconds * 1000);
                    return completedDate && completedDate >= lastMonthStart && completedDate <= lastMonthEnd;
                });
                break;
            case 'Till Now':
                filtered = assignments;
                break;
            default:
                break;
        }

        setFilteredAssignments(filtered);
    };

    filterAssignments();
  }, [timePeriod, assignments]);

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Kitchen Manager Metrics</h3>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <TimePeriodButton period="Today" />
        <TimePeriodButton period="Yesterday" />
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kitchen Manager</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cooked Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed On</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssignments.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kitchenManagers[assignment.kitchenManagerId]?.name || assignment.kitchenManagerId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <ul className="list-disc list-inside space-y-1">
                                  {assignment.items.map((item, index) => (
                                      <li key={index}>{item.quantity} {item.unit} of {item.name}</li>
                                  ))}
                              </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <ul className="list-disc list-inside space-y-1">
                                  {assignment.items.map((item, index) => (
                                      <li key={index}>{item.cookedQuantity || item.quantity} {item.unit} of {item.name}</li>
                                  ))}
                              </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.completedAt ? new Date(assignment.completedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KitchenManagerMetrics;
