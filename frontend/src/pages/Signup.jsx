// ============================================================
//  Signup.jsx — Signup Page
//  StockSense Pro
//  Mirrored split layout: left form + right brand panel
// ============================================================

import { useState } from 'react';
import './Auth.css';
import * as authAPI from '../services/api';

// ── Constants (easy to update) ─────────────────────────────
const ROLES = [
  {
    id:   'admin',
    icon: '🛡️',
    name: 'Admin',
    desc: 'Full access — manage users, settings & reports',
  },
  {
    id:   'cashier',
    icon: '🧾',
    name: 'Cashier',
    desc: 'Billing & inventory access only',
  },
];

const STEPS = [
  {
    num:   '01',
    title: 'Create your account',
    desc:  'Fill in your details and choose your role to get started.',
  },
  {
    num:   '02',
    title: 'Set up your store',
    desc:  'Add products, configure your inventory and payment methods.',
  },
  {
    num:   '03',
    title: 'Start billing instantly',
    desc:  'Generate bills, track stock and let AI predict demand.',
  },
];

// ── Password strength helper ───────────────────────────────
function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', key: '' };
  let score = 0;
  if (password.length >= 8)                    score++;
  if (/[A-Z]/.test(password))                  score++;
  if (/[0-9]/.test(password))                  score++;
  if (/[^A-Za-z0-9]/.test(password))           score++;

  if (score <= 1) return { level: 1, label: 'Weak',   key: 'weak'   };
  if (score <= 2) return { level: 2, label: 'Medium', key: 'medium' };
  return           { level: 3, label: 'Strong', key: 'strong' };
}

// ── SVG Icons ──────────────────────────────────────────────
const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const StoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Password Strength Bar ─────────────────────────────────
function PasswordStrength({ password }) {
  const { level, label, key } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="auth-strength">
      <div className="auth-strength__bars">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`auth-strength__bar ${
              i <= level ? `auth-strength__bar--${key}` : ''
            }`}
          />
        ))}
      </div>
      <span className={`auth-strength__label auth-strength__label--${key}`}>
        {label} password
      </span>
    </div>
  );
}

