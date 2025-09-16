
import React, { useState, useEffect } from 'react';
import { createRecipe, subscribeToRecipes, updateRecipe, deleteRecipe } from '../../services/recipeService';
import { subscribeToIngredients } from '../../services/ingredientService';
import { syncVendorsWithRecipe } from '../../services/vendorSyncService';

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newIngredients, setNewIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
  const [newMrp, setNewMrp] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newIncentives, setNewIncentives] = useState([{ percentage: '', from: '', to: '' }]);
  const [newIsJar, setNewIsJar] = useState(false);
  const [newIsPickle, setNewIsPickle] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [masterIngredients, setMasterIngredients] = useState([]);

  useEffect(() => {
    const unsubscribeRecipes = subscribeToRecipes((fetchedRecipes) => {
      setRecipes(fetchedRecipes);
      setLoading(false);
    }, (err) => {
      setError('Failed to subscribe to recipes.');
      console.error('Error subscribing to recipes:', err);
      setLoading(false);
    });

    const unsubscribeIngredients = subscribeToIngredients((fetchedIngredients) => {
      setMasterIngredients(fetchedIngredients);
    }, (err) => {
      console.error('Error subscribing to ingredients:', err);
    });

    return () => {
      unsubscribeRecipes();
      unsubscribeIngredients();
    };
  }, []);

  const handleAddIngredient = () => {
    setNewIngredients([...newIngredients, { name: '', quantity: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index) => {
    const updatedIngredients = newIngredients.filter((_, i) => i !== index);
    setNewIngredients(updatedIngredients);
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...newIngredients];
    const currentIngredient = { ...updatedIngredients[index], [field]: value };

    if (field === 'name') {
      const selectedIngredient = masterIngredients.find(i => i.name === value);
      if (selectedIngredient) {
        currentIngredient.unit = selectedIngredient.unit;
        // If quantity is already set, calculate cost
        if (currentIngredient.quantity) {
          const quantity = parseFloat(currentIngredient.quantity);
          const costPerUnit = parseFloat(selectedIngredient.costPerUnit);
          currentIngredient.cost = quantity * costPerUnit;
        }
      }
    } else if (field === 'quantity') {
      const selectedIngredient = masterIngredients.find(i => i.name === currentIngredient.name);
      if (selectedIngredient) {
        const quantity = parseFloat(value);
        const costPerUnit = parseFloat(selectedIngredient.costPerUnit);
        currentIngredient.cost = quantity * costPerUnit;
      }
    }

    updatedIngredients[index] = currentIngredient;
    setNewIngredients(updatedIngredients);
  };

  const handleIncentiveChange = (index, field, value) => {
    const updatedIncentives = newIncentives.map((incentive, i) =>
      i === index ? { ...incentive, [field]: value } : incentive
    );
    setNewIncentives(updatedIncentives);
  };

  const handleAddIncentive = () => {
    setNewIncentives([...newIncentives, { percentage: '', from: '', to: '' }]);
  };

  const handleRemoveIncentive = (index) => {
    const updatedIncentives = newIncentives.filter((_, i) => i !== index);
    setNewIncentives(updatedIncentives);
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const recipeData = {
        name: newRecipeName,
        mrp: parseFloat(newMrp),
        sellingPrice: parseFloat(newSellingPrice),
        description: newDescription,
        imageUrl: newImageUrl,
        isJar: newIsJar,
        isPickle: newIsPickle,
        incentives: newIncentives.map(inc => ({
          percentage: parseFloat(inc.percentage) || 0,
          from: parseInt(inc.from, 10) || 0,
          to: parseInt(inc.to, 10) || 0,
        })),
        ingredients: newIngredients.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) }))
      };
      await createRecipe(recipeData);
      await syncVendorsWithRecipe(null, recipeData, 'update'); // Pass type as 'update' for new recipe
      setNewRecipeName('');
      setNewIngredients([{ name: '', quantity: '', unit: '' }]);
      setNewMrp('');
      setNewSellingPrice('');
      setNewDescription('');
      setNewImageUrl('');
      setNewIncentives([{ percentage: '', from: '', to: '' }]);
      setNewIsJar(false);
      setNewIsPickle(false);
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
      const updatedRecipeData = {
        name: editingRecipe.name,
        mrp: parseFloat(editingRecipe.mrp),
        sellingPrice: parseFloat(editingRecipe.sellingPrice),
        description: editingRecipe.description,
        imageUrl: editingRecipe.imageUrl || '',
        isJar: editingRecipe.isJar || false,
        isPickle: editingRecipe.isPickle || false,
        incentives: (editingRecipe.incentives || []).map(inc => ({
          percentage: parseFloat(inc.percentage) || 0,
          from: parseInt(inc.from, 10) || 0,
          to: parseInt(inc.to, 10) || 0,
        })),
        ingredients: editingRecipe.ingredients.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) }))
      };
      await updateRecipe(editingRecipe.id, updatedRecipeData);
      await syncVendorsWithRecipe(editingRecipe.id, updatedRecipeData, 'update'); // Pass type as 'update' for updated recipe
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
      const recipeToDelete = recipes.find(r => r.id === id);
      await deleteRecipe(id);
      if (recipeToDelete) {
        await syncVendorsWithRecipe(id, recipeToDelete, 'delete'); // Pass type as 'delete'
      }
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

  const handleEditingIncentiveChange = (index, field, value) => {
    const updatedIncentives = editingRecipe.incentives.map((incentive, i) =>
      i === index ? { ...incentive, [field]: value } : incentive
    );
    setEditingRecipe({ ...editingRecipe, incentives: updatedIncentives });
  };

  const handleAddEditingIncentive = () => {
    setEditingRecipe({
      ...editingRecipe,
      incentives: [...(editingRecipe.incentives || []), { percentage: '', from: '', to: '' }],
    });
  };

  const handleRemoveEditingIncentive = (index) => {
    const updatedIncentives = editingRecipe.incentives.filter((_, i) => i !== index);
    setEditingRecipe({ ...editingRecipe, incentives: updatedIncentives });
  };

  return (
    <div className="container mx-auto p-4">
      <datalist id="ingredients-list">
        {masterIngredients.map((ingredient) => (
          <option key={ingredient.id} value={ingredient.name} />
        ))}
      </datalist>
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

          <div>
            <label htmlFor="newImageUrl" className="block text-sm font-medium text-gray-700">Image URL</label>
            <input
              type="text"
              id="newImageUrl"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newIsJar"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                checked={newIsJar}
                onChange={(e) => setNewIsJar(e.target.checked)}
              />
              <label htmlFor="newIsJar" className="ml-2 block text-sm text-gray-900">Is Jar?</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newIsPickle"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                checked={newIsPickle}
                onChange={(e) => setNewIsPickle(e.target.checked)}
              />
              <label htmlFor="newIsPickle" className="ml-2 block text-sm text-gray-900">Is Pickle?</label>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-700">Incentives</h3>
          {newIncentives.map((incentive, index) => (
            <div key={index} className="flex space-x-2 items-end">
              <div className="flex-1">
                <label htmlFor={`incentive-percentage-${index}`} className="block text-sm font-medium text-gray-700">Percentage</label>
                <input
                  type="number"
                  id={`incentive-percentage-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={incentive.percentage}
                  onChange={(e) => handleIncentiveChange(index, 'percentage', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`incentive-from-${index}`} className="block text-sm font-medium text-gray-700">From Units</label>
                <input
                  type="number"
                  id={`incentive-from-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={incentive.from}
                  onChange={(e) => handleIncentiveChange(index, 'from', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`incentive-to-${index}`} className="block text-sm font-medium text-gray-700">To Units</label>
                <input
                  type="number"
                  id={`incentive-to-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={incentive.to}
                  onChange={(e) => handleIncentiveChange(index, 'to', e.target.value)}
                />
              </div>
              {newIncentives.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveIncentive(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddIncentive}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Add Incentive Tier
          </button>

          <h3 className="text-lg font-semibold text-gray-700">Ingredients</h3>
          {newIngredients.map((ingredient, index) => (
            <div key={index} className="flex space-x-2 items-end">
              <div className="flex-1">
                <label htmlFor={`ingredient-name-${index}`} className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  list="ingredients-list"
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
                  readOnly
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`ingredient-cost-${index}`} className="block text-sm font-medium text-gray-700">Cost</label>
                <input
                  type="number"
                  id={`ingredient-cost-${index}`}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={ingredient.cost || ''}
                  readOnly
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
            <div className="max-h-[70vh] overflow-y-auto pr-4">
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

              <div>
                <label htmlFor="editImageUrl" className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="text"
                  id="editImageUrl"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  value={editingRecipe.imageUrl || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, imageUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsJar"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={editingRecipe.isJar || false}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, isJar: e.target.checked })}
                  />
                  <label htmlFor="editIsJar" className="ml-2 block text-sm text-gray-900">Is Jar?</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsPickle"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={editingRecipe.isPickle || false}
                    onChange={(e) => setEditingRecipe({ ...editingRecipe, isPickle: e.target.checked })}
                  />
                  <label htmlFor="editIsPickle" className="ml-2 block text-sm text-gray-900">Is Pickle?</label>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-700">Incentives</h3>
              {(editingRecipe.incentives || []).map((incentive, index) => (
                <div key={index} className="flex space-x-2 items-end mb-2">
                  <div className="flex-1">
                    <label htmlFor={`edit-incentive-percentage-${index}`} className="block text-sm font-medium text-gray-700">Percentage</label>
                    <input
                      type="number"
                      id={`edit-incentive-percentage-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={incentive.percentage}
                      onChange={(e) => handleEditingIncentiveChange(index, 'percentage', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-incentive-from-${index}`} className="block text-sm font-medium text-gray-700">From Units</label>
                    <input
                      type="number"
                      id={`edit-incentive-from-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={incentive.from}
                      onChange={(e) => handleEditingIncentiveChange(index, 'from', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-incentive-to-${index}`} className="block text-sm font-medium text-gray-700">To Units</label>
                    <input
                      type="number"
                      id={`edit-incentive-to-${index}`}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={incentive.to}
                      onChange={(e) => handleEditingIncentiveChange(index, 'to', e.target.value)}
                    />
                  </div>
                  {(editingRecipe.incentives.length > 1) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEditingIncentive(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddEditingIncentive}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Add Incentive Tier
              </button>

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
        </div>
      )}
    </div>
  );
};

export default RecipeManagement;
