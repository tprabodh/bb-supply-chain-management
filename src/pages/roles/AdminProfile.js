import React, { useState, useEffect } from 'react';
import { createProfile, subscribeToProfiles } from '../../services/profileService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase';
import { generateEmpCode } from '../../utils/empCodeGenerator';
import { reportingStructure } from '../../utils/reportingStructure';

const AdminProfile = () => {
  const roles = [
    'Admin',
    'Business Head',
    'City operations Head',
    'Zonal Head',
    'Team Lead',
    'Sales Executive',
    'Logistics Manager',
    'Finance and Accounts',
    'HR & Training',
    'Procurement Manager',
    'Kitchen Manager',
    'Stock Manager',
  ];

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    aadharNumber: '',
    role: roles[0],
    password: '',
    reportsTo: '',
    empCode: '',
  });
  const [profiles, setProfiles] = useState([]);
  const [allowedManagers, setAllowedManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToProfiles((fetchedProfiles) => {
      setProfiles(fetchedProfiles);
    }, (err) => {
      console.error('Error subscribing to profiles:', err);
      toast.error('Error loading profiles.');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const allowedManagerRoles = reportingStructure[formData.role] || [];
    const managers = profiles.filter(p => allowedManagerRoles.includes(p.role));
    setAllowedManagers(managers);
    // Reset reportsTo if the selected manager is no longer valid
    if (!managers.find(m => m.id === formData.reportsTo)) {
      setFormData(prev => ({ ...prev, reportsTo: '' }));
    }
  }, [formData.role, profiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'profiles'), where('role', '==', formData.role));
      const querySnapshot = await getDocs(q);
      const subrole = `${formData.role}-${querySnapshot.docs.length + 1}`;
      const empCode = generateEmpCode(profiles, formData.role, formData.reportsTo);
      const { password, ...profileData } = formData;
      await createProfile({ ...profileData, subrole, empCode, password });
      setFormData({
        name: '',
        address: '',
        phoneNumber: '',
        email: '',
        aadharNumber: '',
        role: roles[0],
        password: '',
        reportsTo: '',
        empCode: '',
      });
      toast.success('Profile created successfully!');
    } catch (error) {
      setError('Error creating profile. Please try again.');
      toast.error('Error creating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-8">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center tracking-tight">Create New User Profile</h1>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input id="address" name="address" type="text" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
            <div>
              <label htmlFor="aadharNumber" className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
              <input id="aadharNumber" name="aadharNumber" type="text" value={formData.aadharNumber} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out appearance-none bg-white pr-8">
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reportsTo" className="block text-sm font-medium text-gray-700 mb-1">Reports To</label>
              <select id="reportsTo" name="reportsTo" value={formData.reportsTo} onChange={handleChange} className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out appearance-none bg-white pr-8">
                <option value="">None</option>
                {allowedManagers.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} ({profile.subrole})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5">
            {loading ? 'Creating...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;