import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiCreditCard, FiUser, FiSettings,
  FiLogOut, FiMenu, FiX, FiSun, FiMoon, FiCalendar, FiBell
} from 'react-icons/fi';
import { notificationService } from '../../services/notificationService';
import './Sidebar.css';

interface Props {
  onLogout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  badge?: number;
}

const Sidebar = ({ onLogout, isCollapsed, toggleSidebar }: Props) => {
  const [theme, setTheme]           = useState<string>(localStorage.getItem('theme') || 'light');
  const [unreadCount, setUnreadCount] = useState(0);
  const location  = useLocation();
  const navigate  = useNavigate();

  // Fetch unread count for sidebar badge
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await notificationService.getNotifications();
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 45000);

    // Also listen to the calendar event creation signal
    const handler = () => setTimeout(fetchCount, 2000);
    window.addEventListener('calendar:eventCreated', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('calendar:eventCreated', handler);
    };
  }, []);

  const menuItems: MenuItem[] = [
    { path: '/dashboard',     icon: FiHome,       label: 'Dashboard' },
    { path: '/transactions',  icon: FiCreditCard, label: 'Transactions' },
    { path: '/calendar',      icon: FiCalendar,   label: 'Calendar' },
    { path: '/notifications', icon: FiBell,       label: 'Notifications', badge: unreadCount },
    { path: '/profile',       icon: FiUser,       label: 'Profile' },
    { path: '/settings',      icon: FiSettings,   label: 'Settings' },
  ];

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

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
            style={{ position: 'relative' }}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <item.icon className="nav-icon" size={20} />
              {isCollapsed && item.badge != null && item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-6px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '9999px',
                  fontSize: '9px',
                  fontWeight: 700,
                  minWidth: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1,
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
            {!isCollapsed && item.badge != null && item.badge > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="footer-btn theme-toggle"
          onClick={toggleTheme}
          title={isCollapsed ? 'Toggle Theme' : ''}
        >
          {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
          {!isCollapsed && <span>Toggle Theme</span>}
        </button>

        <button
          className="footer-btn logout-btn"
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <FiLogOut size={20} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
