

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToUsersCount, subscribeToRolesCount, subscribeToKitchensCount, subscribeToPendingForecastsAdmin, subscribeToActiveProcurements, subscribeToOngoingKitchenAssignments } from '../../services/adminService';
import { syncVendorsToSalesExecutives } from '../../services/profileService';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [counts, setCounts] = useState({ users: 0, roles: 0, kitchens: 0 });
  const [pendingForecasts, setPendingForecasts] = useState([]);
  const [activeProcurements, setActiveProcurements] = useState([]);
  const [ongoingAssignments, setOngoingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUsers, unsubscribeRoles, unsubscribeKitchens, unsubscribePendingForecasts, unsubscribeActiveProcurements, unsubscribeOngoingAssignments;

    const setupSubscriptions = () => {
      setLoading(true);
      try {
        unsubscribeUsers = subscribeToUsersCount(count => setCounts(prev => ({ ...prev, users: count })));
        unsubscribeRoles = subscribeToRolesCount(count => setCounts(prev => ({ ...prev, roles: count })));
        unsubscribeKitchens = subscribeToKitchensCount(count => setCounts(prev => ({ ...prev, kitchens: count })));
        unsubscribePendingForecasts = subscribeToPendingForecastsAdmin(setPendingForecasts);
        unsubscribeActiveProcurements = subscribeToActiveProcurements(setActiveProcurements);
        unsubscribeOngoingAssignments = subscribeToOngoingKitchenAssignments(assignments => {
          setOngoingAssignments(assignments);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        toast.error('Failed to load dashboard data.');
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeRoles) unsubscribeRoles();
      if (unsubscribeKitchens) unsubscribeKitchens();
      if (unsubscribePendingForecasts) unsubscribePendingForecasts();
      if (unsubscribeActiveProcurements) unsubscribeActiveProcurements();
      if (unsubscribeOngoingAssignments) unsubscribeOngoingAssignments();
    };
  }, []);

  const handleSyncVendors = async () => {
    try {
      await syncVendorsToSalesExecutives();
      toast.success('Vendor synchronization process initiated successfully!');
    } catch (error) {
      toast.error('Failed to start vendor synchronization.');
    }
  };

  const StatCard = ({ title, value }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105">
      <h2 className="text-lg font-bold text-gray-600">{title}</h2>
      <p className="text-3xl sm:text-4xl font-extrabold text-[#f56703]">{value}</p>
    </div>
  );

  const InfoListCard = ({ title, items, renderItem }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg col-span-1 md:col-span-1">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Users" value={counts.users} />
          <StatCard title="Total Roles" value={counts.roles} />
          <StatCard title="Total Kitchens" value={counts.kitchens} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoListCard 
            title="Pending Forecasts"
            items={pendingForecasts}
            renderItem={f => (
              <li key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-800">{f.zonalHeadName || 'N/A'}</span>
                <span className="text-sm text-gray-600">{new Date(f.createdAt.seconds * 1000).toLocaleDateString()}</span>
              </li>
            )}
          />
          <InfoListCard 
            title="Active Procurements"
            items={activeProcurements}
            renderItem={p => (
              <li key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Forecast ID: {p.forecastId}</span>
                <span className="text-sm text-gray-600">{p.status}</span>
              </li>
            )}
          />
          <InfoListCard 
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

        <div className="mt-12 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">Admin Actions</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/admin/create-profile" className="px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Create Profile</Link>
            <Link to="/organization-chart" className="px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">View Organization Chart</Link>
            <Link to="/admin/recipe-management" className="px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Recipe Management</Link>
            <Link to="/admin/kitchen-assignment" className="px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Kitchen Assignment</Link>
            <button onClick={handleSyncVendors} className="px-6 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transform hover:-translate-y-0.5 transition-all duration-300">Sync Vendors</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

