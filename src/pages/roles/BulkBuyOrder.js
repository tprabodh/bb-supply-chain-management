import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const BulkBuyOrder = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState([]);
  const [orderIngredients, setOrderIngredients] = useState([]);
  const [bulkBuyOrders, setBulkBuyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'ingredients'));
        const ingredientsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setIngredients(ingredientsList);
      } catch (error) {
        toast.error('Failed to fetch ingredients.');
      }
    };

    const unsubscribe = onSnapshot(
      query(collection(db, 'bulkBuyOrders'), where('cohId', '==', user.uid)),
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBulkBuyOrders(orders);
        setLoading(false);
      },
      (error) => {
        toast.error('Failed to fetch bulk buy orders.');
        setLoading(false);
      }
    );

    fetchIngredients();
    return () => unsubscribe();
  }, [user.uid]);

  const handleAddIngredient = () => {
    if (!selectedIngredient || !quantity) {
      toast.error('Please select an ingredient and enter a quantity.');
      return;
    }

    const ingredient = ingredients.find(ing => ing.id === selectedIngredient);
    if (!ingredient) {
      toast.error('Invalid ingredient selected.');
      return;
    }

    const newOrderIngredient = {
      ...ingredient,
      quantity: parseInt(quantity, 10),
      totalCost: parseInt(quantity, 10) * ingredient.costPerUnit,
    };

    setOrderIngredients([...orderIngredients, newOrderIngredient]);
    setSelectedIngredient('');
    setQuantity('');
  };

  const handleSubmitOrder = async () => {
    if (orderIngredients.length === 0) {
      toast.error('Please add at least one ingredient to the order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalOrderCost = orderIngredients.reduce((total, item) => total + item.totalCost, 0);
      await addDoc(collection(db, 'bulkBuyOrders'), {
        cohId: user.uid,
        createdAt: new Date(),
        status: 'Pending Finance Approval',
        ingredients: orderIngredients,
        totalOrderCost,
      });
      setOrderIngredients([]);
      toast.success('Bulk buy order submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Bulk Buy Order</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label htmlFor="ingredient" className="block text-sm font-medium text-gray-700">Ingredient</label>
          <select
            id="ingredient"
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select an ingredient</option>
            {ingredients.map(ing => (
              <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleAddIngredient}
        className="mb-8 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Add Ingredient
      </button>

      {orderIngredients.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <ul className="space-y-2">
            {orderIngredients.map((item, index) => (
              <li key={index} className="p-2 border rounded-md flex justify-between">
                <span>{item.name} - {item.quantity} {item.unit}</span>
                <span>₹{item.totalCost.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-right font-bold">
            Total: ₹{orderIngredients.reduce((total, item) => total + item.totalCost, 0).toFixed(2)}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmitOrder}
        disabled={isSubmitting || orderIngredients.length === 0}
        className="px-6 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Order'}
      </button>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">My Bulk Buy Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Order ID</th>
                <th className="py-2 px-4 border-b">Date</th>
                <th className="py-2 px-4 border-b">Total Cost</th>
                <th className="py-2 px-4 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {bulkBuyOrders.map(order => (
                <tr key={order.id}>
                  <td className="py-2 px-4 border-b">{order.id}</td>
                  <td className="py-2 px-4 border-b">{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b">₹{order.totalOrderCost.toFixed(2)}</td>
                  <td className="py-2 px-4 border-b">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BulkBuyOrder;
