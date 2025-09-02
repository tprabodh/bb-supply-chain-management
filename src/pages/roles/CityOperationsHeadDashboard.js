
import React, { useState, useEffect } from 'react';
import CityOperationsHeadSalesData from '../../components/CityOperationsHeadSalesData';
import KitchenManagerMetrics from '../../components/KitchenManagerMetrics';
import BusinessInsights from '../../components/BusinessInsights';
import { subscribeToPendingForecastsAdmin, subscribeToActiveProcurements, subscribeToOngoingKitchenAssignments } from '../../services/adminService';
import { getDailyInsights } from '../../services/cityOperationsHeadService';
import TotalDailyInsights from '../../components/TotalDailyInsights';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const CityOperationsHeadDashboard = () => {
  const { user } = useAuth();
  const [pendingForecasts, setPendingForecasts] = useState([]);
  const [activeProcurements, setActiveProcurements] = useState([]);
  const [ongoingAssignments, setOngoingAssignments] = useState([]);
  const [insights, setInsights] = useState(null);
  const [kitchenInsights, setKitchenInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribePendingForecasts, unsubscribeActiveProcurements, unsubscribeOngoingAssignments;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribePendingForecasts = subscribeToPendingForecastsAdmin(setPendingForecasts, (err) => {
          setError('Error subscribing to pending forecasts.');
          console.error('Error subscribing to pending forecasts:', err);
          toast.error('Error loading pending forecasts.');
        });

        unsubscribeActiveProcurements = subscribeToActiveProcurements(setActiveProcurements, (err) => {
          setError('Error subscribing to active procurements.');
          console.error('Error subscribing to active procurements:', err);
          toast.error('Error loading active procurements.');
        });

        unsubscribeOngoingAssignments = subscribeToOngoingKitchenAssignments((assignments) => {
          setOngoingAssignments(assignments);
        }, (err) => {
          setError('Error subscribing to ongoing kitchen assignments.');
          console.error('Error subscribing to ongoing kitchen assignments:', err);
          toast.error('Error loading ongoing kitchen assignments.');
        });

        if (user) {
          const { insights, kitchenInsights } = await getDailyInsights(user.id);
          setInsights(insights);
          setKitchenInsights(kitchenInsights);
        }

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        setError('Error setting up subscriptions.');
        toast.error('Error setting up subscriptions.');
      } finally {
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribePendingForecasts) unsubscribePendingForecasts();
      if (unsubscribeActiveProcurements) unsubscribeActiveProcurements();
      if (unsubscribeOngoingAssignments) unsubscribeOngoingAssignments();
    };
  }, [user]);

  const InfoCard = ({ title, items, renderItem }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map(item => renderItem(item))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4">No items to display.</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">City Operations Head Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {error && <p className="text-white text-center bg-red-500 p-3 rounded-lg">{error}</p>}

        {!loading && !error && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoCard 
                title="Pending Forecasts"
                items={pendingForecasts}
                renderItem={f => (
                  <li key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">{f.zonalHeadName || 'N/A'}</span>
                    <span className="text-sm text-gray-600">{new Date(f.createdAt.seconds * 1000).toLocaleDateString()}</span>
                  </li>
                )}
              />
              <InfoCard 
                title="Active Procurements"
                items={activeProcurements}
                renderItem={p => (
                  <li key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Forecast ID: {p.forecastId}</span>
                    <span className="text-sm text-gray-600">{p.status}</span>
                  </li>
                )}
              />
              <InfoCard 
                title="Ongoing Kitchen Assignments"
                items={ongoingAssignments}
                renderItem={a => (
                  <li key={a.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">{a.kitchenName || 'N/A'}</span>
                    <span className="text-sm text-gray-600">{a.status}</span>
                  </li>
                )}
              />
            </div>

            <TotalDailyInsights insights={insights} kitchenInsights={kitchenInsights} />
            <CityOperationsHeadSalesData />
            <KitchenManagerMetrics />
            <BusinessInsights />
          </div>
        )}
      </div>
    </div>
  );
};

export default CityOperationsHeadDashboard;
