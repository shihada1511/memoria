import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../services/settingsService';
import { changePassword } from '../services/authService';
import './Settings.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '🖥️' },
];

const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase();

const PasswordInput = ({ id, label, value, onChange, error, autoComplete }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className={`settings-field ${error ? 'settings-field-invalid' : ''}`}>
        <span className="settings-field-icon" aria-hidden="true">🔒</span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="settings-field-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
    </>
  );
};

const Settings = ({ onUserUpdated }) => {
  const [form, setForm] = useState({ username: '', email: '', theme: 'light' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const settings = await getSettings();
        if (!cancelled) {
          setForm(settings);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Failed to load settings.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const selectTheme = (value) => {
    setForm((prev) => ({ ...prev, theme: value }));
  };

  const validate = () => {
    const errors = {};

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

    if (!THEMES.some((t) => t.value === form.theme)) {
      errors.theme = 'Choose a valid theme.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters.';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (!validatePasswordForm()) {
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to update password.';
      setPasswordStatus({ type: 'error', message });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings(form);
      setForm(updated);
      onUserUpdated?.(updated);
      setStatus({ type: 'success', message: 'Settings saved successfully.' });
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to save settings.';
      setStatus({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-hero">
          <span className="settings-hero-eyebrow">Settings</span>
          <h1>Profile &amp; preferences</h1>
          <p className="settings-subtitle">Loading your settings...</p>
        </div>
        <div className="settings-skeleton" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-hero">
        <span className="settings-hero-eyebrow">Settings</span>
        <h1>Profile &amp; preferences</h1>
        <p className="settings-subtitle">Update your account details and how Memoria looks for you.</p>
      </div>

      <div className="settings-layout">
        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <h2>Account</h2>

          <label htmlFor="username">Username</label>
          <div className={`settings-field ${fieldErrors.username ? 'settings-field-invalid' : ''}`}>
            <span className="settings-field-icon" aria-hidden="true">👤</span>
            <input id="username" type="text" value={form.username} onChange={handleChange('username')} />
          </div>
          {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}

          <label htmlFor="email">Email</label>
          <div className={`settings-field ${fieldErrors.email ? 'settings-field-invalid' : ''}`}>
            <span className="settings-field-icon" aria-hidden="true">@</span>
            <input id="email" type="email" value={form.email} onChange={handleChange('email')} />
          </div>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

          <label>Theme preference</label>
          <div className="theme-options" role="radiogroup" aria-label="Theme preference">
            {THEMES.map((theme) => (
              <button
                type="button"
                key={theme.value}
                className={`theme-option ${form.theme === theme.value ? 'theme-option-selected' : ''}`}
                onClick={() => selectTheme(theme.value)}
                role="radio"
                aria-checked={form.theme === theme.value}
              >
                <span className="theme-option-icon">{theme.icon}</span>
                {theme.label}
              </button>
            ))}
          </div>
          {fieldErrors.theme && <span className="field-error">{fieldErrors.theme}</span>}

          {status.message && (
            <div className={status.type === 'success' ? 'settings-success' : 'settings-error'}>
              {status.message}
            </div>
          )}

          <button type="submit" className="settings-submit" disabled={saving}>
            {saving && <span className="settings-spinner" aria-hidden="true" />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        <aside className="settings-preview">
          <div className="settings-avatar">{initials(form.username)}</div>
          <h3>{form.username || 'Your profile'}</h3>
          <p className="settings-preview-email">{form.email || 'No email set'}</p>
          <div className="settings-preview-theme">
            <span>{THEMES.find((t) => t.value === form.theme)?.icon ?? '☀️'}</span>
            {THEMES.find((t) => t.value === form.theme)?.label ?? 'Light'} theme
          </div>
        </aside>
      </div>

      <div className="settings-layout">
        <form className="settings-form" onSubmit={handlePasswordSubmit} noValidate>
          <h2>Change password</h2>
          <p className="settings-form-hint">Use the eye icon to reveal a field while you type.</p>

          <PasswordInput
            id="currentPassword"
            label="Current password"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange('currentPassword')}
            error={passwordErrors.currentPassword}
            autoComplete="current-password"
          />

          <PasswordInput
            id="newPassword"
            label="New password"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange('newPassword')}
            error={passwordErrors.newPassword}
            autoComplete="new-password"
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm new password"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange('confirmPassword')}
            error={passwordErrors.confirmPassword}
            autoComplete="new-password"
          />

          {passwordStatus.message && (
            <div className={passwordStatus.type === 'success' ? 'settings-success' : 'settings-error'}>
              {passwordStatus.message}
            </div>
          )}

          <button type="submit" className="settings-submit" disabled={changingPassword}>
            {changingPassword && <span className="settings-spinner" aria-hidden="true" />}
            {changingPassword ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <aside className="settings-preview settings-preview-tip">
          <div className="settings-tip-icon" aria-hidden="true">🛡️</div>
          <h3>Keep your account secure</h3>
          <p>Choose a password that's at least 6 characters and unique to Memoria. You'll need your current password to set a new one.</p>
        </aside>
      </div>
    </div>
  );
};

export default Settings;
