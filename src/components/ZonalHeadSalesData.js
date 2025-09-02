
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToTeamLeadsByZonalHead } from '../services/zonalHeadService';
import { subscribeToSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from '../services/salesService';
import Loader from './Loader';
import TeamLeadSalesTable from './TeamLeadSalesTable';
import { toast } from 'react-toastify';

const ZonalHeadSalesData = () => {
  const { user } = useAuth();
  const [teamLeadData, setTeamLeadData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('Till Now');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribeTeamLeads = subscribeToTeamLeadsByZonalHead(user.id, async (teamLeads) => {
      try {
        const teamLeadDataPromises = teamLeads.map(async (tl) => {
          const salesExecutives = await new Promise(resolve => {
            const unsubscribeSalesExecutives = subscribeToSalesExecutivesByTeamLead(tl.id, async (ses) => {
              const salesDataPromises = ses.map(async (se) => {
                const vendorUid = await getVendorUidByEmail(se.email);
                if (vendorUid) {
                  const data = await getSalesDataByVendorUid(vendorUid);
                  return { ...se, salesData: data };
                }
                return { ...se, salesData: null };
              });
              const salesData = await Promise.all(salesDataPromises);
              resolve(salesData);
              unsubscribeSalesExecutives();
            });
          });
          return { ...tl, salesData: salesExecutives };
        });
        const allTeamLeadData = await Promise.all(teamLeadDataPromises);
        setTeamLeadData(allTeamLeadData);
      } catch (err) {
        toast.error('Error fetching team lead data.');
        console.error('Error fetching team lead data:', err);
      } finally {
        setLoading(false);
      }
    }, (err) => {
      toast.error('Error subscribing to team leads.');
      console.error('Error subscribing to team leads:', err);
      setLoading(false);
    });

    return () => unsubscribeTeamLeads();
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
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Team Lead Sales Data</h3>
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
          {teamLeadData.map(teamLead => (
            <TeamLeadSalesTable key={teamLead.id} teamLead={teamLead} timePeriod={timePeriod} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ZonalHeadSalesData;
