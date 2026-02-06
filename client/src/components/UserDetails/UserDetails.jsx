import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './UserDetails.css';
import { config } from '../../config';

const UserDetails = ({ onLogout }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const serverURL = config.SERVER_URL; // Backend URL

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${serverURL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(response.data);
      } catch (error) {
        toast.error('Failed to fetch user details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return <div className="user-details">Loading...</div>;
  }

  return (
    <div className="user-details">
      <h1>Welcome, {user?.username}!</h1>
      <div className="user-info">
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default UserDetails;
