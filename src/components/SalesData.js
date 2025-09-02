
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from '../services/salesService';
import Loader from './Loader';
import SalesExecutiveTable from './SalesExecutiveTable';
import { toast } from 'react-toastify';

const SalesData = () => {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToSalesExecutivesByTeamLead(user.id, async (salesExecutives) => {
      try {
        const salesDataPromises = salesExecutives.map(async (se) => {
          const vendorUid = await getVendorUidByEmail(se.email);
          if (vendorUid) {
            const data = await getSalesDataByVendorUid(vendorUid);
            return { ...se, salesData: data };
          }
          return { ...se, salesData: null };
        });
        const allSalesData = await Promise.all(salesDataPromises);
        setSalesData(allSalesData);
      } catch (err) {
        toast.error('Error fetching sales data.');
        console.error('Error fetching sales data:', err);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      toast.error('Error subscribing to sales executives.');
      console.error('Error subscribing to sales executives:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const TimePeriodButton = ({ period }) => (
    <button 
      onClick={() => setTimePeriod(period)}
      className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 ${timePeriod === period ? 'bg-[#f56703] text-white transform -translate-y-0.5' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
      {period}
    </button>
  );

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Sales Executive Data</h3>
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
        <div className="space-y-6">
          {salesData.map(executive => (
            <SalesExecutiveTable key={executive.id} executive={executive} timePeriod={timePeriod} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SalesData;
