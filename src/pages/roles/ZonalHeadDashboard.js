
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToForecastsByZonalHead } from '../../services/forecastService';
import { getProfilesByIds } from '../../services/profileService';
import { subscribeToRecipes } from '../../services/recipeService';
import Loader from '../../components/Loader';
import ZonalHeadSalesData from '../../components/ZonalHeadSalesData';
import { formatDate } from '../../utils/dateUtils';
import DailyTargetInput from '../../components/DailyTargetInput';
import ForecastVsActuals from '../../components/ForecastVsActuals';
import { toast } from 'react-toastify';

const ZonalHeadDashboard = () => {
  const { user } = useAuth();
  const [forecasts, setForecasts] = useState([]);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeForecasts, unsubscribeRecipes;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribeForecasts = subscribeToForecastsByZonalHead(user.id, async (fetchedForecasts) => {
          setForecasts(fetchedForecasts);
          const teamLeadIds = [...new Set(fetchedForecasts.map(f => f.teamLeadId))];
          if (teamLeadIds.length > 0) {
            const profiles = await getProfilesByIds(teamLeadIds);
            const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
            setTeamLeadProfiles(profilesMap);
          }
          setLoading(false);
        }, (err) => {
          setError('Error subscribing to forecasts.');
          toast.error('Failed to load forecasts.');
          console.error('Error subscribing to forecasts:', err);
          setLoading(false);
        });

        unsubscribeRecipes = subscribeToRecipes(setRecipes, (err) => {
          setError('Error subscribing to recipes.');
          toast.error('Failed to load recipes.');
          console.error('Error subscribing to recipes:', err);
        });

      } catch (err) {
        setError('Error setting up subscriptions.');
        toast.error('Failed to set up data subscriptions.');
        console.error('Error setting up subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeForecasts) unsubscribeForecasts();
      if (unsubscribeRecipes) unsubscribeRecipes();
    };
  }, [user]);

  const forecastsByWeek = forecasts.reduce((acc, forecast) => {
    const week = forecast.forecastWeek || 'Uncategorized';
    if (!acc[week]) acc[week] = [];
    acc[week].push(forecast);
    return acc;
  }, {});

  const getWeekRange = (startDate) => {
    const [day, month, year] = startDate.split('-');
    const start = new Date(year, month - 1, day);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  const today = new Date();
  const currentWeek = Object.keys(forecastsByWeek).find(week => {
      const [day, month, year] = week.split('-');
      const start = new Date(year, month - 1, day);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      end.setHours(23, 59, 59, 999); // Set to the end of the day
      return today >= start && today <= end;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Zonal Head Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {error && <p className="text-white text-center bg-red-500 p-3 rounded-lg">{error}</p>}

        {!loading && !error && (
          <>
            {currentWeek && (
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Set Daily Targets for {getWeekRange(currentWeek)}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {forecastsByWeek[currentWeek].map(forecast => {
                            const teamLead = teamLeadProfiles[forecast.teamLeadId];
                            if (!teamLead) return null;
                            return (
                                <DailyTargetInput 
                                    key={forecast.teamLeadId} 
                                    teamLead={teamLead} 
                                    weeklyForecast={forecast} 
                                    recipes={recipes}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            <ForecastVsActuals />

            {Object.entries(forecastsByWeek).map(([week, forecastsInWeek]) => (
                <div key={week} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Forecast for {getWeekRange(week)}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted On</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {forecastsInWeek.map(forecast => (
                                    <tr key={forecast.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teamLeadProfiles[forecast.teamLeadId]?.subrole || forecast.teamLeadId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(new Date(forecast.createdAt.seconds * 1000))}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <ul className="list-disc list-inside space-y-1">
                                                {forecast.items.map((item, index) => (
                                                    <li key={index}>{item.quantity} x {item.name}</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${forecast.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : forecast.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {forecast.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
            <ZonalHeadSalesData />
          </>
        )}
      </div>
    </div>
  );
};

export default ZonalHeadDashboard;
