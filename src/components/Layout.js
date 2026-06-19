import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import './Layout.css';

const Layout = ({ user, onLoggedOut }) => (
  <div className="layout">
    <Navbar user={user} onLoggedOut={onLoggedOut} />
    <main className="layout-content">
      <Outlet />
    </main>
    <Footer />
  </div>
);

export default Layout;
