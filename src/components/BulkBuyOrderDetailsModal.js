import React, { useState, useEffect } from 'react';
import { getProfileById } from '../services/profileService';
import { toast } from 'react-toastify';

const BulkBuyOrderDetailsModal = ({ order, onClose, onApprove, onReject, isProcurement }) => {
  const [cohProfile, setCohProfile] = useState(null);
  const [editableIngredients, setEditableIngredients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCohProfile = async () => {
      if (order.cohId) {
        const profile = await getProfileById(order.cohId);
        setCohProfile(profile);
      }
    };

    fetchCohProfile();
    setEditableIngredients(order.ingredients.map(ing => ({ ...ing })));
  }, [order]);

  const handleQuantityChange = (index, newQuantity) => {
    const updatedIngredients = [...editableIngredients];
    const ingredient = updatedIngredients[index];
    ingredient.quantity = newQuantity;
    ingredient.totalCost = newQuantity * ingredient.costPerUnit;
    setEditableIngredients(updatedIngredients);
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const totalOrderCost = editableIngredients.reduce((total, item) => total + item.totalCost, 0);
      await onApprove(order.id, 'Approved', editableIngredients, totalOrderCost);
    } catch (error) {
      toast.error('Failed to approve order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(order.id, 'Rejected');
    } catch (error) {
      toast.error('Failed to reject order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPurchased = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(order.id);
    } catch (error) {
      toast.error('Failed to mark as purchased.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Review Bulk Buy Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <p><strong>COH:</strong> {cohProfile?.subrole || order.cohId}</p>
          <p><strong>Submitted On:</strong> {new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editableIngredients.map((ingredient, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{ingredient.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10))}
                      className="w-24 px-2 py-1 border rounded-md"
                      disabled={isProcurement}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{ingredient.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">₹{ingredient.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right font-bold mb-6">
          Total: ₹{editableIngredients.reduce((total, item) => total + item.totalCost, 0).toFixed(2)}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">Close</button>
          {isProcurement ? (
            <button onClick={handleMarkAsPurchased} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md">Mark as Purchased</button>
          ) : (
            <>
              <button onClick={handleReject} disabled={isSubmitting} className="px-4 py-2 bg-red-600 text-white rounded-md">Reject</button>
              <button onClick={handleApprove} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-md">Approve</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkBuyOrderDetailsModal;
