
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { subscribeToAllRoles } from '../../services/adminService';
import { subscribeToProfiles } from '../../services/profileService';

const AdminInput = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [subrole, setSubrole] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let unsubscribeRoles;
    let unsubscribeProfiles;

    const setupSubscriptions = () => {
      setLoading(true);
      try {
        unsubscribeRoles = subscribeToAllRoles((fetchedRoles) => {
          setRoles(fetchedRoles.map(r => r.id)); // Assuming role ID is the role name
          // setLoading(false); // Don't set loading to false yet, wait for all subscriptions
        }, (err) => {
          setError('Failed to subscribe to roles.');
          console.error('Error subscribing to roles:', err);
          setLoading(false);
        });

        unsubscribeProfiles = subscribeToProfiles((fetchedUsers) => {
          setUsers(fetchedUsers);
          setLoading(false); // Set loading to false after all data is loaded
        }, (err) => {
          setError('Failed to subscribe to profiles.');
          console.error('Error subscribing to profiles:', err);
          setLoading(false);
        });

      } catch (err) {
        setError('Error setting up subscriptions.');
        console.error('Error setting up subscriptions:', err);
        setLoading(false);
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeRoles) unsubscribeRoles();
      if (unsubscribeProfiles) unsubscribeProfiles();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Create profile document in Firestore
      await addDoc(collection(db, 'profiles'), {
        uid,
        name,
        email,
        role,
        subrole: subrole || null,
        reportsTo: reportsTo || null,
        createdAt: new Date(),
      });

      setSuccess('User profile created successfully!');
      setName('');
      setEmail('');
      setPassword('');
      setRole('');
      setSubrole('');
      setReportsTo('');
      // Re-fetch users to update the reportsTo dropdown
      // This is handled by the real-time listener now
    } catch (err) {
      setError(`Failed to create user: ${err.message}`);
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Create New User Profile</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        {error && <p className="text-red-500">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
          <select
            id="role"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Select a Role</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subrole" className="block text-sm font-medium text-gray-700">Subrole (Optional)</label>
          <input
            type="text"
            id="subrole"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={subrole}
            onChange={(e) => setSubrole(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reportsTo" className="block text-sm font-medium text-gray-700">Reports To (Optional)</label>
          <select
            id="reportsTo"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={reportsTo}
            onChange={(e) => setReportsTo(e.target.value)}
          >
            <option value="">Select a Manager</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
};

export default AdminInput;
