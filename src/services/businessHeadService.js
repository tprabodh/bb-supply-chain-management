
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDailyInsights } from './cityOperationsHeadService';

const profilesCollection = collection(db, 'profiles');

export const getBusinessHeadDashboardData = async (businessHeadId) => {
    try {
        const q = query(profilesCollection, where('role', '==', 'City operations Head'), where('reportsTo', '==', businessHeadId));
        const cityOpsHeadsSnapshot = await getDocs(q);
        const cityOpsHeads = cityOpsHeadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const dashboardData = await Promise.all(cityOpsHeads.map(async (coh) => {
            const { insights, kitchenInsights } = await getDailyInsights(coh.id);
            return {
                cityOperationsHead: coh,
                insights,
                kitchenInsights,
            };
        }));

        return dashboardData;
    } catch (error) {
        console.error('Error fetching business head dashboard data:', error);
        throw error;
    }
};
