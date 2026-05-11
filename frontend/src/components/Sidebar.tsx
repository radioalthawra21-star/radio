import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/workflow', label: 'Workflow Management', icon: '🔄' },
    { path: '/policies', label: 'Policies & Procedures', icon: '📋' },
    { path: '/audit', label: 'Internal Controls & Audit', icon: '🔒' },
    { path: '/integrations', label: 'Technical Integration', icon: '⚙️' },
    { path: '/reports', label: 'Reports & Analytics', icon: '📈' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Payroll Menu</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;