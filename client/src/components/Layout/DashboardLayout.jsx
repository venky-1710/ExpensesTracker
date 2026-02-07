import React, { useState } from 'react';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DashboardLayout = ({ children, onLogout }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`dashboard-layout ${isCollapsed ? 'collapsed' : ''}`}>
            <Sidebar
                onLogout={onLogout}
                isCollapsed={isCollapsed}
                toggleSidebar={toggleSidebar}
            />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
