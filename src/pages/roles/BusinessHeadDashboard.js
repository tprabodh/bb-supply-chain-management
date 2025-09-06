
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBusinessHeadDashboardData } from '../../services/businessHeadService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import TotalDailyInsights from '../../components/TotalDailyInsights';
import BusinessHeadSalesData from '../../components/BusinessHeadSalesData';

const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-xl font-bold text-gray-800 flex justify-between items-center"
      >
        <span>{title}</span>
        <svg
          className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {isOpen && <div className="mt-6">{children}</div>}
    </div>
  );
};

const BusinessHeadDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Fetching data for Business Head:', user.id);
        const data = await getBusinessHeadDashboardData(user.id);
        console.log('Dashboard data:', data);
        setDashboardData(data);
      } catch (err) {
        setError('Failed to fetch dashboard data.');
        toast.error('Failed to fetch dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Business Head Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {error && <p className="text-white text-center bg-red-500 p-3 rounded-lg">{error}</p>}

        {!loading && !error && (
          <div>
            {dashboardData.map(data => (
              <CollapsibleSection key={data.cityOperationsHead.id} title={`City Operations Head: ${data.cityOperationsHead.name}`}>
                <TotalDailyInsights insights={data.insights} kitchenInsights={data.kitchenInsights} />
                <BusinessHeadSalesData cityOperationsHeadId={data.cityOperationsHead.id} />
              </CollapsibleSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessHeadDashboard;
