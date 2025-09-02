import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSalesDataForEmployee } from '../../services/hrService';
import { subscribeToProfiles, getSubordinates } from '../../services/profileService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const HrDashboard = () => {
  const { user } = useAuth();
  const [subordinates, setSubordinates] = useState([]);
  const [filteredSubordinates, setFilteredSubordinates] = useState([]);
  const [selectedSubrole, setSelectedSubrole] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToProfiles((allProfiles) => {
      const subs = getSubordinates(user.reportsTo, allProfiles);
      setSubordinates(subs);
      const filtered = subs.filter(s => ['Zonal Head', 'Team Lead', 'Sales Executive'].includes(s.role));
      setFilteredSubordinates(filtered);
      setLoading(false);
    }, (err) => {
      toast.error('Error loading subordinates.');
      console.error('Error subscribing to profiles:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!selectedSubrole) return;
      setLoading(true);
      try {
        const selectedEmployee = subordinates.find(s => s.subrole === selectedSubrole);
        if (selectedEmployee) {
            const data = await getSalesDataForEmployee(selectedEmployee);
            setSalesData(data);
        }
      } catch (error) {
        toast.error('Error fetching sales data.');
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [selectedSubrole, subordinates]);

  const processSalesData = (data, period) => {
    const itemData = {};

    if (data) {
      for (const dateStr in data) {
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
          const dailySales = data[dateStr];
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

  const processedData = processSalesData(salesData, timePeriod);

  const totals = processedData.reduce((acc, item) => ({
    sold: acc.sold + item.sold,
    remaining: acc.remaining + item.remaining,
    shifted: acc.shifted + item.shifted,
  }), { sold: 0, remaining: 0, shifted: 0 });

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">HR Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg space-y-8">
            <div>
                <label htmlFor="subrole" className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                <select id="subrole" name="subrole" value={selectedSubrole} onChange={(e) => setSelectedSubrole(e.target.value)} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out appearance-none bg-white pr-8">
                  <option value="">Select an employee</option>
                  {filteredSubordinates.map((subordinate) => (
                    <option key={subordinate.id} value={subordinate.subrole}>
                      {subordinate.subrole}
                    </option>
                  ))}
                </select>
            </div>

            {selectedSubrole && salesData && (
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Sales Data for {selectedSubrole}</h3>
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <TimePeriodButton period="Today" />
                        <TimePeriodButton period="This Week" />
                        <TimePeriodButton period="Last Week" />
                        <TimePeriodButton period="This Month" />
                        <TimePeriodButton period="Last Month" />
                        <TimePeriodButton period="Till Now" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
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
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HrDashboard;
