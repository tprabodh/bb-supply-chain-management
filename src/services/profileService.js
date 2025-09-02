import { db, auth } from '../firebase';
import { collection, setDoc, getDocs, query, where, doc, updateDoc, getDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export const createProfile = async (profileData) => {
  try {
    const { email, password, empCode, ...restOfProfileData } = profileData;

    if (restOfProfileData.role === 'Sales Executive') {
      const q = query(collection(db, 'profiles'), where('subrole', '==', 'Team Lead-1'));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const teamLeadId = querySnapshot.docs[0].id;
        restOfProfileData.reportsTo = teamLeadId;
      } else {
        console.warn('Team Lead-1 not found. Sales Executive will not be automatically assigned.');
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const profileRef = doc(db, 'profiles', uid);
    await setDoc(profileRef, { ...restOfProfileData, email, uid, empCode });

    console.log('Document written with ID: ', uid);
    return uid;
  } catch (e) {
    console.error('Error adding document: ', e);
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

export const syncVendorsToSalesExecutives = async () => {
  try {
    const qTeamLead = query(collection(db, 'profiles'), where('subrole', '==', 'Team Lead-1'));
    const querySnapshotTeamLead = await getDocs(qTeamLead);
    if (querySnapshotTeamLead.empty) {
      console.error('Team Lead-1 not found. Cannot migrate vendors.');
      return;
    }
    const teamLeadId = querySnapshotTeamLead.docs[0].id;

    const vendorsCollectionRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsCollectionRef);

    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      const vendorEmail = vendorData.email; 

      const qProfile = query(collection(db, 'profiles'), where('email', '==', vendorEmail));
      const profileSnapshot = await getDocs(qProfile);

      if (profileSnapshot.empty) {
        // Create new profile
        const salesExecutivesQuery = query(collection(db, 'profiles'), where('role', '==', 'Sales Executive'));
        const salesExecutivesSnapshot = await getDocs(salesExecutivesQuery);
        const nextSalesExecutiveNumber = salesExecutivesSnapshot.docs.length + 1;

        const newProfileData = {
          name: vendorData.name || 'N/A',
          email: vendorData.email,
          phoneNumber: vendorData.phoneNumber || 'N/A',
          address: vendorData.businessAddress || 'N/A',
          aadharNumber: vendorData.aadharCardNumber || 'N/A',
          role: 'Sales Executive',
          subrole: `Sales Executive-${nextSalesExecutiveNumber}`, 
          reportsTo: teamLeadId,
          // No password or Firebase Auth user creation for these profiles
        };
        // Directly add to profiles collection without Firebase Auth user creation
        await addDoc(collection(db, 'profiles'), newProfileData);
        console.log(`Created new Sales Executive profile for ${vendorEmail}`);
      } else {
        const existingProfile = profileSnapshot.docs[0];
        await updateProfile(existingProfile.id, { reportsTo: teamLeadId });
        console.log(`Updated existing Sales Executive profile for ${vendorEmail}`);
      }
    }
    console.log('Vendor migration to Sales Executives complete.');
  } catch (e) {
    console.error('Error migrating vendors: ', e);
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