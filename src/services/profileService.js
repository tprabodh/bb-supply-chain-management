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
    const teamLeadsQuery = query(collection(db, 'profiles'), where('role', '==', 'Team Lead'));
    const teamLeadsSnapshot = await getDocs(teamLeadsQuery);

    if (teamLeadsSnapshot.empty) {
      console.warn('No Team Leads found. Sales Executives cannot be assigned.');
      return;
    }

    const teamLeads = teamLeadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort Team Leads by the numerical part of their subrole
    teamLeads.sort((a, b) => {
      const numA = parseInt(a.subrole.split('-').pop());
      const numB = parseInt(b.subrole.split('-').pop());
      return numA - numB;
    });

    let currentTeamLeadIndex = 0;
    let salesExecutivesAssignedToCurrentTL = 0;

    const vendorsCollectionRef = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsCollectionRef);

    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      const vendorEmail = vendorData.email; 

      const qProfile = query(collection(db, 'profiles'), where('email', '==', vendorEmail));
      const profileSnapshot = await getDocs(qProfile);

      // Find the next available Team Lead
      while (currentTeamLeadIndex < teamLeads.length) {
        const teamLeadId = teamLeads[currentTeamLeadIndex].id;
        const salesExecutivesUnderThisTLQuery = query(collection(db, 'profiles'), where('reportsTo', '==', teamLeadId), where('role', '==', 'Sales Executive'));
        const salesExecutivesUnderThisTLSnapshot = await getDocs(salesExecutivesUnderThisTLQuery);
        salesExecutivesAssignedToCurrentTL = salesExecutivesUnderThisTLSnapshot.docs.length;

        if (salesExecutivesAssignedToCurrentTL < 25) {
          break; // Found an available Team Lead
        } else {
          currentTeamLeadIndex++; // Move to the next Team Lead
        }
      }

      if (currentTeamLeadIndex >= teamLeads.length) {
        console.warn('All Team Leads are full. Cannot assign more Sales Executives.');
        break; // No available Team Leads
      }

      const assignedTeamLeadId = teamLeads[currentTeamLeadIndex].id;

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
          reportsTo: assignedTeamLeadId,
          // No password or Firebase Auth user creation for these profiles
        };
        // Directly add to profiles collection without Firebase Auth user creation
        await addDoc(collection(db, 'profiles'), newProfileData);
        console.log(`Created new Sales Executive profile for ${vendorEmail} under ${teamLeads[currentTeamLeadIndex].subrole}`);
      } else {
        const existingProfile = profileSnapshot.docs[0];
        await updateProfile(existingProfile.id, { reportsTo: assignedTeamLeadId });
        console.log(`Updated existing Sales Executive profile for ${vendorEmail} under ${teamLeads[currentTeamLeadIndex].subrole}`);
      }
      salesExecutivesAssignedToCurrentTL++; // Increment count for the current Team Lead
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