import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, runTransaction, onSnapshot } from 'firebase/firestore';

const procurementRequestsCollection = collection(db, 'procurementRequests');
const stockCollection = collection(db, 'stock');

export const createProcurementRequest = async (requestData) => {
  try {
    const docRef = await addDoc(procurementRequestsCollection, {
      ...requestData,
      status: 'Pending Purchase',
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating procurement request:', error);
    throw error;
  }
};

export const subscribeToPendingPurchaseRequests = (callback) => {
    try {
      const q = query(procurementRequestsCollection, where('status', '==', 'Pending Purchase'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(requests);
      }, (error) => {
        console.error('Error subscribing to pending purchase requests:', error);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up subscription for pending purchase requests:', error);
      throw error;
    }
};

export const subscribeToPurchasedRequests = (callback) => {
    try {
        const q = query(procurementRequestsCollection, where('status', '==', 'Purchased'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(requests);
        }, (error) => {
            console.error('Error subscribing to purchased requests:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for purchased requests:', error);
        throw error;
    }
};

export const updateProcurementRequestStatus = async (requestId, newStatus) => {
    try {
        const requestRef = doc(db, 'procurementRequests', requestId);
        const updateData = { status: newStatus };
        if (newStatus === 'Purchased') {
            updateData.purchasedAt = new Date();
        } else if (newStatus === 'Received by Stock') {
            updateData.receivedAt = new Date();
        }
        await updateDoc(requestRef, updateData);
    } catch (error) {
        console.error('Error updating procurement request status:', error);
        throw error;
    }
};

export const subscribeToSuccessfulProcurements = (callback) => {
    try {
        const q = query(procurementRequestsCollection, where('status', 'in', ['Purchased', 'Received by Stock']));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(requests);
        }, (error) => {
            console.error('Error subscribing to successful procurements:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for successful procurements:', error);
        throw error;
    }
};

export const subscribeToStock = (callback) => {
    try {
        const unsubscribe = onSnapshot(stockCollection, (snapshot) => {
            const stock = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(stock);
        }, (error) => {
            console.error('Error subscribing to stock:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for stock:', error);
        throw error;
    }
};

export const addStock = async (ingredients) => {
    try {
        await runTransaction(db, async (transaction) => {
            const stockRefs = ingredients.map(ing => {
                if (!ing || typeof ing.name !== 'string' || ing.name.trim() === '') {
                    console.error('Invalid ingredient object or name:', ing);
                    throw new Error('Invalid ingredient data provided for stock addition.');
                }
                return doc(db, 'stock', String(ing.name));
            });
            const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

            ingredients.forEach((ingredient, index) => {
                const stockDoc = stockDocs[index];
                const stockRef = stockRefs[index];

                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity + ingredient.quantity;
                    transaction.update(stockRef, { quantity: newQuantity });
                } else {
                    transaction.set(stockRef, { quantity: ingredient.quantity, unit: ingredient.unit });
                }
            });
        });
    } catch (error) {
        console.error('Error adding stock:', error);
        throw error;
    }
};

export const deductStock = async (ingredients) => {
    try {
        await runTransaction(db, async (transaction) => {
            const stockRefs = ingredients.map(ing => {
                if (!ing || typeof ing.name !== 'string' || ing.name.trim() === '') {
                    console.error('Invalid ingredient object or name:', ing);
                    throw new Error('Invalid ingredient data provided for stock deduction.');
                }
                return doc(db, 'stock', String(ing.name));
            });
            const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

            ingredients.forEach((ingredient, index) => {
                const stockDoc = stockDocs[index];
                const stockRef = stockRefs[index];

                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity - ingredient.quantity;
                    if (newQuantity < 0) {
                        throw new Error(`Not enough stock for ${ingredient.name}`);
                    }
                    transaction.update(stockRef, { quantity: newQuantity });
                } else {
                    throw new Error(`Ingredient ${ingredient.name} not found in stock`);
                }
            });
        });
    } catch (error) {
        console.error('Error deducting stock:', error);
        throw error;
    }
};