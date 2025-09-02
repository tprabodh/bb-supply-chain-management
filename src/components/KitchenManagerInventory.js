import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToKitchenStock } from '../services/kitchenService';
import Loader from './Loader';
import { toast } from 'react-toastify';

const KitchenManagerInventory = () => {
    const { user } = useAuth();
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToKitchenStock(user.id, (kitchenStock) => {
            setStock(kitchenStock);
            setLoading(false);
        }, (err) => {
            toast.error('Error subscribing to kitchen stock.');
            console.error('Error subscribing to kitchen stock:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Kitchen Inventory</h3>
            {loading && <div className="flex justify-center items-center h-32"><Loader /></div>}
            {!loading && (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stock.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.ingredientName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default KitchenManagerInventory;