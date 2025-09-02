import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
import { createProcurementRequest } from './procurementService';
import { getRecipes } from './recipeService';
import { getProfileById } from './profileService'; // Import getProfileById

const forecastsCollection = collection(db, 'forecasts');

export const createForecast = async (forecastData) => {
  try {
    const { zonalHeadId, forecastWeek } = forecastData;
    const q = query(forecastsCollection, where('zonalHeadId', '==', zonalHeadId), where('forecastWeek', '==', forecastWeek));
    const existingForecasts = await getDocs(q);
    if (!existingForecasts.empty) {
        throw new Error('A forecast for this week has already been submitted.');
    }

    const docRef = await addDoc(forecastsCollection, {
      ...forecastData,
      status: 'Pending',
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating forecast:', error);
    throw error;
  }
};

export const createBulkForecasts = async (forecasts) => {
    const batch = writeBatch(db);

    for (const forecastData of forecasts) {
        const { zonalHeadId, forecastWeek } = forecastData;
        const q = query(forecastsCollection, where('zonalHeadId', '==', zonalHeadId), where('forecastWeek', '==', forecastWeek));
        const existingForecasts = await getDocs(q);
        if (!existingForecasts.empty) {
            throw new Error(`A forecast for this week has already been submitted for one or more team leads.`);
        }

        const docRef = doc(collection(db, "forecasts"));
        batch.set(docRef, {
            ...forecastData,
            status: 'Pending',
            createdAt: new Date(),
        });
    }

    await batch.commit();
};

export const subscribeToForecastsByZonalHead = (zonalHeadId, callback) => {
  try {
    const q = query(forecastsCollection, where('zonalHeadId', '==', zonalHeadId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const forecasts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(forecasts);
    }, (error) => {
      console.error('Error subscribing to forecasts by zonal head:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for forecasts by zonal head:', error);
    throw error;
  }
};

export const subscribeToPendingForecasts = (callback) => {
    try {
      const q = query(forecastsCollection, where('status', '==', 'Pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const forecasts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(forecasts);
      }, (error) => {
        console.error('Error subscribing to pending forecasts:', error);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up subscription for pending forecasts:', error);
      throw error;
    }
  };

  export const subscribeToApprovedForecasts = (callback) => {
    try {
      const q = query(forecastsCollection, where('status', '==', 'Approved'));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const forecasts = await Promise.all(snapshot.docs.map(async doc => {
          const forecastData = { id: doc.id, ...doc.data() };
          if (forecastData.zonalHeadId) {
            const zonalHeadProfile = await getProfileById(forecastData.zonalHeadId);
            if (zonalHeadProfile) {
              forecastData.zonalHeadName = zonalHeadProfile.name;
              forecastData.zonalHeadSubrole = zonalHeadProfile.subrole;
            }
          }
          if (forecastData.teamLeadId) {
            const teamLeadProfile = await getProfileById(forecastData.teamLeadId);
            if (teamLeadProfile) {
              forecastData.teamLeadSubrole = teamLeadProfile.subrole;
            }
          }
          return forecastData;
        }));
        callback(forecasts);
      }, (error) => {
        console.error('Error subscribing to approved forecasts:', error);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up subscription for approved forecasts:', error);
      throw error;
    }
  };

  export const setForecastStatusToAssigned = async (forecastId) => {
    try {
      const forecastRef = doc(db, 'forecasts', forecastId);
      await updateDoc(forecastRef, { status: 'Assigned' });
    } catch (error) {
      console.error('Error setting forecast status to assigned:', error);
      throw error;
    }
  };

  export const updateForecastStatus = async (forecastId, status, approvedItems = null) => {
    try {
      const forecastRef = doc(db, 'forecasts', forecastId);
      const forecastSnap = await getDoc(forecastRef);
      const forecast = { id: forecastSnap.id, ...forecastSnap.data() };

      const updateData = {
        status,
        approvedAt: new Date(),
      };
      if (approvedItems) {
        updateData.items = approvedItems;
      }
      await updateDoc(forecastRef, updateData);

      if (status === 'Approved') {
        const allRecipes = await getRecipes();
        const recipeMap = allRecipes.reduce((map, recipe) => {
            map[recipe.id] = recipe;
            return map;
        }, {});

        const preparedStockSnapshot = await getDocs(collection(db, 'preparedStock'));
        const preparedStock = preparedStockSnapshot.docs.map(doc => ({ name: doc.id, ...doc.data() }));

        const stockSnapshot = await getDocs(collection(db, 'stock'));
        const stock = stockSnapshot.docs.map(doc => ({ name: doc.id, ...doc.data() }));

        const ingredientsToProcure = {};

        for (const item of approvedItems) {
          const prepared = preparedStock.find(ps => ps.name === item.name);
          let quantityToCook = item.quantity;

          if (prepared) {
            const quantityFromPrepared = Math.min(quantityToCook, prepared.quantity);
            quantityToCook -= quantityFromPrepared;
            // This is a simplified approach. In a real app, you might want to update the prepared stock here, or handle it in a separate process.
          }

          if (quantityToCook > 0) {
            const recipe = recipeMap[item.recipeId];
            if (recipe) {
                recipe.ingredients.forEach(ingredient => {
                    const { name, unit } = ingredient;
                    const requiredQuantity = ingredient.quantity * quantityToCook;
                    
                    const availableStock = stock.find(s => s.name === name);
                    let quantityToBuy = requiredQuantity;

                    if (availableStock) {
                      const quantityFromStock = Math.min(quantityToBuy, availableStock.quantity);
                      quantityToBuy -= quantityFromStock;
                    }

                    if (quantityToBuy > 0) {
                      if (!ingredientsToProcure[name]) {
                          ingredientsToProcure[name] = { totalQuantity: 0, unit };
                      }
                      ingredientsToProcure[name].totalQuantity += quantityToBuy;
                    }
                });
            }
          }
        }

        if (Object.keys(ingredientsToProcure).length > 0) {
          const procurementRequestData = {
              forecastId,
              teamLeadId: forecast.teamLeadId,
              forecastWeek: forecast.forecastWeek,
              ingredients: Object.entries(ingredientsToProcure).map(([name, { totalQuantity, unit }]) => ({ name, quantity: totalQuantity, unit }))
          };

          await createProcurementRequest(procurementRequestData);
        }
      }
    } catch (error) {
      console.error('Error updating forecast status:', error);
      throw error;
    }
  };

export const getForecastById = async (id) => {
  try {
    const docRef = doc(db, 'forecasts', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (e) {
    console.error('Error getting forecast: ', e);
    throw e;
  }
};