
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';

const profilesCollection = collection(db, 'profiles');
const vendorsCollection = collection(db, 'vendors');

export const subscribeToSalesExecutivesByTeamLead = (teamLeadId, callback) => {
  try {
    const q = query(profilesCollection, where('role', '==', 'Sales Executive'), where('reportsTo', '==', teamLeadId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesExecutives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(salesExecutives);
    }, (error) => {
      console.error('Error subscribing to sales executives:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for sales executives:', error);
    throw error;
  }
};

export const fetchSalesExecutivesByTeamLead = async (teamLeadId) => {
  try {
    const q = query(profilesCollection, where('role', '==', 'Sales Executive'), where('reportsTo', '==', teamLeadId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching sales executives (one-time):', error);
    throw error;
  }
};

export const getVendorUidByEmail = async (email) => {
  try {
    const q = query(vendorsCollection, where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    return snapshot.docs[0].id;
  } catch (error) {
    console.error('Error fetching vendor uid:', error);
    throw error;
  }
};

export const getSalesDataByVendorUid = async (vendorUid) => {
  try {
    const docRef = doc(db, 'vendor_stock_history', vendorUid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching sales data:', error);
    throw error;
  }
};
