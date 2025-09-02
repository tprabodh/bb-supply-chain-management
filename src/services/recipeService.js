import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const recipesCollection = collection(db, 'recipes');

export const createRecipe = async (recipeData) => {
  try {
    const docRef = await addDoc(recipesCollection, recipeData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
};

export const getRecipes = async () => {
  try {
    const snapshot = await getDocs(recipesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }
};

export const subscribeToRecipes = (callback) => {
  try {
    const unsubscribe = onSnapshot(recipesCollection, (snapshot) => {
      const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(recipes);
    }, (error) => {
      console.error('Error subscribing to recipes:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for recipes:', error);
    throw error;
  }
};

export const updateRecipe = async (id, recipeData) => {
  try {
    const recipeRef = doc(db, 'recipes', id);
    await updateDoc(recipeRef, recipeData);
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
};

export const deleteRecipe = async (id) => {
  try {
    const recipeRef = doc(db, 'recipes', id);
    await deleteDoc(recipeRef);
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};
