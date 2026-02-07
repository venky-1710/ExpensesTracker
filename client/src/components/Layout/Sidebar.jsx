import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    FiHome,
    FiCreditCard,
    FiUser,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiX,
    FiSun,
    FiMoon
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const location = useLocation();
    const navigate = useNavigate();

    const menuItems = [
        { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
        { path: '/transactions', icon: FiCreditCard, label: 'Transactions' },
        { path: '/profile', icon: FiUser, label: 'Profile' },
        { path: '/settings', icon: FiSettings, label: 'Settings' },
    ];

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="logo-section">
                    {!isCollapsed && <h2 className="app-title">Expense Tracker</h2>}
                    <button className="toggle-btn" onClick={toggleSidebar}>
                        {isCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <item.icon className="nav-icon" size={20} />
                        {!isCollapsed && <span className="nav-label">{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                {/* Theme Toggle */}
                <button
                    className="footer-btn theme-toggle"
                    onClick={toggleTheme}
                    title={isCollapsed ? 'Toggle Theme' : ''}
                >
                    {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
                    {!isCollapsed && <span>Toggle Theme</span>}
                </button>

                {/* Logout */}
                <button
                    className="footer-btn logout-btn"
                    onClick={handleLogout}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <FiLogOut size={20} />
                    {!isCollapsed && <span>Logout</span>}
                </button>

                {/* User Info */}
                {!isCollapsed && (
                    <div className="user-info">
                        <div className="user-avatar">
                            <FiUser size={18} />
                        </div>
                        <div className="user-details">
                            <p className="user-name">{localStorage.getItem('userName') || 'User'}</p>
                            <p className="user-email">{localStorage.getItem('userEmail') || 'user@example.com'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
