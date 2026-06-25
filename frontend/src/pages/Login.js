import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import './Login.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = ({ onLoggedIn }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = Boolean(location.state?.justRegistered);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      onLoggedIn(user);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Login failed. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-showcase">
          <span className="login-showcase-badge">Memoria</span>
          <h2>Remember more.<br />Forget less.</h2>
          <p>
            Build flashcard decks, track your progress, and turn every study
            session into something that sticks.
          </p>
          <ul className="login-showcase-list">
            <li>Organize knowledge into decks &amp; cards</li>
            <li>Track your decks from one dashboard</li>
            <li>Tune your experience in Settings</li>
          </ul>
        </div>

        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <h1>Welcome back</h1>
          <p className="login-subtitle">Sign in to keep studying your decks.</p>

          {justRegistered && (
            <div className="login-success">Account created! Log in to get started.</div>
          )}

          <label htmlFor="email">Email</label>
          <div className={`login-field ${fieldErrors.email ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">@</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

          <label htmlFor="password">Password</label>
          <div className={`login-field ${fieldErrors.password ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">&#128274;</span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="current-password"
            />
          </div>
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" disabled={loading}>
            {loading && <span className="login-spinner" aria-hidden="true" />}
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="login-alt-action">
            New to Memoria? <Link to="/signup">Create account</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
