
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToRecipes } from '../../services/recipeService';
import { subscribeToProfiles } from '../../services/profileService';
import { createBulkForecasts, subscribeToForecastsByZonalHead } from '../../services/forecastService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

import { formatDate } from '../../utils/dateUtils';

const ZonalHeadInput = () => {
  const { user } = useAuth();
  const [teamLeads, setTeamLeads] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [forecasts, setForecasts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [existingForecasts, setExistingForecasts] = useState([]);

  const getNextWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { start: monday, end: sunday };
  };

  const { start: forecastWeekStart, end: forecastWeekEnd } = getNextWeekRange();
  const forecastWeek = formatDate(forecastWeekStart);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeProfiles;
    let unsubscribeRecipes;
    let unsubscribeForecasts;

    const setupSubscriptions = async () => {
      setLoading(true);
      try {
        unsubscribeProfiles = subscribeToProfiles((allProfiles) => {
          const subordinateTeamLeads = allProfiles.filter(p => p.reportsTo === user.id);
          setTeamLeads(subordinateTeamLeads);
          // setLoading(false); // Don't set loading to false yet, wait for all subscriptions
        }, (err) => {
          console.error('Error subscribing to profiles:', err);
          setError('Error fetching profiles.');
          setLoading(false);
        });

        unsubscribeRecipes = subscribeToRecipes((fetchedRecipes) => {
          setRecipes(fetchedRecipes);
          // setLoading(false); // Don't set loading to false yet, wait for all subscriptions
        }, (err) => {
          console.error('Error subscribing to recipes:', err);
          setError('Error fetching recipes.');
          setLoading(false);
        });

        unsubscribeForecasts = subscribeToForecastsByZonalHead(user.id, (zonalHeadForecasts) => {
          setExistingForecasts(zonalHeadForecasts);
          setLoading(false); // Set loading to false after all data is loaded
        }, (err) => {
          console.error('Error subscribing to forecasts:', err);
          setError('Error fetching forecasts.');
          setLoading(false);
        });

      } catch (err) {
        setError('Error setting up subscriptions.');
        console.error('Error setting up subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeProfiles) unsubscribeProfiles();
      if (unsubscribeRecipes) unsubscribeRecipes();
      if (unsubscribeForecasts) unsubscribeForecasts();
    };
  }, [user]);

  const handleForecastChange = (teamLeadId, recipeId, quantity) => {
    setForecasts(prev => ({
        ...prev,
        [teamLeadId]: {
            ...prev[teamLeadId],
            [recipeId]: quantity
        }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const forecastsToCreate = [];
        for (const teamLeadId in forecasts) {
            const items = [];
            for (const recipeId in forecasts[teamLeadId]) {
                items.push({
                    recipeId,
                    quantity: forecasts[teamLeadId][recipeId],
                    name: recipes.find(r => r.id === recipeId)?.name || ''
                });
            }
            forecastsToCreate.push({
                zonalHeadId: user.id,
                teamLeadId,
                items,
                forecastWeek,
            });
        }

      await createBulkForecasts(forecastsToCreate);
      setForecasts({});
      toast.success('Forecasts submitted successfully!');
    } catch (error) {
      setError(error.message || 'Error submitting forecasts. Please try again.');
      toast.error(error.message || 'Error submitting forecasts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isForecastSubmitted = existingForecasts.some(f => f.forecastWeek === forecastWeek);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-2 md:p-4">
      <div className="w-full max-w-4xl p-4 md:p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Create Sales Forecast</h2>
        <p className="text-center text-gray-500">This forecast is for the week starting on {forecastWeek}.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-500">{error}</p>}
          
          {teamLeads.map(tl => (
            <div key={tl.id} className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold">{tl.name} ({tl.subrole})</h3>
                {recipes.map(recipe => (
                    <div key={recipe.id} className="flex items-center justify-between mt-2">
                        <span>{recipe.name}</span>
                        <input 
                            type="number"
                            placeholder="Quantity"
                            value={forecasts[tl.id]?.[recipe.id] || ''}
                            onChange={e => handleForecastChange(tl.id, recipe.id, e.target.value)}
                            className="w-24 p-1 border rounded"
                        />
                    </div>
                ))}
            </div>
          ))}

          <div>
            <button type="submit" disabled={loading || isForecastSubmitted} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex justify-center">
              {loading ? <Loader /> : isForecastSubmitted ? 'Forecast Submitted' : 'Submit Forecasts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZonalHeadInput;
