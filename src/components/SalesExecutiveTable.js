
import React, { useState } from 'react';

const SalesExecutiveTable = ({ executive, timePeriod }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const processSalesData = (salesData, period) => {
    const itemData = {};

    if (salesData) {
      for (const dateStr in salesData) {
        const date = new Date(dateStr);
        if (isNaN(date)) continue;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastWeekStart = new Date(new Date().setDate(thisWeekStart.getDate() - 7));
        const lastWeekEnd = new Date(new Date().setDate(thisWeekStart.getDate() - 1));
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        let shouldInclude = false;
        switch (period) {
          case 'Today':
            shouldInclude = date.toDateString() === now.toDateString();
            break;
          case 'This Week':
            shouldInclude = date >= thisWeekStart;
            break;
          case 'Last Week':
            shouldInclude = date >= lastWeekStart && date <= lastWeekEnd;
            break;
          case 'This Month':
            shouldInclude = date >= thisMonthStart;
            break;
          case 'Last Month':
            shouldInclude = date >= lastMonthStart && date <= lastMonthEnd;
            break;
          case 'Till Now':
            shouldInclude = true;
            break;
          default:
            break;
        }

        if (shouldInclude) {
          const dailySales = salesData[dateStr];
          if (Array.isArray(dailySales)) {
            dailySales.forEach(item => {
              if (!itemData[item.name]) {
                itemData[item.name] = { sold: 0, remaining: 0, shifted: 0 };
              }
              itemData[item.name].sold += item.todayStockSold || 0;
              itemData[item.name].remaining += item.stock || 0;
              itemData[item.name].shifted += item.stockShiftedToday || 0;
            });
          }
        }
      }
    }

    return Object.entries(itemData).map(([name, data]) => ({ name, ...data }));
  };

  const processedData = processSalesData(executive.salesData, timePeriod);

  const totals = processedData.reduce((acc, item) => ({
    sold: acc.sold + item.sold,
    remaining: acc.remaining + item.remaining,
    shifted: acc.shifted + item.shifted,
  }), { sold: 0, remaining: 0, shifted: 0 });

  return (
    <div className="bg-gray-50 rounded-lg shadow-inner p-4">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-4 py-3 text-left font-semibold text-lg text-[#f56703] hover:text-[#d95702] focus:outline-none transition-colors duration-300">
        {executive.name}
        <span className={`float-right transform transition-transform duration-300 ${isExpanded ? '-rotate-180' : ''}`}>▼</span>
      </button>
      {isExpanded && (
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shifted</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {processedData.map(item => (
                      <tr key={item.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sold}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remaining}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.shifted}</td>
                      </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-100">
                  <tr>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">{totals.sold}</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">{totals.remaining}</th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">{totals.shifted}</th>
                  </tr>
              </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesExecutiveTable;
