
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileById } from '../../services/profileService';
import { getRecipes } from '../../services/recipeService';
import { getSalesExecutiveForecast, createOrUpdateForecast } from '../../services/forecastService';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils';

const SalesExecutiveDashboard = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const getWeekStartDate = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(today.setDate(diff));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const weekStartDate = getWeekStartDate().toISOString().split('T')[0];
        const [recipesData, forecastData] = await Promise.all([
          getRecipes(),
          getSalesExecutiveForecast(user.uid, weekStartDate),
        ]);

        setRecipes(recipesData);

        if (forecastData) {
          setForecast(forecastData);
        } else {
          let zonalHeadId = null;
          if (user.reportsTo) {
            const teamLeadProfile = await getProfileById(user.reportsTo);
            if (teamLeadProfile) {
              zonalHeadId = teamLeadProfile.reportsTo;
            }
          }

          const newForecast = {
            salesExecutiveId: user.uid,
            teamLeadId: user.reportsTo,
            zonalHeadId: zonalHeadId,
            forecastWeek: weekStartDate,
            status: 'Draft',
            items: recipesData.map(recipe => ({
              recipeId: recipe.id,
              name: recipe.name,
              dailyQuantities: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 },
              quantity: 0,
            })),
          };
          setForecast(newForecast);
        }
      } catch (error) {
        toast.error('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleQuantityChange = (recipeId, day, newQuantity) => {
    const updatedItems = forecast.items.map(item => {
      if (item.recipeId === recipeId) {
        const newDailyQuantities = { ...item.dailyQuantities, [day]: newQuantity };
        const newTotalQuantity = Object.values(newDailyQuantities).reduce((sum, qty) => sum + qty, 0);
        return { ...item, dailyQuantities: newDailyQuantities, quantity: newTotalQuantity };
      }
      return item;
    });
    setForecast({ ...forecast, items: updatedItems });
  };

  const handleSave = async () => {
    try {
      let updatedForecast = { ...forecast };
      if (forecast.status === 'Draft' || forecast.status === 'Rejected by Stock Manager') {
        updatedForecast.status = 'Pending Stock Manager Approval';
      }
      await createOrUpdateForecast(updatedForecast);
      setForecast(updatedForecast); // Update local state with new status
      toast.success('Forecast updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update forecast.');
    }
  };

  

  if (loading) {
    return <div>Loading...</div>;
  }

  const isEditable = forecast.status === 'Draft' || forecast.status === 'Rejected by Stock Manager' || forecast.status === 'Pending Stock Manager Approval';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Weekly Forecast</h1>

      {forecast && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p><strong>Week:</strong> {formatDate(new Date(forecast.forecastWeek))}</p>
            <p><strong>Status:</strong> {forecast.status}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Item</th>
                  <th className="py-2 px-4 border-b">Mon</th>
                  <th className="py-2 px-4 border-b">Tue</th>
                  <th className="py-2 px-4 border-b">Wed</th>
                  <th className="py-2 px-4 border-b">Thu</th>
                  <th className="py-2 px-4 border-b">Fri</th>
                  <th className="py-2 px-4 border-b">Sat</th>
                  <th className="py-2 px-4 border-b">Sun</th>
                  <th className="py-2 px-4 border-b">Total</th>
                </tr>
              </thead>
              <tbody>
                {forecast.items.map(item => (
                  <tr key={item.recipeId}>
                    <td className="py-2 px-4 border-b">{item.name}</td>
                    {Object.keys(item.dailyQuantities).map(day => (
                      <td key={day} className="py-2 px-4 border-b">
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.dailyQuantities[day]}
                            onChange={(e) => handleQuantityChange(item.recipeId, day, parseInt(e.target.value, 10) || 0)}
                            className="w-20 px-2 py-1 border rounded-md"
                          />
                        ) : (
                          item.dailyQuantities[day]
                        )}
                      </td>
                    ))}
                    <td className="py-2 px-4 border-b">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-4">
            {isEditable && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Edit</button>
            )}
            {isEditing && (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-md">Update</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesExecutiveDashboard;
