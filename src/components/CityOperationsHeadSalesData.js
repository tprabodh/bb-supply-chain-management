
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToZonalHeadsByCityOperationsHead } from '../services/cityOperationsHeadService';
import { subscribeToTeamLeadsByZonalHead } from '../services/zonalHeadService';
import { subscribeToSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from '../services/salesService';
import Loader from './Loader';
import ZonalHeadSalesTable from './ZonalHeadSalesTable';
import { toast } from 'react-toastify';

const CityOperationsHeadSalesData = () => {
  const { user } = useAuth();
  const [zonalHeadData, setZonalHeadData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let zonalHeadsUnsubscribe;
    const teamLeadUnsubscribes = [];
    const salesExecutiveUnsubscribes = [];

    const setupSubscriptions = () => {
      setLoading(true);
      try {
        zonalHeadsUnsubscribe = subscribeToZonalHeadsByCityOperationsHead(user.id, (zonalHeads) => {
          const newZonalHeadData = [];
          teamLeadUnsubscribes.forEach(unsub => unsub());
          teamLeadUnsubscribes.length = 0;
          salesExecutiveUnsubscribes.forEach(unsub => unsub());
          salesExecutiveUnsubscribes.length = 0;

          if (zonalHeads.length === 0) {
            setZonalHeadData([]);
            setLoading(false);
            return;
          }

          zonalHeads.forEach(zh => {
            const teamLeadUnsubscribe = subscribeToTeamLeadsByZonalHead(zh.id, (teamLeads) => {
              const newTeamLeadData = [];
              salesExecutiveUnsubscribes.forEach(unsub => unsub());
              salesExecutiveUnsubscribes.length = 0;

              if (teamLeads.length === 0) {
                newZonalHeadData.push({ ...zh, teamLeadData: [] });
                setZonalHeadData([...newZonalHeadData]);
                setLoading(false);
                return;
              }

              teamLeads.forEach(tl => {
                const salesExecutiveUnsubscribe = subscribeToSalesExecutivesByTeamLead(tl.id, async (salesExecutives) => {
                  const salesDataPromises = salesExecutives.map(async (se) => {
                    const vendorUid = await getVendorUidByEmail(se.email);
                    if (vendorUid) {
                      const data = await getSalesDataByVendorUid(vendorUid);
                      return { ...se, salesData: data };
                    }
                    return { ...se, salesData: null };
                  });
                  const salesData = await Promise.all(salesDataPromises);
                  newTeamLeadData.push({ ...tl, salesData });
                  newZonalHeadData.push({ ...zh, teamLeadData: [...newTeamLeadData] });
                  setZonalHeadData([...newZonalHeadData]);
                  setLoading(false);
                }, (err) => {
                  toast.error('Error subscribing to sales executives.');
                  console.error('Error subscribing to sales executives:', err);
                  setLoading(false);
                });
                salesExecutiveUnsubscribes.push(salesExecutiveUnsubscribe);
              });
            }, (err) => {
              toast.error('Error subscribing to team leads.');
              console.error('Error subscribing to team leads:', err);
              setLoading(false);
            });
            teamLeadUnsubscribes.push(teamLeadUnsubscribe);
          });
        }, (err) => {
          toast.error('Error subscribing to zonal heads.');
          console.error('Error subscribing to zonal heads:', err);
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
      if (zonalHeadsUnsubscribe) zonalHeadsUnsubscribe();
      teamLeadUnsubscribes.forEach(unsub => unsub());
      salesExecutiveUnsubscribes.forEach(unsub => unsub());
    };
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
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Zonal Head Sales Data</h3>
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
          {zonalHeadData.map(zonalHead => (
            <ZonalHeadSalesTable key={zonalHead.id} zonalHead={zonalHead} timePeriod={timePeriod} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CityOperationsHeadSalesData;
