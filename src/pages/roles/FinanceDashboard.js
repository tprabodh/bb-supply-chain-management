
import React, { useState, useEffect } from 'react';
import { subscribeToPendingForecasts, updateForecastStatus } from '../../services/forecastService';
import { getProfilesByIds } from '../../services/profileService';
import ForecastDetailsModal from '../../components/ForecastDetailsModal';
import Loader from '../../components/Loader';
import { formatDate } from '../../utils/dateUtils';
import FinanceForecastVsSales from '../../components/FinanceForecastVsSales';
import { toast } from 'react-toastify';

const FinanceDashboard = () => {
  const [forecasts, setForecasts] = useState([]);
  const [zonalHeadProfiles, setZonalHeadProfiles] = useState({});
  const [teamLeadProfiles, setTeamLeadProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPendingForecasts(async (fetchedForecasts) => {
      setForecasts(fetchedForecasts);

      const zonalHeadIds = [...new Set(fetchedForecasts.map(f => f.zonalHeadId))];
      if (zonalHeadIds.length > 0) {
        const profiles = await getProfilesByIds(zonalHeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setZonalHeadProfiles(profilesMap);
      }

      const teamLeadIds = [...new Set(fetchedForecasts.map(f => f.teamLeadId))];
      if (teamLeadIds.length > 0) {
        const profiles = await getProfilesByIds(teamLeadIds);
        const profilesMap = profiles.reduce((map, profile) => ({ ...map, [profile.id]: profile }), {});
        setTeamLeadProfiles(profilesMap);
      }
      setLoading(false);
    }, (err) => {
      setError('Error subscribing to pending forecasts.');
      toast.error('Error loading pending forecasts.');
      console.error('Error subscribing to pending forecasts:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleReviewClick = (forecast) => {
    setSelectedForecast(forecast);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedForecast(null);
  };

  const handleApproval = async (forecastId, newStatus, modifiedItems) => {
    try {
        await updateForecastStatus(forecastId, newStatus, modifiedItems);
        toast.success(`Forecast ${newStatus.toLowerCase()} successfully!`);
        handleCloseModal();
    } catch (error) {
        console.error('Error updating forecast:', error);
        toast.error('Error updating forecast. Please try again.');
    }
  };

  const forecastsByWeek = forecasts.reduce((acc, forecast) => {
    const week = forecast.forecastWeek || 'Uncategorized';
    if (!acc[week]) acc[week] = [];
    acc[week].push(forecast);
    return acc;
  }, {});

  const getWeekRange = (startDate) => {
    const [day, month, year] = startDate.split('-');
    const start = new Date(year, month - 1, day);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Pending Forecasts for Review</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {error && <p className="text-white text-center bg-red-500 p-3 rounded-lg">{error}</p>}

        {!loading && !error && (
          <div className="space-y-8">
            {Object.entries(forecastsByWeek).map(([week, forecastsInWeek]) => (
                <div key={week} className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Forecast for {getWeekRange(week)}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zonal Head</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted On</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {forecastsInWeek.map(forecast => (
                                    <tr key={forecast.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{zonalHeadProfiles[forecast.zonalHeadId]?.subrole || forecast.zonalHeadId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teamLeadProfiles[forecast.teamLeadId]?.subrole}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(forecast.createdAt.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleReviewClick(forecast)} className="px-4 py-2 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Review</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
            <FinanceForecastVsSales />
          </div>
        )}
      </div>

      {isModalOpen && (
        <ForecastDetailsModal 
            forecast={selectedForecast}
            onClose={handleCloseModal}
            onApprove={handleApproval}
            zonalHeadProfile={zonalHeadProfiles[selectedForecast.zonalHeadId]}
        />
      )}
    </div>
  );
};

export default FinanceDashboard;
