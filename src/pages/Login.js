import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToProfiles, getProfileById } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { query, collection, where, getDocs } from "firebase/firestore";
import { db } from '../firebase';

const Login = () => {
  const [profiles, setProfiles] = useState([]);
  const [empCode, setEmpCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'profiles'), where('empCode', '==', empCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found');
      }

      const selectedProfile = querySnapshot.docs[0].data();
      
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, selectedProfile.email, password);
      const user = userCredential.user;
      const profile = await getProfileById(user.uid);
      login(profile);
      navigate('/dashboard');
      toast.success('Login successful!');
    } catch (error) {
      setError('Invalid employee code or password');
      toast.error('Invalid employee code or password');
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
            <label htmlFor="empCode" className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
            <input id="empCode" name="empCode" type="text" value={empCode} onChange={(e) => setEmpCode(e.target.value)} required className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:ring-[#f56703] focus:border-[#f56703] sm:text-sm transition duration-150 ease-in-out" />
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