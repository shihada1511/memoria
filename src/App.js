import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import { getCurrentUser, isAuthenticated } from './services/authService';

const App = () => {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

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
        element={user ? <Layout user={user} onLoggedOut={() => setUser(null)} /> : <Navigate to="/login" replace />}
      >
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/settings" element={<Settings onUserUpdated={(updated) => setUser((prev) => ({ ...prev, ...updated }))} />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

export default App;
