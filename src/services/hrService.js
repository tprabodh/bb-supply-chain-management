
import { db } from '../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { subscribeToTeamLeadsByZonalHead } from './zonalHeadService';
import { subscribeToSalesExecutivesByTeamLead, getVendorUidByEmail, getSalesDataByVendorUid } from './salesService';

const profilesCollection = collection(db, 'profiles');

export const getSalesDataForEmployee = async (employee) => {
    let salesData = null;

    if (employee.role === 'Sales Executive') {
        const vendorUid = await getVendorUidByEmail(employee.email);
        if (vendorUid) {
            salesData = await getSalesDataByVendorUid(vendorUid);
        }
    } else if (employee.role === 'Team Lead') {
        const qSalesExecutives = query(profilesCollection, where('role', '==', 'Sales Executive'), where('reportsTo', '==', employee.id));
        const salesExecutivesSnapshot = await getDocs(qSalesExecutives);
        const salesExecutives = salesExecutivesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const salesDataPromises = salesExecutives.map(async (se) => {
            const vendorUid = await getVendorUidByEmail(se.email);
            if (vendorUid) {
                return await getSalesDataByVendorUid(vendorUid);
            }
            return null;
        });
        const allSalesData = await Promise.all(salesDataPromises);
        // a simple merge of all sales data
        salesData = allSalesData.reduce((acc, data) => ({ ...acc, ...data }), {});

    } else if (employee.role === 'Zonal Head') {
        const qTeamLeads = query(profilesCollection, where('role', '==', 'Team Lead'), where('reportsTo', '==', employee.id));
        const teamLeadsSnapshot = await getDocs(qTeamLeads);
        const teamLeads = teamLeadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const teamLeadDataPromises = teamLeads.map(async (tl) => {
            const qSalesExecutives = query(profilesCollection, where('role', '==', 'Sales Executive'), where('reportsTo', '==', tl.id));
            const salesExecutivesSnapshot = await getDocs(qSalesExecutives);
            const salesExecutives = salesExecutivesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const salesDataPromises = salesExecutives.map(async (se) => {
                const vendorUid = await getVendorUidByEmail(se.email);
                if (vendorUid) {
                    return await getSalesDataByVendorUid(vendorUid);
                }
                return null;
            });
            return await Promise.all(salesDataPromises);
        });
        const allTeamLeadData = await Promise.all(teamLeadDataPromises);
        const allSalesData = allTeamLeadData.flat();
        salesData = allSalesData.reduce((acc, data) => ({ ...acc, ...data }), {});
    }

    return salesData;
};
