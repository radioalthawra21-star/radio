import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

const MainLayout: React.FC = ({ children }) => {
  return (
    <div className="main-layout">
      <Header />
      <div className="content">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;