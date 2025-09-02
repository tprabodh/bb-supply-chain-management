
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

const profilesCollection = collection(db, 'profiles');

export const subscribeToTeamLeadsByZonalHead = (zonalHeadId, callback) => {
  try {
    const q = query(profilesCollection, where('role', '==', 'Team Lead'), where('reportsTo', '==', zonalHeadId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(teamLeads);
    }, (error) => {
      console.error('Error subscribing to team leads:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for team leads:', error);
    throw error;
  }
};
