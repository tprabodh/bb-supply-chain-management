
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToAssignmentsByKitchen, updateCookedQuantities, deductKitchenStock } from '../../services/kitchenService';
import Loader from '../../components/Loader';
import { toast } from 'react-toastify';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../../firebase';

const KitchenManagerInput = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [cookedQuantities, setCookedQuantities] = useState({});
  const [loading, setLoading] = useState(true); // Set loading to true initially
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAssignmentsByKitchen(user.id, (fetchedAssignments) => {
      const activeAssignments = fetchedAssignments.filter(a => a.status === 'Ingredients Received');
      setAssignments(activeAssignments);
      // Initialize cooked quantities state
      const initialQuantities = {};
      activeAssignments.forEach(a => {
        initialQuantities[a.id] = {};
        a.items.forEach(i => {
            initialQuantities[a.id][i.name] = i.quantity; // Default to assigned quantity
        });
      });
      setCookedQuantities(initialQuantities);
      setLoading(false);
    }, (err) => {
      setError('Error subscribing to assignments.');
      console.error('Error subscribing to assignments:', err);
      toast.error('Error loading assignments.');
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [user]);

  const handleQuantityChange = (assignmentId, itemName, value) => {
    const newQuantities = { ...cookedQuantities };
    newQuantities[assignmentId][itemName] = Number(value);
    setCookedQuantities(newQuantities);
  };

  const handleSubmit = async (assignmentId) => {
    setLoading(true);
    try {
        const assignment = assignments.find(a => a.id === assignmentId);
        const updatedItems = assignment.items.map(item => ({
            ...item,
            cookedQuantity: cookedQuantities[assignmentId][item.name]
        }));

        // Get all recipes for the items in the assignment
        const recipePromises = assignment.items.map(item => getDocs(query(collection(db, 'recipes'), where('name', '==', item.name))));
        const recipeSnapshots = await Promise.all(recipePromises);

        const allIngredients = [];
        recipeSnapshots.forEach((snapshot, index) => {
            if (snapshot.empty) {
                throw new Error(`Recipe for ${assignment.items[index].name} not found.`);
            }
            const recipe = snapshot.docs[0].data();
            recipe.ingredients.forEach(ingredient => {
                allIngredients.push({
                    ingredientName: ingredient.name,
                    quantity: ingredient.quantity * updatedItems[index].cookedQuantity,
                });
            });
        });

        await updateCookedQuantities(assignmentId, updatedItems);
        await deductKitchenStock(user.id, allIngredients);
        toast.success('Cooked quantities submitted successfully!');
    } catch (error) {
        setError('Error submitting cooked quantities.');
        console.error(error);
        toast.error('Error submitting cooked quantities.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center tracking-tight">Submit Cooked Quantities</h2>
        {loading && <div className="flex justify-center items-center h-32"><Loader /></div>}
        {error && <p className="text-red-500 text-center">{error}</p>}
        
        {!loading && !error && assignments.length === 0 && <p className="text-gray-500 text-center">No active cooking tasks.</p>}

        {!loading && !error && assignments.length > 0 && (
          <div className="space-y-8">
            {assignments.map(assignment => (
              <div key={assignment.id} className="p-6 border border-gray-200 rounded-lg shadow-sm bg-white">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Assignment for Forecast ID: {assignment.forecastId}</h3>
                <div className="space-y-4">
                  {assignment.items.map(item => (
                      <div key={item.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                          <span className="font-medium text-gray-700 mb-2 sm:mb-0">{item.name} (Assigned: {item.quantity})</span>
                          <input 
                              type="number"
                              value={cookedQuantities[assignment.id]?.[item.name] || ''}
                              onChange={e => handleQuantityChange(assignment.id, item.name, e.target.value)}
                              className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                          />
                      </div>
                  ))}
                </div>
                <button onClick={() => handleSubmit(assignment.id)} className="mt-6 w-full sm:w-auto px-6 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5">
                  Submit Cooked Quantities
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenManagerInput;

  