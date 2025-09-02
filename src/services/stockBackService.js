
import { db } from '../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { getSubordinates, subscribeToProfiles } from './profileService';

export const getStockBackDataForTeamLead = async (teamLeadId) => {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeToProfiles(async (profiles) => {
      const subordinates = getSubordinates(teamLeadId, profiles);
      const salesExecutiveEmails = subordinates.filter(p => p.role === 'Sales Executive').map(p => p.email);

      if (salesExecutiveEmails.length === 0) {
        resolve([]);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const vendorsQuery = query(
          collection(db, 'vendors'),
          where('email', 'in', salesExecutiveEmails)
        );

        const querySnapshot = await getDocs(vendorsQuery);
        const stockBackData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(vendor => vendor.menu.some(item => item.stockBacked > 0));
        resolve(stockBackData);
      } catch (error) {
        console.error('Error fetching stock back data:', error);
        reject(error);
      } finally {
        unsubscribe();
      }
    });
  });
};
