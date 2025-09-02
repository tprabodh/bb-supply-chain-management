export const roleAbbreviations = {
  'Admin': 'A',
  'Business Head': 'BH',
  'City operations Head': 'CH',
  'Zonal Head': 'ZH',
  'Team Lead': 'TL',
  'Sales Executive': 'SE',
  'Logistics Manager': 'LM',
  'Finance and Accounts': 'FA',
  'HR & Training': 'HR',
  'Procurement Manager': 'PM',
  'Kitchen Manager': 'KM',
  'Stock Manager': 'SM',
};

const getNextEmpNumber = (profiles, role, reportsTo) => {
  const siblings = profiles.filter(p => p.role === role && p.reportsTo === reportsTo);
  return siblings.length + 1;
};

const getManagerCode = (profiles, managerId) => {
  if (!managerId) return '';
  const manager = profiles.find(p => p.id === managerId);
  return manager ? manager.empCode : '';
};

export const generateEmpCode = (profiles, role, reportsTo) => {
  const roleAbbr = roleAbbreviations[role];
  if (!roleAbbr) {
    throw new Error(`Invalid role: ${role}`);
  }

  if (!reportsTo || ['Admin', 'Business Head', 'City operations Head'].includes(role)) {
    const count = profiles.filter(p => p.role === role).length;
    return `${roleAbbr}${count + 1}`;
  }

  const managerCode = getManagerCode(profiles, reportsTo);
  const nextNum = getNextEmpNumber(profiles, role, reportsTo);

  return `${managerCode}${roleAbbr}${nextNum}`;
};