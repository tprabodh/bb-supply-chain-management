
import React, { useState, useEffect } from 'react';
import { subscribeToCompletedAssignments } from '../services/kitchenService';
import { getForecastById } from '../services/forecastService';
import { getProfilesByIds } from '../services/profileService';
import Loader from './Loader';
import { formatDate } from '../utils/dateUtils';
import { toast } from 'react-toastify';

const CookedFood = () => {
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCompletedAssignments(async (completedAssignments) => {
      try {
        const assignmentsWithForecastData = await Promise.all(completedAssignments.map(async (assignment) => {
            let forecast = null;
            if (assignment.forecastId) {
                forecast = await getForecastById(assignment.forecastId);
            }
            return { ...assignment, forecastWeek: forecast?.forecastWeek, teamLeadId: forecast?.teamLeadId };
        }));
        setAssignments(assignmentsWithForecastData);
        setFilteredAssignments(assignmentsWithForecastData);

        const teamLeadIds = [...new Set(assignmentsWithForecastData.map(a => a.teamLeadId).filter(id => id))];
        if (teamLeadIds.length > 0) {
          const profiles = await getProfilesByIds(teamLeadIds);
          const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
          setTeamLeadProfiles(profilesMap);
        }

      } catch (error) {
        toast.error('Error loading cooked food history.');
        console.error('Error fetching cooked food data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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

  const getWeekRange = (startDate) => {
    const [day, month, year] = startDate.split('-');
    const start = new Date(year, month - 1, day);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Cooked Food History</h3>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed On</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAssignments.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.forecastId && assignment.forecastWeek ? `${teamLeadProfiles[assignment.teamLeadId]?.subrole} (${getWeekRange(assignment.forecastWeek)})` : 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.completedAt ? new Date(assignment.completedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <ul className="list-disc list-inside space-y-1">
                                  {assignment.items.map((item, index) => (
                                      <li key={index}>{item.cookedQuantity || item.quantity} {item.unit} of {item.name}</li>
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

export default CookedFood;

