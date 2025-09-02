import React, { useState, useEffect } from 'react';
import { reportingStructure } from '../utils/reportingStructure';

const ProfileDetailsModal = ({ profile, allProfiles, onClose, onSave }) => {
  const [formData, setFormData] = useState(profile);
  const [allowedManagers, setAllowedManagers] = useState([]);

  useEffect(() => {
    setFormData(profile);

    // Determine the allowed manager roles based on the current profile's role
    const allowedManagerRoles = reportingStructure[profile.role] || [];
    
    // Filter the list of all profiles to get the allowed managers
    const managers = allProfiles.filter(p => allowedManagerRoles.includes(p.role) && p.id !== profile.id);
    setAllowedManagers(managers);

  }, [profile, allProfiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" id="email" name="email" value={formData.email} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <input type="text" id="role" name="role" value={formData.role} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" />
          </div>
          <div>
            <label htmlFor="subrole" className="block text-sm font-medium text-gray-700">Subrole</label>
            <input type="text" id="subrole" name="subrole" value={formData.subrole} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" />
          </div>
          <div>
            <label htmlFor="empCode" className="block text-sm font-medium text-gray-700">Employee Code</label>
            <input type="text" id="empCode" name="empCode" value={formData.empCode} readOnly className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100" />
          </div>
          <div>
            <label htmlFor="reportsTo" className="block text-sm font-medium text-gray-700">Reports To</label>
            <select id="reportsTo" name="reportsTo" value={formData.reportsTo} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              <option value="">None</option>
              {allowedManagers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.subrole})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileDetailsModal;