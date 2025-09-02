import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToProfiles, getProfileById } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [subroles, setSubroles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSubrole, setSelectedSubrole] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const unsubscribe = subscribeToProfiles((fetchedProfiles) => {
      setProfiles(fetchedProfiles);
      const uniqueRoles = [...new Set(fetchedProfiles.map(p => p.role))].filter(role => role !== 'Sales Executive');
      setRoles(uniqueRoles);
    }, (err) => {
      console.error('Error subscribing to profiles:', err);
      toast.error('Error loading profiles for login.');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      const filteredSubroles = profiles.filter(p => p.role === selectedRole).map(p => p.subrole);
      setSubroles(filteredSubroles);
    } else {
      setSubroles([]);
    }
  }, [selectedRole, profiles]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const selectedProfile = profiles.find(p => p.role === selectedRole && p.subrole === selectedSubrole);
      if (!selectedProfile) {
        throw new Error('Profile not found');
      }
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, selectedProfile.email, password);
      const user = userCredential.user;
      const profile = await getProfileById(user.uid);
      login(profile);
      navigate('/dashboard');
      toast.success('Login successful!');
    } catch (error) {
      setError('Invalid role, subrole or password');
      toast.error('Invalid role, subrole or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f56703] to-[#f59e03] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-8 transform transition-all duration-300 hover:scale-105">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 tracking-tight">Welcome Back!</h2>
        <p className="text-center text-gray-600 text-sm">Sign in to your account</p>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select id="role" name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out appearance-none bg-white pr-8">
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="subrole" className="block text-sm font-medium text-gray-700 mb-1">Subrole</label>
            <select id="subrole" name="subrole" value={selectedSubrole} onChange={(e) => setSelectedSubrole(e.target.value)} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out appearance-none bg-white pr-8">
              <option value="">Select a subrole</option>
              {subroles.map((subrole) => (
                <option key={subrole} value={subrole}>
                  {subrole}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out" />
          </div>
          <div>
            <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-[#f56703] hover:bg-[#d95702] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f56703] transition duration-150 ease-in-out transform hover:-translate-y-0.5">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;