
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('You have been logged out.');
  };

  const goToDashboard = () => {
    if (user) {
      navigate(`/${user.role.replace(/\s+/g, '')}/dashboard`);
    }
  };

  const goToInput = () => {
    if (user) {
      navigate(`/${user.role.replace(/\s+/g, '')}/input`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 text-center transform transition-all duration-300 hover:scale-105">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome, {user?.subrole || user?.role}!</h1>
        {user && (
          <div className="space-y-4">
            <p className="text-lg text-gray-700"><span className="font-semibold">Role:</span> {user.role}</p>
            <p className="text-lg text-gray-700"><span className="font-semibold">Subrole:</span> {user.subrole}</p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
              <button onClick={goToDashboard} className="w-full px-6 py-3 text-lg font-semibold text-white bg-[#f56703] border border-transparent rounded-lg shadow-md hover:bg-[#d95702] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5">
                Go to My Dashboard
              </button>
              <button onClick={goToInput} className="w-full px-6 py-3 text-lg font-semibold text-white bg-[#f56703] border border-transparent rounded-lg shadow-md hover:bg-[#d95702] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5">
                Go to My Input Page
              </button>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="w-full px-6 py-3 text-lg font-semibold text-white bg-red-600 border border-transparent rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5 mt-6">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

