import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, runTransaction, onSnapshot } from 'firebase/firestore';

const distributionsCollection = collection(db, 'distributions');
const logisticsInventoryCollection = collection(db, 'logisticsInventory');

export const subscribeToLogisticsInventory = (callback) => {
    try {
        const unsubscribe = onSnapshot(logisticsInventoryCollection, (snapshot) => {
            const inventory = {};
            snapshot.docs.forEach(doc => {
                inventory[doc.id] = doc.data().quantity;
            });
            callback(inventory);
        }, (error) => {
            console.error('Error subscribing to logistics inventory:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for logistics inventory:', error);
        throw error;
    }
};

export const updateLogisticsInventory = async (items, operation) => {
    try {
        await runTransaction(db, async (transaction) => {
            const itemRefs = items.map(item => doc(db, 'logisticsInventory', item.recipeId));
            const itemDocs = await Promise.all(itemRefs.map(ref => transaction.get(ref)));

            items.forEach((item, index) => {
                const itemDoc = itemDocs[index];
                const itemRef = itemRefs[index];
                const currentQuantity = itemDoc.exists() ? itemDoc.data().quantity : 0;
                const newQuantity = operation === 'add' 
                    ? currentQuantity + (item.cookedQuantity || item.quantity)
                    : currentQuantity - item.quantity;
                
                if (newQuantity < 0) {
                    throw new Error(`Not enough stock for ${item.name}`);
                }

                transaction.set(itemRef, { quantity: newQuantity });
            });
        });
    } catch (error) {
        console.error('Error updating logistics inventory:', error);
        throw error;
    }
};

export const createDistribution = async (distributionData) => {
  try {
    const docRef = await addDoc(distributionsCollection, {
      ...distributionData,
      status: 'In Transit', // Statuses: In Transit, Received
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating distribution:', error);
    throw error;
  }
};

export const subscribeToDistributionsByTeamLead = (teamLeadId, callback) => {
    try {
        const q = query(distributionsCollection, where('teamLeadId', '==', teamLeadId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const distributions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(distributions);
        }, (error) => {
            console.error('Error subscribing to distributions:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for distributions:', error);
        throw error;
    }
};

export const subscribeToReceivedDistributions = (callback) => {
    try {
        const q = query(distributionsCollection, where('status', '==', 'Received'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const distributions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(distributions);
        }, (error) => {
            console.error('Error subscribing to received distributions:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for received distributions:', error);
        throw error;
    }
};

export const updateDistributionStatus = async (distributionId, newStatus) => {
    try {
        const distributionRef = doc(db, 'distributions', distributionId);
        await updateDoc(distributionRef, { status: newStatus, receivedAt: new Date() });
    } catch (error) {
        console.error('Error updating distribution status:', error);
        throw error;
    }
};

export const collectCookedFood = async (task) => {
    try {
        await runTransaction(db, async (transaction) => {
            const taskRef = doc(db, 'cookingAssignments', task.id);
            
            // 1. READS
            const itemRefs = task.items.map(item => doc(db, 'logisticsInventory', item.recipeId));
            const itemDocs = await Promise.all(itemRefs.map(ref => transaction.get(ref)));

            // 2. WRITES
            transaction.update(taskRef, { status: 'Collected by Logistics' });

            task.items.forEach((item, index) => {
                const itemDoc = itemDocs[index];
                const itemRef = itemRefs[index];
                const currentQuantity = itemDoc.exists() ? itemDoc.data().quantity : 0;
                const newQuantity = currentQuantity + (item.cookedQuantity || item.quantity);
                
                transaction.set(itemRef, { quantity: newQuantity });
            });
        });
    } catch (error) {
        console.error('Error collecting cooked food:', error);
        throw error;
    }
};