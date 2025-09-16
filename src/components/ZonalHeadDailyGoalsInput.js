import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { createDailyTarget } from '../services/dailyTargetService'; // Assuming this service can be reused or modified
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateUtils';

const ZonalHeadDailyGoalsInput = ({ teamLeads, recipes, aggregatedSEForecasts, currentDate, forecastId, forecastWeek }) => {
  const { user } = useAuth();
  const [dailyGoals, setDailyGoals] = useState({}); // { teamLeadId: { recipeId: quantity } }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize dailyGoals state based on existing data or aggregatedSEForecasts
    const initialGoals = {};
    teamLeads.forEach(tl => {
      initialGoals[tl.id] = {};
      recipes.forEach(recipe => {
        // Pre-fill with aggregated SE forecast if available, otherwise 0
        const seForecast = aggregatedSEForecasts[tl.id]?.[recipe.id] || 0;
        initialGoals[tl.id][recipe.id] = seForecast;
      });
    });
    setDailyGoals(initialGoals);
  }, [teamLeads, recipes, aggregatedSEForecasts]);

  const handleGoalChange = (teamLeadId, recipeId, quantity) => {
    setDailyGoals(prev => ({
      ...prev,
      [teamLeadId]: {
        ...prev[teamLeadId],
        [recipeId]: Number(quantity)
      }
    }));
  };

  const handleSubmitDailyGoals = async () => {
    setLoading(true);
    try {
      const dailyTargetsToCreate = [];
      for (const teamLeadId in dailyGoals) {
        const items = [];
        for (const recipeId in dailyGoals[teamLeadId]) {
          items.push({
            recipeId,
            quantity: dailyGoals[teamLeadId][recipeId],
            name: recipes.find(r => r.id === recipeId)?.name || ''
          });
        }
        dailyTargetsToCreate.push({
          zonalHeadId: user.id,
          teamLeadId: teamLeadId,
          date: formatDate(new Date()),
          items: items,
          forecastId: forecastId, // Now passed as prop
          forecastWeek: forecastWeek, // Now passed as prop
        });
      }

      // Assuming createDailyTarget can handle an array of targets or needs to be called in a loop
      // For now, let's assume it needs to be called in a loop for each team lead
      for (const target of dailyTargetsToCreate) {
        await createDailyTarget(target);
      }
      
      toast.success('Daily goals submitted successfully!');
    } catch (error) {
      toast.error(`Error submitting daily goals: ${error.message}`);
      console.error('Error submitting daily goals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Set Daily Goals for Team Leads ({currentDate})</h3>
      {teamLeads.length === 0 ? (
        <p className="text-gray-600">No Team Leads found under your supervision.</p>
      ) : (
        <div className="space-y-6">
          {teamLeads.map(tl => (
            <div key={tl.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-xl font-semibold text-gray-700 mb-4">{tl.name} ({tl.subrole})</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aggregated SE Forecast</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Goal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipes.map(recipe => (
                      <tr key={recipe.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{recipe.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {aggregatedSEForecasts[tl.id]?.[recipe.id] || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            min="0"
                            value={dailyGoals[tl.id]?.[recipe.id] || ''}
                            onChange={(e) => handleGoalChange(tl.id, recipe.id, e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmitDailyGoals}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95602] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5"
          >
            {loading ? 'Submitting...' : 'Submit Daily Goals'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ZonalHeadDailyGoalsInput;
