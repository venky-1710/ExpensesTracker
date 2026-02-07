import React from 'react';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DashboardLayout = ({ children, onLogout }) => {
    return (
        <div className="dashboard-layout">
            <Sidebar onLogout={onLogout} />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
