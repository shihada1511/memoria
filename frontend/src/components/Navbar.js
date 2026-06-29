import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import { getIncomingRequests, respondToRequest } from '../services/shareService';
import { connectSocket } from '../services/socketService';
import './Navbar.css';

const initials = (user) => {
  if (!user) return '?';
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
};

const Navbar = ({ user, onLoggedOut }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    getIncomingRequests().then(setRequests).catch(() => {});

    const socket = connectSocket();
    socket.emit('identify', { userId: user.userId });

    const handleNewRequest = (data) => {
      setRequests(prev => {
        const exists = prev.some(r => r.id === data.request.id);
        if (exists) return prev;
        return [...prev, { ...data.request, deck: data.deck, requester: data.requester }];
      });
    };
    socket.on('new-request', handleNewRequest);

    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowRequests(false);
      }
    };
    document.addEventListener('mousedown', handleClick);

    return () => {
      socket.off('new-request', handleNewRequest);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [user]);

  const handleRespond = async (requestId, action) => {
    try {
      await respondToRequest(requestId, action);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch {}
  };

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
        <NavLink to="/discover" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="navbar-link-icon" aria-hidden="true">🔍</span>
          Discover
        </NavLink>
        <NavLink to="/study" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="navbar-link-icon" aria-hidden="true">📊</span>
          Study Stats
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
        <div className="navbar-bell" ref={bellRef}>
          <button
            className="navbar-bell-btn"
            onClick={() => setShowRequests(v => !v)}
            title="Deck requests"
          >
            🔔
            {requests.length > 0 && (
              <span className="navbar-bell-badge">{requests.length}</span>
            )}
          </button>

          {showRequests && (
            <div className="navbar-requests-dropdown">
              <div className="navbar-requests-title">Deck Requests</div>
              {requests.length === 0 ? (
                <div className="navbar-requests-empty">No pending requests</div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="navbar-request-item">
                    <div className="navbar-request-info">
                      <strong>{req.requester?.username || req.requester?.firstName}</strong> wants access to <strong>{req.deck?.title}</strong>
                    </div>
                    <div className="navbar-request-btns">
                      <button className="navbar-req-accept" onClick={() => handleRespond(req.id, 'accept')} title="Accept">✓</button>
                      <button className="navbar-req-reject" onClick={() => handleRespond(req.id, 'reject')} title="Reject">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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
