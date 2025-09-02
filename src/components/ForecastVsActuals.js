
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToForecastsByZonalHead } from '../services/forecastService';
import { fetchSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from '../services/salesService';
import Loader from './Loader';
import { getProfilesByIds } from '../services/profileService';
import { toast } from 'react-toastify';

const ForecastVsActuals = () => {
  const { user } = useAuth();
  const [analysisData, setAnalysisData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let forecastsUnsubscribe;

    const setupSubscriptions = () => {
      setLoading(true);
      try {
        forecastsUnsubscribe = subscribeToForecastsByZonalHead(user.id, async (forecasts) => {
          const teamLeadIds = [...new Set(forecasts.map(f => f.teamLeadId))];
          const teamLeadProfiles = await getProfilesByIds(teamLeadIds);
          const teamLeadProfilesMap = teamLeadProfiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});

          const analysisDataPromises = forecasts.map(async (forecast) => {
            const salesExecutives = await fetchSalesExecutivesByTeamLead(forecast.teamLeadId);
            const salesDataPromises = salesExecutives.map(async (se) => {
                const vendorUid = await getVendorUidByEmail(se.email);
                if (vendorUid) return await getSalesDataByVendorUid(vendorUid);
                return null;
            });
            const allSalesData = await Promise.all(salesDataPromises);
            const salesData = allSalesData.reduce((acc, data) => ({ ...acc, ...data }), {});

            return forecast.items.map(item => {
                let actualSales = 0;
                if (salesData) {
                    for (const dateStr in salesData) {
                        const date = new Date(dateStr);
                        const [day, month, year] = forecast.forecastWeek.split('-');
                        const forecastStartDate = new Date(year, month - 1, day);
                        const forecastEndDate = new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth(), forecastStartDate.getDate() + 6);

                        if (date >= forecastStartDate && date <= forecastEndDate) {
                            const dailySales = salesData[dateStr];
                            if (Array.isArray(dailySales)) {
                                const soldItem = dailySales.find(d => d.name === item.name);
                                if (soldItem) actualSales += soldItem.todayStockSold || 0;
                            }
                        }
                    }
                }

                return {
                    teamLeadId: forecast.teamLeadId,
                    teamLeadSubrole: teamLeadProfilesMap[forecast.teamLeadId]?.subrole,
                    itemName: item.name,
                    forecast: item.quantity,
                    actualSales,
                    difference: item.quantity - actualSales,
                };
            });
          });

          const allAnalysisData = await Promise.all(analysisDataPromises);
          setAnalysisData(allAnalysisData.flat());
          setLoading(false);
        }, (err) => {
          toast.error('Error loading forecast analysis data.');
          console.error('Error subscribing to forecasts:', err);
          setLoading(false);
        });
      } catch (error) {
        toast.error('Error setting up subscriptions for forecast analysis.');
        console.error('Error setting up subscriptions:', error);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (forecastsUnsubscribe) forecastsUnsubscribe();
    };
  }, [user]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Forecast vs. Actual Sales Analysis</h3>
      {loading && <div className="flex justify-center items-center h-32"><Loader /></div>}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Forecast</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {analysisData.map((data, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.teamLeadSubrole}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.itemName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.forecast}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.actualSales}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${data.difference > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.difference}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ForecastVsActuals;
