import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';

const BusinessInsights = ({ insights, kitchenInsights }) => {

  const salesVsForecastData = insights?.map(i => ({
    name: i.teamLead.name,
    forecast: i.dailyTargets.reduce((acc, dt) => acc + dt.items.reduce((a, item) => a + item.quantity, 0), 0),
    sales: i.salesData.stockSold,
  }));

  const topSellingItems = insights?.reduce((acc, i) => {
    i.dailyTargets.forEach(dt => {
      dt.items.forEach(item => {
        if (!acc[item.name]) {
          acc[item.name] = 0;
        }
        acc[item.name] += item.todayStockSold || 0;
      });
    });
    return acc;
  }, {});

  const topItemsData = topSellingItems ? Object.entries(topSellingItems)
    .sort(([,a],[,b]) => b-a)
    .slice(0, 5)
    .map(([name, sales]) => ({ name, sales })) : [];

  const salesTrendsData = insights?.reduce((acc, i) => {
    const date = new Date().toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, sales: 0 };
    }
    acc[date].sales += i.salesData.stockSold;
    return acc;
  }, {});

  const salesTrends = salesTrendsData ? Object.values(salesTrendsData) : [];

  const stockFlowData = insights?.map(i => ({
    name: i.teamLead.name,
    sold: i.salesData.stockSold,
    backed: i.salesData.stockBacked,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Business Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold mb-4">Sales vs. Forecast</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesVsForecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="forecast" fill="#8884d8" />
              <Bar dataKey="sales" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Top 5 Selling Items</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topItemsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sales"
                nameKey="name"
                label={(entry) => entry.name}
              >
                {topItemsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="md:col-span-2">
          <h4 className="text-lg font-semibold mb-4">Sales Trends (Today)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="md:col-span-2">
          <h4 className="text-lg font-semibold mb-4">Stock Flow Analysis</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stockFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sold" fill="#82ca9d" name="Stock Sold" />
              <Bar dataKey="backed" fill="#ffc658" name="Stock Backed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BusinessInsights;