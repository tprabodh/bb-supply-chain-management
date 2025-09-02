
import React, { useState, useEffect } from 'react';
import { createDailyTarget, subscribeToDailyTarget } from '../services/dailyTargetService';
import { formatDate } from '../utils/dateUtils';
import { toast } from 'react-toastify';

const DailyTargetInput = ({ teamLead, weeklyForecast, recipes }) => {
    const [dailyTarget, setDailyTarget] = useState({});
    const [remainingForecast, setRemainingForecast] = useState({});
    const [loading, setLoading] = useState(false);

    const today = formatDate(new Date());

    useEffect(() => {
        let unsubscribe;
        if (teamLead && teamLead.id) {
            unsubscribe = subscribeToDailyTarget(teamLead.id, today, (existingTarget) => {
                const initialRemaining = {};
                weeklyForecast.items.forEach(item => {
                    initialRemaining[item.recipeId] = item.quantity;
                });

                if (existingTarget) {
                    existingTarget.items.forEach(item => {
                        initialRemaining[item.recipeId] -= item.quantity;
                    });
                }
                setRemainingForecast(initialRemaining);
            }, (err) => {
                toast.error('Error subscribing to daily target.');
                console.error('Error subscribing to daily target:', err);
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [weeklyForecast, teamLead.id, today]);

    const handleTargetChange = (recipeId, quantity) => {
        setDailyTarget(prev => ({
            ...prev,
            [recipeId]: quantity
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const items = [];
            for (const recipeId in dailyTarget) {
                const quantity = Number(dailyTarget[recipeId]);
                if (quantity > remainingForecast[recipeId]) {
                    throw new Error(`Daily target for ${recipes.find(r => r.id === recipeId)?.name} cannot exceed remaining forecast.`);
                }
                items.push({
                    recipeId,
                    quantity,
                    name: recipes.find(r => r.id === recipeId)?.name || ''
                });
            }

            const targetData = {
                zonalHeadId: teamLead.reportsTo,
                teamLeadId: teamLead.id,
                date: today,
                items,
            };

            await createDailyTarget(targetData);
            toast.success('Daily target submitted successfully!');

        } catch (error) {
            toast.error(error.message || 'Error submitting daily target.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
            <h4 className="text-lg font-semibold text-gray-700">{teamLead.name} <span className="text-sm font-normal">({teamLead.subrole})</span></h4>
            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                {weeklyForecast.items.map(item => (
                    <div key={item.recipeId} className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">{item.name} (Rem: {remainingForecast[item.recipeId] || 0})</label>
                        <input 
                            type="number"
                            placeholder="Qty"
                            value={dailyTarget[item.recipeId] || ''}
                            onChange={e => handleTargetChange(item.recipeId, e.target.value)}
                            className="w-24 px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out"
                        />
                    </div>
                ))}
                <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#f56703] hover:bg-[#d95702] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5">
                    {loading ? 'Submitting...' : 'Set Daily Target'}
                </button>
            </form>
        </div>
    );
};

export default DailyTargetInput;
