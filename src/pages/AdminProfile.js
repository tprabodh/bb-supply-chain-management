
import React, { useState } from 'react';

const AdminProfile = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    aadharNumber: '',
    role: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Form data submitted:', formData);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2 style={{ textAlign: 'center' }}>Create Profile</h2>
        <label htmlFor="name">Name:</label>
        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />

        <label htmlFor="address">Address:</label>
        <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required />

        <label htmlFor="phoneNumber">Phone Number:</label>
        <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />

        <label htmlFor="email">Email:</label>
        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />

        <label htmlFor="aadharNumber">Aadhar Number:</label>
        <input type="text" id="aadharNumber" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} required />

        <label htmlFor="role">Role:</label>
        <input type="text" id="role" name="role" value={formData.role} onChange={handleChange} required />

        <label htmlFor="password">Password:</label>
        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />

        <button type="submit" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Create Profile</button>
      </form>
    </div>
  );
};

export default AdminProfile;


