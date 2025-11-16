import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const MainLayout = ({ children }) => {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main-content">
        <Header />
        {children}
      </div>
    </div>
  );
};

export default MainLayout;