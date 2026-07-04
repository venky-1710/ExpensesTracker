import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Hero from './pages/Hero';
import SignUp from './components/SignUp/SignUp';
import UserDetails from './components/UserDetails/UserDetails';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import CalendarView from './pages/CalendarView';
import Profile from './pages/Profile';
import DetailView from './pages/DetailView';
import NotificationsPage from './pages/NotificationsPage';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
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
      <AuthProvider>
        <DashboardProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Hero />} />
            <Route path="/login" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signin" />} />
            <Route path="/signup" element={<SignUp onLoginSuccess={handleLoginSuccess} initialMode="signup" />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

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

          <Route path="/calendar" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <CalendarView />
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

          <Route path="/user-details" element={<Navigate to="/dashboard" replace />} />

          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <DashboardLayout onLogout={handleLogout}>
                <NotificationsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
        </DashboardProvider>
      </AuthProvider>
      <ToastContainer />
    </Router>
  );
}

export default App;
