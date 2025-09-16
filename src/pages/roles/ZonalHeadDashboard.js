
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToZonalHeadForecasts } from '../../services/forecastService';
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
  const [salesExecutiveProfiles, setSalesExecutiveProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [expandedTeamLead, setExpandedTeamLead] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeForecasts, unsubscribeRecipes;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribeForecasts = subscribeToZonalHeadForecasts(user.id, async (fetchedForecasts) => {
          setForecasts(fetchedForecasts);
          const teamLeadIds = [...new Set(fetchedForecasts.map(f => f.teamLeadId))];
          if (teamLeadIds.length > 0) {
            const profiles = await getProfilesByIds(teamLeadIds);
            const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
            setTeamLeadProfiles(profilesMap);
          }

          const salesExecutiveIds = [...new Set(fetchedForecasts.map(f => f.salesExecutiveId))];
          if (salesExecutiveIds.length > 0) {
            const profiles = await getProfilesByIds(salesExecutiveIds);
            const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
            setSalesExecutiveProfiles(profilesMap);
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

  const forecastsByTeamLead = forecasts.reduce((acc, forecast) => {
    const teamLeadId = forecast.teamLeadId || 'Unassigned';
    if (!acc[teamLeadId]) {
      acc[teamLeadId] = {
        teamLeadId,
        teamLeadName: teamLeadProfiles[teamLeadId]?.name || 'Unassigned',
        forecasts: [],
        aggregatedItems: {},
      };
    }
    acc[teamLeadId].forecasts.push(forecast);
    forecast.items.forEach(item => {
      if (!acc[teamLeadId].aggregatedItems[item.name]) {
        acc[teamLeadId].aggregatedItems[item.name] = 0;
      }
      acc[teamLeadId].aggregatedItems[item.name] += item.quantity;
    });
    return acc;
  }, {});

  const toggleTeamLeadExpansion = (teamLeadId) => {
    if (expandedTeamLead === teamLeadId) {
      setExpandedTeamLead(null);
    } else {
      setExpandedTeamLead(teamLeadId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Zonal Head Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {error && <p className="text-white text-center bg-red-500 p-3 rounded-lg">{error}</p>}

        {!loading && !error && (
          <>
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Team Forecasts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aggregated Forecast</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(forecastsByTeamLead).map(teamLeadData => (
                      <React.Fragment key={teamLeadData.teamLeadId}>
                        <tr onClick={() => toggleTeamLeadExpansion(teamLeadData.teamLeadId)} className="cursor-pointer hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teamLeadData.teamLeadName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <ul className="list-disc list-inside space-y-1">
                              {Object.entries(teamLeadData.aggregatedItems).map(([itemName, quantity]) => (
                                <li key={itemName}>{quantity} x {itemName}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teamLeadData.forecasts[0]?.status}</td>
                        </tr>
                        {expandedTeamLead === teamLeadData.teamLeadId && (
                          <tr>
                            <td colSpan="3" className="p-4 bg-gray-100">
                              <h4 className="text-lg font-bold mb-2">Sales Executive Breakup</h4>
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Sales Executive</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Item</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Quantity</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamLeadData.forecasts.map(forecast => (
                                    <React.Fragment key={forecast.id}>
                                      {forecast.items.map((item, index) => (
                                        <tr key={`${forecast.id}-${item.recipeId}">
                                          {index === 0 && <td rowSpan={forecast.items.length} className="px-4 py-2 whitespace-nowrap">{salesExecutiveProfiles[forecast.salesExecutiveId]?.name}</td>}
                                          <td className="px-4 py-2 whitespace-nowrap">{item.name}</td>
                                          <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
                                      
            <ZonalHeadSalesData />
          </>
        )}
      </div>
    </div>
  );
};

export default ZonalHeadDashboard;
