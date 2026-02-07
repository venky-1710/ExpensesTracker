import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Hero from './pages/Hero';
import SignUp from "./components/SignUp/SignUp.jsx";
import UserDetails from "./components/UserDetails/UserDetails.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./components/Layout/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Profile from "./pages/Profile.jsx";
import DetailView from "./pages/DetailView.jsx";
import { DashboardProvider } from "./context/DashboardContext.jsx";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <DashboardProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signin" />} />
          <Route path="/signup" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signup" />} />

          {/* Protected Routes with Dashboard Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/transactions" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <Transactions />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard/details/:type" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <DetailView />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Legacy route - redirect to dashboard */}
          <Route path="/user-details" element={<Navigate to="/dashboard" replace />} />

          {/* Settings placeholder */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </DashboardProvider>
      <ToastContainer />
    </Router>
  );
}

export default App;
