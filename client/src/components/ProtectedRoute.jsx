import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { config } from '../config';
import Loader from './Loader/Loader';

const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const serverURL = config.SERVER_URL;

    useEffect(() => {
        const checkAuth = async () => {
            // Minimum loading time of 1500ms
            const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
            const token = localStorage.getItem('token');
            let authSuccess = false;

            if (token) {
                try {
                    await axios.get(`${serverURL}/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    authSuccess = true;
                } catch (error) {
                    authSuccess = false;
                }
            }

            // Wait for both the auth check and the minimum time
            await minLoadTime;
            setIsAuthenticated(authSuccess);
        };

        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <Loader />;
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
