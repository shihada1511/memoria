import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ManageUsers from './pages/ManageUsers';
import Stats from './pages/Stats';
import { getCurrentUser, isAuthenticated } from './services/authService';

const App = () => {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const preference = user?.theme || 'system';
      const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
      document.documentElement.setAttribute('data-theme', resolved);
    };

    applyTheme();

    const handleSystemChange = () => {
      if ((user?.theme || 'system') === 'system') applyTheme();
    };
    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, [user]);

  useEffect(() => {
    const restoreSession = async () => {
      if (isAuthenticated()) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          setUser(null);
        }
      }
      setCheckingSession(false);
    };

    restoreSession();
  }, []);

  if (checkingSession) {
    return <p style={{ padding: 28 }}>Loading Memoria...</p>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLoggedIn={setUser} />}
      />

      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <SignUp />}
      />

      <Route
        element={user ? <Layout user={user} onLoggedOut={() => setUser(null)} /> : <Navigate to="/login" replace />}
      >
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings onUserUpdated={(updated) => setUser((prev) => ({ ...prev, ...updated }))} />} />
        <Route
          path="/admin/users"
          element={
            ['admin', 'manager'].includes(user?.userRole)
              ? <ManageUsers currentUser={user} />
              : <Navigate to="/dashboard" replace />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;
