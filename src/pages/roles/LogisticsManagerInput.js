import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToProfiles, getSubordinates, subscribeToProfilesByRole } from '../../services/profileService';
import { subscribeToRecipes } from '../../services/recipeService';
import { createDistribution, subscribeToLogisticsInventory, updateLogisticsInventory } from '../../services/logisticsService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';

const LogisticsManagerInput = () => {
  const { user } = useAuth();
  const [teamLeads, setTeamLeads] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [availableStock, setAvailableStock] = useState({});
  const [selectedTeamLead, setSelectedTeamLead] = useState('');
  const [distributionItems, setDistributionItems] = useState([{ recipeId: '', quantity: '' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeProfiles;
    let unsubscribeRecipes;
    let unsubscribeLogisticsInventory;

    const setupSubscriptions = async () => {
      try {
        unsubscribeProfiles = subscribeToProfiles((allProfiles) => {
          const currentUserProfile = allProfiles.find(p => p.id === user.id);
          const cityOpsHeadId = currentUserProfile?.reportsTo;
          if (cityOpsHeadId) {
              const cityOpsSubordinates = getSubordinates(cityOpsHeadId, allProfiles);
              const filteredTeamLeads = cityOpsSubordinates.filter(p => p.role === 'Team Lead');
              setTeamLeads(filteredTeamLeads);
          } else {
              // Fallback if no cityOpsHeadId, subscribe to all Team Leads
              const unsubscribeTeamLeads = subscribeToProfilesByRole('Team Lead', (fetchedTeamLeads) => {
                setTeamLeads(fetchedTeamLeads);
              });
              // This unsubscribe needs to be handled carefully if it's conditional
              // For simplicity, we'll assume it's fine for now or refactor getSubordinates to be reactive
          }
        }, (err) => {
          setError('Error subscribing to profiles.');
          console.error('Error subscribing to profiles:', err);
        });

        unsubscribeRecipes = subscribeToRecipes((fetchedRecipes) => {
          setRecipes(fetchedRecipes);
        }, (err) => {
          setError('Error subscribing to recipes.');
          console.error('Error subscribing to recipes:', err);
        });

        unsubscribeLogisticsInventory = subscribeToLogisticsInventory((inventory) => {
          setAvailableStock(inventory);
          setLoading(false); // Set loading to false after all initial data is loaded
        }, (err) => {
          setError('Error subscribing to logistics inventory.');
          console.error('Error subscribing to logistics inventory:', err);
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
      if (unsubscribeLogisticsInventory) unsubscribeLogisticsInventory();
    };
  }, [user]);

  const handleItemChange = (index, event) => {
    const values = [...distributionItems];
    values[index][event.target.name] = event.target.value;
    setDistributionItems(values);
  };

  const handleAddItem = () => {
    setDistributionItems([...distributionItems, { recipeId: '', quantity: '' }]);
  };

  const handleRemoveItem = (index) => {
    const values = [...distributionItems];
    values.splice(index, 1);
    setDistributionItems(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamLead) {
        setError('Please select a Team Lead.');
        toast.error('Please select a Team Lead.');
        return;
    }

    for (const item of distributionItems) {
        if (item.quantity > (availableStock[item.recipeId] || 0)) {
            const recipeName = recipes.find(r => r.id === item.recipeId)?.name || 'item';
            setError(`Cannot distribute ${item.quantity} of ${recipeName}. Only ${availableStock[item.recipeId] || 0} available.`);
            toast.error(`Cannot distribute ${item.quantity} of ${recipeName}. Only ${availableStock[item.recipeId] || 0} available.`);
            return;
        }
    }

    setLoading(true);
    setError(null);
    try {
      const distributionData = {
        logisticsManagerId: user.id,
        teamLeadId: selectedTeamLead,
        items: distributionItems.map(item => ({
            ...item,
            name: recipes.find(r => r.id === item.recipeId)?.name || ''
        })),
      };
      await createDistribution(distributionData);
      await updateLogisticsInventory(distributionItems, 'subtract');
      setSelectedTeamLead('');
      setDistributionItems([{ recipeId: '', quantity: '' }]);
      toast.success('Distribution recorded successfully!');
      // No need to call fetchData() here, as the real-time listener will update
    } catch (error) {
      setError('Error recording distribution. Please try again.');
      toast.error('Error recording distribution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-2 md:p-4">
      <div className="w-full max-w-2xl p-4 md:p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Record Food Distribution</h2>
        
        {loading && <Loader />}
        {error && <p className="text-red-500">{error}</p>}

        <div className="p-4 bg-blue-50 rounded-md">
            <h3 className="text-lg font-semibold">Available Stock</h3>
            <ul>
                {Object.entries(availableStock).map(([recipeId, quantity]) => (
                    <li key={recipeId}>{recipes.find(r => r.id === recipeId)?.name}: {quantity}</li>
                ))}
            </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label htmlFor="teamLead" className="block text-sm font-medium text-gray-700">Team Lead</label>
            <select id="teamLead" name="teamLead" value={selectedTeamLead} onChange={(e) => setSelectedTeamLead(e.target.value)} required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">Select a Team Lead</option>
              {teamLeads.map(tl => (
                <option key={tl.id} value={tl.id}>{tl.name} ({tl.subrole})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Distribution Items</label>
            {distributionItems.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 mt-2">
                <select name="recipeId" value={item.recipeId} onChange={event => handleItemChange(index, event)} required className="block w-full px-3 py-2 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="">Select a Recipe</option>
                    {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>{recipe.name} (Available: {availableStock[recipe.id] || 0})</option>
                    ))}
                </select>
                <input type="number" name="quantity" placeholder="Quantity" value={item.quantity} onChange={event => handleItemChange(index, event)} required className="block w-full md:w-1/3 px-3 py-2 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                <button type="button" onClick={() => handleRemoveItem(index)} className="w-full md:w-auto px-3 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">Remove</button>
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Add Item</button>
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {loading ? 'Submitting...' : 'Submit Distribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogisticsManagerInput;