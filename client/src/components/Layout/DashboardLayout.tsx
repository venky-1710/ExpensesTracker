import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatWidget from '../ChatBot/ChatWidget';
import './DashboardLayout.css';

interface Props {
  children: React.ReactNode;
  onLogout: () => void;
}

const DashboardLayout = ({ children, onLogout }: Props) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

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
      <ChatWidget />
    </div>
  );
};

export default DashboardLayout;
