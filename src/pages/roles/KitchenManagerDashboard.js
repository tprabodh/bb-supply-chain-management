
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToAssignmentsByKitchen, updateCookingAssignmentStatus, confirmIngredientReceipt } from '../../services/kitchenService';
import Loader from '../../components/Loader';
import CookedFood from '../../components/CookedFood';
import KitchenManagerInventory from '../../components/KitchenManagerInventory';
import { toast } from 'react-toastify';

const KitchenManagerDashboard = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAssignmentsByKitchen(user.id, (fetchedAssignments) => {
      setAssignments(fetchedAssignments);
      setLoading(false);
    }, (err) => {
      toast.error('Error loading assignments.');
      console.error('Error subscribing to assignments:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleConfirmReceipt = async (assignmentId) => {
    try {
      await confirmIngredientReceipt(assignmentId, user.id);
      toast.success('Ingredient receipt confirmed and stock updated!');
    } catch (error) {
      toast.error('Error confirming receipt. Please try again.');
      console.error('Error confirming receipt:', error);
    }
  };

  const incomingIngredients = assignments.filter(a => a.status === 'Dispersed');
  const cookingTasks = assignments.filter(a => a.status === 'Ingredients Received');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 text-center">Kitchen Manager Dashboard</h1>
        
        {loading && <div className="flex justify-center items-center h-64"><Loader /></div>}
        {!loading && (
          <div className="space-y-8">
            <KitchenManagerInventory />

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Incoming Items</h3>
                <div className="space-y-4">
                    {incomingIngredients.length > 0 ? (
                        incomingIngredients.map(task => (
                            <div key={task.id} className="p-4 bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                    <p className="font-bold text-base sm:text-lg text-yellow-800 mb-2 sm:mb-0">Assignment for Forecast ID: {task.forecastId}</p>
                                    <button onClick={() => handleConfirmReceipt(task.id)} className="w-full sm:w-auto px-4 py-2 font-semibold text-white bg-[#f56703] rounded-lg shadow-md hover:bg-[#d95702] transform hover:-translate-y-0.5 transition-all duration-300">Confirm Receipt</button>
                                </div>
                                <ul className="pl-5 mt-2 list-disc list-inside text-yellow-700">
                                    {task.items.map((item, index) => (
                                        <li key={index}>{item.quantity} {item.unit} of {item.name} (to cook)</li>
                                    ))}
                                    {task.fromPreparedStock && task.fromPreparedStock.map((item, index) => (
                                        <li key={index}>{item.quantity} of {item.name} (from prepared stock)</li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">No incoming items.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Cooking Tasks</h3>
                <div className="space-y-4">
                    {cookingTasks.length > 0 ? (
                        cookingTasks.map(task => (
                            <div key={task.id} className="p-4 bg-green-50 rounded-lg shadow-sm border border-green-200">
                                <p className="font-bold text-base sm:text-lg text-green-800">Assignment for Forecast ID: {task.forecastId}</p>
                                <ul className="pl-5 mt-2 list-disc list-inside text-green-700">
                                    {task.items.map((item, index) => (
                                        <li key={index}>Cook {item.quantity} {item.unit} of {item.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4">No active cooking tasks. Confirm ingredient receipt to get started.</p>
                    )}
                </div>
            </div>
            <CookedFood />
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenManagerDashboard;
