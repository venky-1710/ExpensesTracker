import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { config } from '../config';
import Loader from './Loader/Loader';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const serverURL = config.SERVER_URL;

  useEffect(() => {
    const checkAuth = async () => {
      const minLoadTime = new Promise<void>(resolve => setTimeout(resolve, 2000));
      const token = localStorage.getItem('token');
      let authSuccess = false;

      if (token) {
        try {
          await axios.get(`${serverURL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          authSuccess = true;
        } catch {
          authSuccess = false;
        }
      }

      await minLoadTime;
      setIsAuthenticated(authSuccess);
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <Loader />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default ProtectedRoute;
