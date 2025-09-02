import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, runTransaction, onSnapshot } from 'firebase/firestore';

const cookingAssignmentsCollection = collection(db, 'cookingAssignments');
const kitchenStockCollection = collection(db, 'kitchenStock');

export const createCookingAssignment = async (assignmentData) => {
  try {
    const docRef = await addDoc(cookingAssignmentsCollection, {
      ...assignmentData,
      status: 'Pending Dispersal', // Statuses: Pending Dispersal, Dispersed, Ingredients Received, Completed, Collected by Logistics
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating cooking assignment:', error);
    throw error;
  }
};

export const subscribeToAssignmentsByKitchen = (kitchenManagerId, callback) => {
    try {
        const q = query(cookingAssignmentsCollection, where('kitchenManagerId', '==', kitchenManagerId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(assignments);
        }, (error) => {
            console.error('Error subscribing to assignments by kitchen:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for assignments by kitchen:', error);
        throw error;
    }
};

export const subscribeToPendingDispersalAssignments = (callback) => {
    try {
        const q = query(cookingAssignmentsCollection, where('status', '==', 'Pending Dispersal'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(assignments);
        }, (error) => {
            console.error('Error subscribing to pending dispersal assignments:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for pending dispersal assignments:', error);
        throw error;
    }
};

export const updateCookingAssignmentStatus = async (assignmentId, newStatus) => {
    try {
        const assignmentRef = doc(db, 'cookingAssignments', assignmentId);
        await updateDoc(assignmentRef, { status: newStatus });
    } catch (error) {
        console.error('Error updating assignment status:', error);
        throw error;
    }
};

export const subscribeToAssignmentsByStatus = (status, callback) => {
    try {
        const q = query(cookingAssignmentsCollection, where('status', '==', status));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(assignments);
        }, (error) => {
            console.error(`Error subscribing to assignments with status ${status}:`, error);
        });
        return unsubscribe;
    } catch (error) {
        console.error(`Error setting up subscription for assignments with status ${status}:`, error);
        throw error;
    }
};

export const subscribeToCompletedAssignments = (callback) => {
    try {
        const q = query(cookingAssignmentsCollection, where('status', '==', 'Completed'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(assignments);
        }, (error) => {
            console.error('Error subscribing to completed assignments:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for completed assignments:', error);
        throw error;
    }
};

export const updateCookedQuantities = async (assignmentId, items) => {
    try {
        const assignmentRef = doc(db, 'cookingAssignments', assignmentId);
        await updateDoc(assignmentRef, { items, status: 'Completed', completedAt: new Date() });
    } catch (error) {
        console.error('Error updating cooked quantities:', error);
        throw error;
    }
};

export const getKitchens = async () => {
  try {
    const kitchensCollection = collection(db, 'kitchens');
    const snapshot = await getDocs(kitchensCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching kitchens:', error);
    throw error;
  }
};

export const subscribeToKitchenStock = (kitchenId, callback) => {
    try {
        const q = query(kitchenStockCollection, where('kitchenId', '==', kitchenId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stock = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(stock);
        }, (error) => {
            console.error('Error subscribing to kitchen stock:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for kitchen stock:', error);
        throw error;
    }
};

export const updateKitchenStock = async (kitchenId, ingredients) => {
    try {
        await runTransaction(db, async (transaction) => {
            const stockUpdates = [];
            for (const ingredient of ingredients) {
                const stockRef = doc(db, 'kitchenStock', `${kitchenId}_${ingredient.name}`);
                const stockDoc = await transaction.get(stockRef);
                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity + ingredient.quantity;
                    stockUpdates.push({ ref: stockRef, quantity: newQuantity });
                } else {
                    stockUpdates.push({ ref: stockRef, kitchenId, ingredientName: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit, isNew: true });
                }
            }

            for (const update of stockUpdates) {
                if (update.isNew) {
                    transaction.set(update.ref, { kitchenId: update.kitchenId, ingredientName: update.ingredientName, quantity: update.quantity, unit: update.unit });
                } else {
                    transaction.update(update.ref, { quantity: update.quantity });
                }
            }
        });
    } catch (error) {
        console.error('Error updating kitchen stock:', error);
        throw error;
    }
};

export const deductKitchenStock = async (kitchenId, ingredients) => {
    try {
        await runTransaction(db, async (transaction) => {
            for (const ingredient of ingredients) {
                const stockRef = doc(db, 'kitchenStock', `${kitchenId}_${ingredient.ingredientName}`);
                const stockDoc = await transaction.get(stockRef);
                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity - ingredient.quantity;
                    if (newQuantity < 0) {
                        throw new Error(`Not enough stock for ${ingredient.ingredientName}`);
                    }
                    transaction.update(stockRef, { quantity: newQuantity });
                } else {
                    throw new Error(`Ingredient ${ingredient.ingredientName} not found in kitchen stock`);
                }
            }
        });
    } catch (error) {
        console.error('Error deducting kitchen stock:', error);
        throw error;
    }
};
