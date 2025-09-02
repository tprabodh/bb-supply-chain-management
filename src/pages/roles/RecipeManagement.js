
import React, { useState, useEffect } from 'react';
import { createRecipe, subscribeToRecipes, updateRecipe, deleteRecipe } from '../../services/recipeService';

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newIngredients, setNewIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
  const [newMrp, setNewMrp] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToRecipes((fetchedRecipes) => {
      setRecipes(fetchedRecipes);
      setLoading(false);
    }, (err) => {
      setError('Failed to subscribe to recipes.');
      console.error('Error subscribing to recipes:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddIngredient = () => {
    setNewIngredients([...newIngredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index) => {
    const updatedIngredients = newIngredients.filter((_, i) => i !== index);
    setNewIngredients(updatedIngredients);
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = newIngredients.map((ingredient, i) =>
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setNewIngredients(updatedIngredients);
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createRecipe({
        name: newRecipeName,
        mrp: parseFloat(newMrp),
        sellingPrice: parseFloat(newSellingPrice),
        description: newDescription,
        ingredients: newIngredients.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) }))
      });
      setNewRecipeName('');
      setNewIngredients([{ name: '', quantity: '', unit: '' }]);
      setNewMrp('');
      setNewSellingPrice('');
      setNewDescription('');
    } catch (err) {
      setError('Failed to create recipe.');
      console.error('Error creating recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (recipe) => {
    setEditingRecipe({ ...recipe, ingredients: recipe.ingredients.map(ing => ({ ...ing, quantity: String(ing.quantity) })) });
  };

  const handleUpdateRecipe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateRecipe(editingRecipe.id, {
        name: editingRecipe.name,
        mrp: parseFloat(editingRecipe.mrp),
        sellingPrice: parseFloat(editingRecipe.sellingPrice),
        description: editingRecipe.description,
        ingredients: editingRecipe.ingredients.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) }))
      });
      setEditingRecipe(null);
    } catch (err) {
      setError('Failed to update recipe.');
      console.error('Error updating recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteRecipe(id);
    } catch (err) {
      setError('Failed to delete recipe.');
      console.error('Error deleting recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditingIngredientChange = (index, field, value) => {
    const updatedIngredients = editingRecipe.ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setEditingRecipe({ ...editingRecipe, ingredients: updatedIngredients });
  };

  const handleAddEditingIngredient = () => {
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, { name: '', quantity: '', unit: '' }],
    });
  };

  const handleRemoveEditingIngredient = (index) => {
    const updatedIngredients = editingRecipe.ingredients.filter((_, i) => i !== index);
    setEditingRecipe({ ...editingRecipe, ingredients: updatedIngredients });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Recipe Management</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading && <p className="text-blue-500 mb-4">Loading...</p>}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Recipe</h2>
        <form onSubmit={handleCreateRecipe} className="space-y-4">
          <div>
            <label htmlFor="newRecipeName" className="block text-sm font-medium text-gray-700">Recipe Name</label>
            <input
              type="text"
              id="newRecipeName"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="newMrp" className="block text-sm font-medium text-gray-700">MRP</label>
            <input
              type="number"
              id="newMrp"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newMrp}
              onChange={(e) => setNewMrp(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="newSellingPrice" className="block text-sm font-medium text-gray-700">Selling Price</label>
            <input
              type="number"
              id="newSellingPrice"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newSellingPrice}
              onChange={(e) => setNewSellingPrice(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="newDescription" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="newDescription"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              required
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-700">Ingredients</h3>
          {newIngredients.map((ingredient, index) => (
            <div key={index} className="flex space-x-2 items-end">
              <div className="flex-1">
                <label htmlFor={`ingredient-name-${index}`} className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  id={`ingredient-name-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`ingredient-quantity-${index}`} className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  id={`ingredient-quantity-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={ingredient.quantity}
                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`ingredient-unit-${index}`} className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  id={`ingredient-unit-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  required
                />
              </div>
              {newIngredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddIngredient}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Add Ingredient
          </button>
          <button
            type="submit"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Recipe'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Existing Recipes</h2>
        {recipes.length === 0 ? (
          <p>No recipes found.</p>
        ) : (
          <ul className="space-y-4">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="border p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">{recipe.name}</h3>
                  <div>
                    <button
                      onClick={() => handleEditClick(recipe)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">MRP: {recipe.mrp}</p>
                  <p className="text-gray-600">Selling Price: {recipe.sellingPrice}</p>
                  <p className="text-gray-600">Description: {recipe.description}</p>
                </div>
                <p className="text-gray-600">Ingredients:</p>
                <ul className="list-disc list-inside ml-4">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient.name}: {ingredient.quantity} {ingredient.unit}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingRecipe && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Recipe: {editingRecipe.name}</h2>
            <form onSubmit={handleUpdateRecipe} className="space-y-4">
              <div>
                <label htmlFor="editRecipeName" className="block text-sm font-medium text-gray-700">Recipe Name</label>
                <input
                  type="text"
                  id="editRecipeName"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="editMrp" className="block text-sm font-medium text-gray-700">MRP</label>
                <input
                  type="number"
                  id="editMrp"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editingRecipe.mrp}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, mrp: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="editSellingPrice" className="block text-sm font-medium text-gray-700">Selling Price</label>
                <input
                  type="number"
                  id="editSellingPrice"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editingRecipe.sellingPrice}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, sellingPrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="editDescription"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editingRecipe.description}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, description: e.target.value })}
                  required
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-700">Ingredients</h3>
              {editingRecipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex space-x-2 items-end mb-2">
                  <div className="flex-1">
                    <label htmlFor={`edit-ingredient-name-${index}`} className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      id={`edit-ingredient-name-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={ingredient.name}
                      onChange={(e) => handleEditingIngredientChange(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-ingredient-quantity-${index}`} className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      id={`edit-ingredient-quantity-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={ingredient.quantity}
                      onChange={(e) => handleEditingIngredientChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-ingredient-unit-${index}`} className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      id={`edit-ingredient-unit-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={ingredient.unit}
                      onChange={(e) => handleEditingIngredientChange(index, 'unit', e.target.value)}
                      required
                    />
                  </div>
                  {editingRecipe.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEditingIngredient(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddEditingIngredient}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Add Ingredient
              </button>

              <div className="flex justify-end space-x-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecipe(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeManagement;
