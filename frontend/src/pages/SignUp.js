import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import './Login.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignUp = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const errors = {};

    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';

    if (!form.username.trim()) {
      errors.username = 'Username is required.';
    } else if (form.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await register(
        form.firstName.trim(),
        form.lastName.trim(),
        form.username.trim(),
        form.email.trim(),
        form.password
      );
      navigate('/login', { state: { justRegistered: true } });
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to create account. Please try again.';
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
          <h2>Start building<br />your decks today.</h2>
          <p>
            Create a free account to organize knowledge into decks, study with
            flashcards, and track your progress.
          </p>
          <ul className="login-showcase-list">
            <li>Organize knowledge into decks &amp; cards</li>
            <li>Track your decks from one dashboard</li>
            <li>Tune your experience in Settings</li>
          </ul>
        </div>

        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <h1>Create your account</h1>
          <p className="login-subtitle">It only takes a minute.</p>

          <label htmlFor="firstName">First name</label>
          <div className={`login-field ${fieldErrors.firstName ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">👤</span>
            <input
              id="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange('firstName')}
              autoComplete="given-name"
            />
          </div>
          {fieldErrors.firstName && <span className="field-error">{fieldErrors.firstName}</span>}

          <label htmlFor="lastName">Last name</label>
          <div className={`login-field ${fieldErrors.lastName ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">👤</span>
            <input
              id="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange('lastName')}
              autoComplete="family-name"
            />
          </div>
          {fieldErrors.lastName && <span className="field-error">{fieldErrors.lastName}</span>}

          <label htmlFor="username">Username</label>
          <div className={`login-field ${fieldErrors.username ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">@</span>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              autoComplete="username"
            />
          </div>
          {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}

          <label htmlFor="email">Email</label>
          <div className={`login-field ${fieldErrors.email ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">@</span>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
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
              value={form.password}
              onChange={handleChange('password')}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

          <label htmlFor="confirmPassword">Confirm password</label>
          <div className={`login-field ${fieldErrors.confirmPassword ? 'login-field-invalid' : ''}`}>
            <span className="login-field-icon" aria-hidden="true">&#128274;</span>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              autoComplete="new-password"
            />
          </div>
          {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" disabled={loading}>
            {loading && <span className="login-spinner" aria-hidden="true" />}
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="login-alt-action">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
