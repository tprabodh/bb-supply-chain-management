import { db, auth } from '../firebase';
import { collection, setDoc, getDocs, query, where, doc, updateDoc, getDoc, onSnapshot, addDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

export const createProfile = async (profileData) => {
  try {
    const { email, password, empCode, vendorData, ...restOfProfileData } = profileData;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const batch = writeBatch(db);

    // 1. Create the profile document
    const profileRef = doc(db, 'profiles', uid);
    batch.set(profileRef, { ...restOfProfileData, email, uid, empCode });

    // 2. If it's a Sales Executive, create the vendor document
    if (restOfProfileData.role === 'Sales Executive' && vendorData) {
      const recipesSnapshot = await getDocs(collection(db, 'recipes'));
      const menuItems = recipesSnapshot.docs.map(doc => ({
        ...doc.data(),
        stock: 0,
        date: Timestamp.now(),
      }));

      const vendorRef = doc(db, 'vendors', uid);
      batch.set(vendorRef, {
        ...vendorData,
        uid,
        empCode, // Add empCode here
        uniqueId: Math.floor(100000 + Math.random() * 900000).toString(),
        managerId: null,
        menu: menuItems,
      });
    }

    await batch.commit();

    console.log('Document(s) written with ID: ', uid);
    return uid;
  } catch (e) {
    console.error('Error adding document(s): ', e);
    throw e;
  }
};

export const subscribeToProfiles = (callback) => {
  try {
    const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(profiles);
    }, (error) => {
      console.error('Error subscribing to profiles:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for profiles:', error);
    throw error;
  }
};

export const getProfileById = async (id) => {
  try {
    const docRef = doc(db, 'profiles', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (e) {
    console.error('Error getting document: ', e);
    throw e;
  }
};

export const getProfilesByIds = async (ids) => {
  try {
    const profiles = [];
    for (const id of ids) {
        const profile = await getProfileById(id);
        if (profile) {
            profiles.push(profile);
        }
    }
    return profiles;
  } catch (e) {
    console.error('Error getting documents by ids: ', e);
    throw e;
  }
};

export const subscribeToProfilesByRole = (role, callback) => {
  try {
    const q = query(collection(db, 'profiles'), where('role', '==', role));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(profiles);
    }, (error) => {
      console.error('Error subscribing to profiles by role:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for profiles by role:', error);
    throw error;
  }
};

export const fetchProfilesByRole = async (role) => {
  try {
    const q = query(collection(db, 'profiles'), where('role', '==', role));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching profiles by role:', e);
    throw e;
  }
};

export const updateProfile = async (id, updatedData) => {
  try {
    const profileRef = doc(db, 'profiles', id);
    await updateDoc(profileRef, updatedData);
    console.log('Document updated with ID: ', id);
  } catch (e) {
    console.error('Error updating document: ', e);
    throw e;
  }
};



export const getSubordinates = (managerId, allProfiles) => {
  const subordinates = [];
  const directSubordinates = allProfiles.filter(p => p.reportsTo === managerId);
  subordinates.push(...directSubordinates);
  directSubordinates.forEach(subordinate => {
    subordinates.push(...getSubordinates(subordinate.id, allProfiles));
  });
  return subordinates;
};