import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, runTransaction, onSnapshot, getDoc } from 'firebase/firestore';

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
        await updateDoc(assignmentRef, { items, status: 'Pending Stock Manager Collection', completedAt: new Date() });
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
            const stockRefs = ingredients.map(ing => doc(db, 'kitchenStock', `${kitchenId}_${ing.name}`));
            const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

            ingredients.forEach((ingredient, index) => {
                const stockDoc = stockDocs[index];
                const stockRef = stockRefs[index];

                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity + ingredient.quantity;
                    transaction.update(stockRef, { quantity: newQuantity });
                } else {
                    transaction.set(stockRef, { 
                        kitchenId, 
                        ingredientName: ingredient.name, 
                        quantity: ingredient.quantity, 
                        unit: ingredient.unit 
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error updating kitchen stock:', error);
        throw error;
    }
};

export const deductKitchenStock = async (kitchenId, ingredients) => {
    try {
        await runTransaction(db, async (transaction) => {
            const stockRefs = ingredients.map(ing => doc(db, 'kitchenStock', `${kitchenId}_${ing.ingredientName}`));
            const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

            ingredients.forEach((ingredient, index) => {
                const stockDoc = stockDocs[index];
                const stockRef = stockRefs[index];

                if (stockDoc.exists()) {
                    const newQuantity = stockDoc.data().quantity - ingredient.quantity;
                    if (newQuantity < 0) {
                        throw new Error(`Not enough stock for ${ingredient.ingredientName}`);
                    }
                    transaction.update(stockRef, { quantity: newQuantity });
                } else {
                    throw new Error(`Ingredient ${ingredient.ingredientName} not found in kitchen stock`);
                }
            });
        });
    } catch (error) {
        console.error('Error deducting kitchen stock:', error);
        throw error;
    }
};

export const confirmIngredientReceipt = async (assignmentId, kitchenId) => {
    const assignmentRef = doc(db, 'cookingAssignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
        throw new Error("Assignment not found!");
    }

    const assignment = assignmentDoc.data();

    // Get all recipes for the items in the assignment
    const recipePromises = assignment.items.map(item => getDocs(query(collection(db, 'recipes'), where('name', '==', item.name))));
    const recipeSnapshots = await Promise.all(recipePromises);

    const allIngredients = [];
    recipeSnapshots.forEach((snapshot, index) => {
        if (snapshot.empty) {
            throw new Error(`Recipe for ${assignment.items[index].name} not found.`);
        }
        const recipe = snapshot.docs[0].data();
        recipe.ingredients.forEach(ingredient => {
            allIngredients.push({
                name: ingredient.name,
                quantity: ingredient.quantity * assignment.items[index].quantity,
                unit: ingredient.unit
            });
        });
    });

    // Add items from prepared stock to the list of ingredients to update
    if (assignment.fromPreparedStock) {
        assignment.fromPreparedStock.forEach(item => {
            allIngredients.push(item);
        });
    }

    await runTransaction(db, async (transaction) => {
        const stockRefs = allIngredients.map(ing => doc(db, 'kitchenStock', `${kitchenId}_${ing.name}`));
        const stockDocs = await Promise.all(stockRefs.map(ref => transaction.get(ref)));

        allIngredients.forEach((ingredient, index) => {
            const stockDoc = stockDocs[index];
            const stockRef = stockRefs[index];

            if (stockDoc.exists()) {
                const newQuantity = stockDoc.data().quantity + ingredient.quantity;
                transaction.update(stockRef, { quantity: newQuantity });
            } else {
                transaction.set(stockRef, { 
                    kitchenId, 
                    ingredientName: ingredient.name, 
                    quantity: ingredient.quantity, 
                    unit: ingredient.unit 
                });
            }
        });

        transaction.update(assignmentRef, { status: 'Ingredients Received' });
    });
};
