import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

export const addIngredient = async (ingredientData) => {
  try {
    const docRef = await addDoc(collection(db, 'ingredients'), ingredientData);
    console.log('Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e;
  }
};

export const subscribeToIngredients = (callback) => {
  try {
    const unsubscribe = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const ingredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(ingredients);
    }, (error) => {
      console.error('Error subscribing to ingredients:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for ingredients:', error);
    throw error;
  }
};
