
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';

const dailyTargetsCollection = collection(db, 'dailyTargets');

export const createDailyTarget = async (targetData) => {
    try {
        const { teamLeadId, date } = targetData;
        const docId = `${teamLeadId}_${date}`;
        const docRef = doc(db, 'dailyTargets', docId);
        await setDoc(docRef, targetData);
        return docId;
    } catch (error) {
        console.error('Error creating daily target:', error);
        throw error;
    }
};

export const subscribeToDailyTarget = (teamLeadId, date, callback) => {
    try {
        const docId = `${teamLeadId}_${date}`;
        const docRef = doc(db, 'dailyTargets', docId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() });
            } else {
                callback(null); // No document found
            }
        }, (error) => {
            console.error('Error subscribing to daily target:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for daily target:', error);
        throw error;
    }
};

export const subscribeToDailyTargetsByDate = (date, callback) => {
    try {
        const q = query(dailyTargetsCollection, where('date', '==', date));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const targets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(targets);
        }, (error) => {
            console.error('Error subscribing to daily targets by date:', error);
        });
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up subscription for daily targets by date:', error);
        throw error;
    }
};
