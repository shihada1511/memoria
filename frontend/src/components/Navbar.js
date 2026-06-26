import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import './Navbar.css';

const initials = (user) => {
  if (!user) return '?';
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
};

const Navbar = ({ user, onLoggedOut }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onLoggedOut();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">M</span>
        Memoria
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="navbar-link-icon" aria-hidden="true">🗂️</span>
          Dashboard
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="navbar-link-icon" aria-hidden="true">📊</span>
          Statistics
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="navbar-link-icon" aria-hidden="true">⚙️</span>
          Settings
        </NavLink>
        {['admin', 'manager'].includes(user?.userRole) && (
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="navbar-link-icon" aria-hidden="true">🛡️</span>
            Manage Users
          </NavLink>
        )}
      </div>

      <div className="navbar-user">
        {user && (
          <div className="navbar-profile">
            <span className="navbar-avatar">{initials(user)}</span>
            <div className="navbar-profile-text">
              <span className="navbar-username">{user.username || `${user.firstName} ${user.lastName}`}</span>
              <span className="navbar-role">{user.userRole}</span>
            </div>
          </div>
        )}
        <button className="navbar-logout" onClick={handleLogout}>
          <span aria-hidden="true">⎋</span> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
