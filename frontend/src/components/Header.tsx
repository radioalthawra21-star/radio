import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">Payroll Management System</h1>
        <nav className="header-nav">
          <button className="btn-user">Admin User</button>
        </nav>
      </div>
    </header>
  );
};

export default Header;