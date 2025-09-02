import { doc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { generateEmpCode, roleAbbreviations } from '../utils/empCodeGenerator';

const getManagerCode = (profiles, managerId) => {
  if (!managerId) return '';
  const manager = profiles.find(p => p.id === managerId);
  return manager ? manager.empCode : '';
};

export const updateEmployeeReportsTo = async (employeeId, newManagerId, allProfiles) => {
  await runTransaction(db, async (transaction) => {
    const employeeRef = doc(db, 'profiles', employeeId);
    const employeeDoc = await transaction.get(employeeRef);

    if (!employeeDoc.exists()) {
      throw new Error('Employee not found!');
    }

    const employeeData = employeeDoc.data();
    const oldManagerId = employeeData.reportsTo;

    // 1. Update the moved employee's reportsTo and generate new empCode
    const newEmpCode = generateEmpCode(allProfiles, employeeData.role, newManagerId);
    transaction.update(employeeRef, { 
      reportsTo: newManagerId,
      empCode: newEmpCode,
    });

    // 2. Reorder the employees under the old manager
    if (oldManagerId) {
      const oldSiblingsQuery = query(
        collection(db, 'profiles'),
        where('reportsTo', '==', oldManagerId),
        where('role', '==', employeeData.role)
      );
      const oldSiblingsSnapshot = await getDocs(oldSiblingsQuery);
      const oldSiblings = oldSiblingsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.id !== employeeId) // Exclude the moved employee
        .sort((a, b) => {
          // Sort by the numerical part of their empCode to maintain original order
          const aNum = parseInt(a.empCode.split(roleAbbreviations[a.role]).pop(), 10);
          const bNum = parseInt(b.empCode.split(roleAbbreviations[b.role]).pop(), 10);
          return aNum - bNum;
        });

      for (let i = 0; i < oldSiblings.length; i++) {
        const sibling = oldSiblings[i];
        const siblingRef = doc(db, 'profiles', sibling.id);
        
        // Manually construct the new empCode based on its new position
        const managerCode = getManagerCode(allProfiles, oldManagerId);
        const newNumber = i + 1;
        const newSiblingEmpCode = `${managerCode}${roleAbbreviations[sibling.role]}${newNumber}`;

        transaction.update(siblingRef, { 
          empCode: newSiblingEmpCode,
        });
      }
    }
  });
};