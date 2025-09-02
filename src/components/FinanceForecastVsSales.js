
import React, { useState, useEffect } from 'react';
import { subscribeToApprovedForecasts } from '../services/forecastService';
import { getSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from '../services/salesService';
import { fetchProfilesByRole, getProfilesByIds } from '../services/profileService';
import Loader from './Loader';
import { formatDate } from '../utils/dateUtils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { toast } from 'react-toastify';

const FinanceForecastVsSales = () => {
  const [analysisData, setAnalysisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [varianceData, setVarianceData] = useState([]);
  const [salesTrends, setSalesTrends] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToApprovedForecasts(async (forecasts) => {
      setLoading(true);
      try {
        const allSalesExecutives = await fetchProfilesByRole('Sales Executive');

        const teamLeadIds = [...new Set(forecasts.map(f => f.teamLeadId))];
        let profilesMap = {};
        if (teamLeadIds.length > 0) {
          const profiles = await getProfilesByIds(teamLeadIds);
          profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
          setTeamLeadProfiles(profilesMap);
        }

        let totalForecast = 0;
        let totalActualSales = 0;
        const varianceMap = {};
        const trends = {};

        const itemAnalysisPromises = forecasts.map(async (forecast) => {
            const salesExecutivesUnderTeamLead = allSalesExecutives.filter(se => se.reportsTo === forecast.teamLeadId);
            
            const salesDataPromises = salesExecutivesUnderTeamLead.map(async (se) => {
                const vendorUid = await getVendorUidByEmail(se.email);
                if (vendorUid) return await getSalesDataByVendorUid(vendorUid);
                return null;
            });
            const allSalesDataForTeamLead = await Promise.all(salesDataPromises);
            const salesDataForTeamLead = allSalesDataForTeamLead.reduce((acc, data) => ({ ...acc, ...data }), {});

            for (const dateStr in salesDataForTeamLead) {
                const dailySales = salesDataForTeamLead[dateStr];
                if (Array.isArray(dailySales)) {
                    dailySales.forEach(item => {
                        const date = new Date(dateStr).toLocaleDateString();
                        if (!trends[date]) trends[date] = 0;
                        trends[date] += item.todayStockSold || 0;
                    });
                }
            }

            return forecast.items.map(item => {
                let actualSales = 0;
                if (salesDataForTeamLead) {
                    for (const dateStr in salesDataForTeamLead) {
                        const date = new Date(dateStr);
                        const [day, month, year] = forecast.forecastWeek.split('-');
                        const forecastStartDate = new Date(year, month - 1, day);
                        const forecastEndDate = new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth(), forecastStartDate.getDate() + 6);

                        if (date >= forecastStartDate && date <= forecastEndDate) {
                            const dailySales = salesDataForTeamLead[dateStr];
                            if (Array.isArray(dailySales)) {
                                const soldItem = dailySales.find(d => d.name === item.name);
                                if (soldItem) actualSales += soldItem.todayStockSold || 0;
                            }
                        }
                    }
                }

                totalForecast += item.quantity;
                totalActualSales += actualSales;

                const variance = item.quantity - actualSales;
                if (!varianceMap[item.name]) {
                    varianceMap[item.name] = { name: item.name, variance: 0, revenueImpact: 0 };
                }
                varianceMap[item.name].variance += variance;
                varianceMap[item.name].revenueImpact += variance * 50; // Placeholder

                return {
                    teamLeadId: forecast.teamLeadId,
                    teamLeadSubrole: profilesMap[forecast.teamLeadId]?.subrole,
                    forecastWeek: forecast.forecastWeek,
                    itemName: item.name,
                    forecast: item.quantity,
                    actualSales,
                    difference: variance,
                };
            });
        });

        const allAnalysisData = await Promise.all(itemAnalysisPromises);
        setAnalysisData(allAnalysisData.flat());

        setOverallAccuracy(totalForecast > 0 ? (totalActualSales / totalForecast * 100) : 0);
        setVarianceData(Object.values(varianceMap).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)));

        const formattedSalesTrends = Object.entries(trends)
            .map(([date, sales]) => ({ date, sales }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        setSalesTrends(formattedSalesTrends);

      } catch (error) {
        toast.error('Error fetching forecast vs. sales data.');
        console.error('Error fetching forecast vs. sales data:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const getWeekRange = (startDate) => {
    const [day, month, year] = startDate.split('-');
    const start = new Date(year, month - 1, day);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  const accuracyData = [
    { name: 'Accurate', value: overallAccuracy },
    { name: 'Inaccurate', value: 100 - overallAccuracy },
  ];

  const COLORS = ['#00C49F', '#FF8042'];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Forecast vs. Sales Analysis (All Team Leads)</h3>
      {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Overall Forecast Accuracy</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={accuracyData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#f56703"
                            dataKey="value"
                            nameKey="name"
                            label={(entry) => `${entry.name}: ${entry.value.toFixed(2)}%`}
                        >
                            {accuracyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Top Variance Items</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={varianceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="variance" fill="#f56703" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
          <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Sales Trends</h4>
              <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#f56703" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
              </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forecast Week</th>
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getWeekRange(data.forecastWeek)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.itemName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.forecast}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.actualSales}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${data.difference > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.difference}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceForecastVsSales;
