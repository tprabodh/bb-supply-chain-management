import React, { useState, useEffect } from 'react';
import { addIngredient, subscribeToIngredients } from '../../services/ingredientService';
import { toast } from 'react-toastify';

const IngredientManagement = () => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    costPerUnit: '',
  });
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToIngredients((fetchedIngredients) => {
      setIngredients(fetchedIngredients);
    }, (err) => {
      console.error('Error subscribing to ingredients:', err);
      toast.error('Error loading ingredients.');
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addIngredient({
        ...formData,
        costPerUnit: parseFloat(formData.costPerUnit),
      });
      setFormData({
        name: '',
        unit: '',
        costPerUnit: '',
      });
      toast.success('Ingredient added successfully!');
    } catch (error) {
      toast.error('Error adding ingredient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Ingredient Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Add New Ingredient</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ingredient Name</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit of Measurement</label>
              <input id="unit" name="unit" type="text" value={formData.unit} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="costPerUnit" className="block text-sm font-medium text-gray-700">Cost per Base Unit</label>
              <input id="costPerUnit" name="costPerUnit" type="number" value={formData.costPerUnit} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {loading ? 'Adding...' : 'Add Ingredient'}
            </button>
          </form>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Registered Ingredients</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost per Unit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{ingredient.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ingredient.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{ingredient.costPerUnit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientManagement;