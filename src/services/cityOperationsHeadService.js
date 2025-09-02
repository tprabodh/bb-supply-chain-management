
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { formatDate } from '../utils/dateUtils';

const profilesCollection = collection(db, 'profiles');
const dailyTargetsCollection = collection(db, 'dailyTargets');
const cookingAssignmentsCollection = collection(db, 'cookingAssignments');
const vendorsCollection = collection(db, 'vendors');

export const subscribeToZonalHeadsByCityOperationsHead = (cityOperationsHeadId, callback) => {
  try {
    const q = query(profilesCollection, where('role', '==', 'Zonal Head'), where('reportsTo', '==', cityOperationsHeadId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const zonalHeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(zonalHeads);
    }, (error) => {
      console.error('Error subscribing to zonal heads:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription for zonal heads:', error);
    throw error;
  }
};

export const getDailyInsights = async (cityOperationsHeadId) => {
  const today = formatDate(new Date());

  // Step 1: Get the full hierarchy of subordinates
  const allProfilesSnapshot = await getDocs(profilesCollection);
  const allProfiles = allProfilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const getSubordinates = (managerId) => {
    const subordinates = allProfiles.filter(p => p.reportsTo === managerId);
    let allSubordinates = [...subordinates];
    subordinates.forEach(s => {
      allSubordinates = [...allSubordinates, ...getSubordinates(s.id)];
    });
    return allSubordinates;
  };

  const cityOpsHeadSubordinates = getSubordinates(cityOperationsHeadId);
  const teamLeads = cityOpsHeadSubordinates.filter(p => p.role === 'Team Lead');
  const salesExecutives = cityOpsHeadSubordinates.filter(p => p.role === 'Sales Executive');
  const kitchenManagers = allProfiles.filter(p => p.role === 'Kitchen Manager'); // Assuming all kitchen managers are under the city operations head for now

  // Step 2: Fetch all necessary data in parallel
  const dailyTargetsQuery = query(dailyTargetsCollection, where('date', '==', today), where('teamLeadId', 'in', teamLeads.map(tl => tl.id)));
  const cookingAssignmentsQuery = query(cookingAssignmentsCollection, where('date', '==', today));
  const vendorsQuery = query(vendorsCollection, where('email', 'in', salesExecutives.map(se => se.email)));

  const [dailyTargetsSnapshot, cookingAssignmentsSnapshot, vendorsSnapshot] = await Promise.all([
    getDocs(dailyTargetsQuery),
    getDocs(cookingAssignmentsQuery),
    getDocs(vendorsQuery)
  ]);

  const dailyTargets = dailyTargetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const cookingAssignments = cookingAssignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const vendors = vendorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Step 3: Process and structure the data
  const insights = teamLeads.map(tl => {
    const teamLeadDailyTargets = dailyTargets.filter(dt => dt.teamLeadId === tl.id);
    const salesExecutivesForTeamLead = cityOpsHeadSubordinates.filter(p => p.reportsTo === tl.id && p.role === 'Sales Executive');
    const salesExecutiveEmailsForTeamLead = salesExecutivesForTeamLead.map(se => se.email);
    const vendorsForTeamLead = vendors.filter(v => salesExecutiveEmailsForTeamLead.includes(v.email));

    const salesData = vendorsForTeamLead.reduce((acc, vendor) => {
      vendor.menu.forEach(item => {
        acc.stockSold += item.todayStockSold || 0;
        acc.stockBacked += item.stockBacked || 0;
        acc.stockShifted += item.stockShiftedToday || 0;
        acc.stockRemaining += item.stock || 0;
      });
      return acc;
    }, { stockSold: 0, stockBacked: 0, stockShifted: 0, stockRemaining: 0 });

    return {
      teamLead: tl,
      dailyTargets: teamLeadDailyTargets,
      salesData,
    };
  });

  const kitchenInsights = kitchenManagers.map(km => {
    const kitchenAssignments = cookingAssignments.filter(ca => ca.kitchenManagerId === km.id);
    return {
      kitchenManager: km,
      assignments: kitchenAssignments,
    };
  });

  return { insights, kitchenInsights };
};