// ── Right Brand Panel ─────────────────────────────────────
function SignupRightPanel() {
  return (
    <div className="auth-brand auth-brand--signup">
      <div className="auth-brand auth-brand--signup__grid" aria-hidden="true" />
      <div className="auth-brand auth-brand--signup__glow-1" aria-hidden="true" />
      <div className="auth-brand auth-brand--signup__glow-2" aria-hidden="true" />

      <div className="auth-brand auth-brand--signup__content">
        <div className="auth-brand auth-brand--signup__eyebrow">
          <span className="auth-brand auth-brand--signup__eyebrow-line" />
          Get started for free
        </div>

        <h2 className="auth-brand auth-brand--signup__headline">
          Your store,<br />
          <span>fully automated</span>
        </h2>

        <p className="auth-brand auth-brand--signup__subtext">
          Set up once and StockSense handles billing, stock alerts,
          sales reports, and AI-powered demand forecasting — all in one place.
        </p>

        <div className="auth-brand auth-brand--signup__steps">
          {STEPS.map((step) => (
            <div className="auth-step" key={step.num}>
              <div className="auth-step__num">{step.num}</div>
              <div className="auth-step__text">
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Signup Form ───────────────────────────────────────────
function SignupForm({ onSignup, onLoginRedirect }) {
  // ── State ───────────────────────────────────────────────
  const [role,        setRole]        = useState('admin');
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [shopName,    setShopName]    = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed,      setAgreed]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  // ── Field-level validation ──────────────────────────────
  const passwordsMatch = confirmPass.length > 0 && password === confirmPass;
  const passwordMismatch = confirmPass.length > 0 && password !== confirmPass;
  const { level: passStrength } = getPasswordStrength(password);

  // ── Submit ───────────────────────────────────────────────
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Validation
  if (!fullName.trim())   return setError('Please enter your full name.');
  if (!email.trim())      return setError('Please enter a valid email address.');
  if (!phone.trim())      return setError('Please enter your phone number.');
  if (!shopName.trim())   return setError('Please enter your shop or store name.');
  if (passStrength < 2)   return setError('Please use a stronger password (min 8 chars, 1 uppercase, 1 number).');
  if (!passwordsMatch)    return setError('Passwords do not match.');
  if (!agreed)            return setError('Please agree to the Terms of Service to continue.');

  setLoading(true);

  try {
    const res = await onSignup({ fullName, email, phone, shopName, password, role });
    // Show success message
    setError('');
    alert('Account created! Please check your email to verify your account.');
  } catch (err) {
    setError(err.message || 'Registration failed. Please try again.');
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="auth-form-panel auth-form-panel--signup">
      <div className="auth-form-wrapper">

        {/* Logo */}
        <div className="auth-form__logo">
          <div className="auth-form__logo-icon">
            <BoxIcon />
          </div>
          <div>
            <span className="auth-form__logo-name">StockSense</span>
            <span className="auth-form__logo-version">Pro · v2.0</span>
          </div>
        </div>

        {/* Header */}
        <div className="auth-form__header">
          <h2 className="auth-form__title">Create account</h2>
          <p className="auth-form__subtitle">
            Already have an account?{' '}
            <a href="#login" onClick={(e) => { e.preventDefault(); onLoginRedirect?.(); }}>
              Sign in
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Step 1: Role selector ─────────────────── */}
          <div className="auth-role-selector">
            <span className="auth-role-selector__label">I am a</span>
            <div className="auth-role-cards" role="group" aria-label="Select role">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`auth-role-card ${role === r.id ? 'auth-role-card--active' : ''}`}
                  onClick={() => setRole(r.id)}
                  aria-pressed={role === r.id}
                >
                  <div className="auth-role-card__check">
                    <span className="auth-role-card__check-dot">
                      {role === r.id && <CheckIcon />}
                    </span>
                  </div>
                  <span className="auth-role-card__icon">{r.icon}</span>
                  <span className="auth-role-card__name">{r.name}</span>
                  <span className="auth-role-card__desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-error" role="alert">
              <AlertIcon />
              <span className="auth-error__text">{error}</span>
            </div>
          )}

          {/* ── Full name + Shop name row ─────────────── */}
          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-fullname">
                Full Name
              </label>
              <div className="auth-field__input-wrap">
                <input
                  id="signup-fullname"
                  type="text"
                  className="auth-field__input"
                  placeholder="Ravi Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                  required
                />
                <span className="auth-field__icon"><UserIcon /></span>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-shop">
                Shop / Store Name
              </label>
              <div className="auth-field__input-wrap">
                <input
                  id="signup-shop"
                  type="text"
                  className="auth-field__input"
                  placeholder="Ravi General Store"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  autoComplete="organization"
                  disabled={loading}
                  required
                />
                <span className="auth-field__icon"><StoreIcon /></span>
              </div>
            </div>
          </div>

          {/* ── Email ────────────────────────────────── */}
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="signup-email">
              Email Address
            </label>
            <div className="auth-field__input-wrap">
              <input
                id="signup-email"
                type="email"
                className="auth-field__input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
              <span className="auth-field__icon"><MailIcon /></span>
            </div>
          </div>

          {/* ── Phone ────────────────────────────────── */}
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="signup-phone">
              Phone Number
            </label>
            <div className="auth-field__phone-wrap">
              <span className="auth-field__prefix">🇮🇳 +91</span>
              <input
                id="signup-phone"
                type="tel"
                className="auth-field__phone-input"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoComplete="tel"
                inputMode="numeric"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* ── Password + Confirm row ────────────────── */}
          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-password">
                Password
              </label>
              <div className="auth-field__input-wrap">
                <input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  className="auth-field__input auth-field__input--password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <span className="auth-field__icon"><LockIcon /></span>
                <button
                  type="button"
                  className="auth-field__toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-confirm">
                Confirm Password
              </label>
              <div className="auth-field__input-wrap">
                <input
                  id="signup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-field__input auth-field__input--password ${
                    passwordsMatch   ? 'auth-field__input--success' :
                    passwordMismatch ? 'auth-field__input--error'   : ''
                  }`}
                  placeholder="Re-enter password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <span className="auth-field__icon"><LockIcon /></span>
                <button
                  type="button"
                  className="auth-field__toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordMismatch && (
                <p className="auth-field__hint auth-field__hint--error">
                  Passwords don't match
                </p>
              )}
              {passwordsMatch && (
                <p className="auth-field__hint auth-field__hint--success">
                  ✓ Passwords match
                </p>
              )}
            </div>
          </div>

          {/* ── Terms ────────────────────────────────── */}
          <label className="auth-terms">
            <input
              type="checkbox"
              className="auth-terms__checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={loading}
            />
            <span className="auth-terms__text">
              I agree to the{' '}
              <a href="#terms">Terms of Service</a>
              {' '}and{' '}
              <a href="#privacy">Privacy Policy</a>
            </span>
          </label>

          {/* ── Submit ───────────────────────────────── */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>

        </form>
      </div>
    </div>
  );
}

// ── Page Export ────────────────────────────────────────────
export default function SignupPage({ onSignup, onLoginRedirect }) {
  return (
    <div className="auth-page">
      <SignupForm onSignup={onSignup} onLoginRedirect={onLoginRedirect} />
      <SignupRightPanel />
    </div>
  );
}