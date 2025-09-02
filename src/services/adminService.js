
import { getFirestore, collection, getDocs, where, query, onSnapshot } from 'firebase/firestore';

const db = getFirestore();

export const subscribeToUsersCount = (callback) => {
  const usersCollection = collection(db, 'profiles');
  const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to users count:', error);
  });
  return unsubscribe;
};

export const subscribeToRolesCount = (callback) => {
  const rolesCollection = collection(db, 'roles');
  const unsubscribe = onSnapshot(rolesCollection, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to roles count:', error);
  });
  return unsubscribe;
};

export const subscribeToKitchensCount = (callback) => {
  const kitchensCollection = collection(db, 'kitchens');
  const unsubscribe = onSnapshot(kitchensCollection, (snapshot) => {
    callback(snapshot.size);
  }, (error) => {
    console.error('Error subscribing to kitchens count:', error);
  });
  return unsubscribe;
};

export const subscribeToPendingForecastsAdmin = (callback) => {
  const forecastsCollection = collection(db, 'forecasts');
  const q = query(forecastsCollection, where('status', '==', 'Pending'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Error subscribing to pending forecasts (Admin):', error);
  });
  return unsubscribe;
};

export const subscribeToActiveProcurements = (callback) => {
  const procurementCollection = collection(db, 'procurement');
  const q = query(procurementCollection, where('status', '!=', 'Purchased'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Error subscribing to active procurements:', error);
  });
  return unsubscribe;
};

export const subscribeToOngoingKitchenAssignments = (callback) => {
  const kitchenAssignmentsCollection = collection(db, 'kitchenAssignments');
  const q = query(kitchenAssignmentsCollection, where('status', '!=', 'Completed'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Error subscribing to ongoing kitchen assignments:', error);
  });
  return unsubscribe;
};

export const subscribeToAllRoles = (callback) => {
  const rolesCollection = collection(db, 'roles');
  const unsubscribe = onSnapshot(rolesCollection, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error('Error subscribing to all roles:', error);
  });
  return unsubscribe;
};
