import { useState } from 'react';
import './Auth.css';
import * as authAPI from '.././services/api';

const FEATURES = [
  { dot: 'indigo', text: 'AI-powered stock prediction with Prophet' },
  { dot: 'violet', text: 'Real-time billing and inventory sync'     },
  { dot: 'cyan',   text: 'Role-based access for your entire team'   },
];

const STATS = [
  { value: '10K+',  label: 'Transactions daily' },
  { value: '99.9%', label: 'Uptime SLA'         },
  { value: '< 2s',  label: 'Bill generation'    },
];

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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

const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

function LoginLeftPanel() {
  return (
    <div className="auth-brand">
      <div className="auth-brand__glow-1" aria-hidden="true" />
      <div className="auth-brand__glow-2" aria-hidden="true" />

      <div className="auth-brand__brand">
        <div className="auth-brand__logo">
          <div className="auth-brand__logo-icon"><BoxIcon /></div>
          <div>
            <span className="auth-brand__logo-name">StockSense</span>
            <span className="auth-brand__logo-version">Pro · v2.0</span>
          </div>
        </div>

        <h1 className="auth-brand__headline">
          Smart Billing &<br />
          <span>Inventory Intelligence</span>
        </h1>
        <p className="auth-brand__subtext">
          One platform to bill faster, manage stock smarter,
          and predict demand before it happens.
        </p>

        <div className="auth-brand__features">
          {FEATURES.map((f, i) => (
            <div className="auth-feature-pill" key={i}>
              <span className={`auth-feature-pill__dot auth-feature-pill__dot--${f.dot}`} />
              <span className="auth-feature-pill__text">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-brand__stats">
        {STATS.map((s, i) => (
          <div className="auth-stat" key={i}>
            <span className="auth-stat__value">{s.value}</span>
            <span className="auth-stat__label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginForm({ onLogin, onSignupRedirect }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim())  return setError('Please enter your email address.');
    if (!password)      return setError('Please enter your password.');
    setLoading(true);
    try {
      const result = await authAPI.login({ email, password });
      if (result.success) {
        onLogin({ ...result.data.user, role: result.data.user.role.toLowerCase() });
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-panel">
      <div className="auth-form-wrapper auth-form-card">

        <div className="auth-form__header">
          <h2 className="auth-form__title">Welcome back</h2>
          <p className="auth-form__subtitle">Sign in to your StockSense account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <AlertIcon />
              <span className="auth-error__text">{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-field__label" htmlFor="login-email">Email address</label>
            <div className="auth-field__input-wrap">
              <input id="login-email" type="email" className="auth-field__input"
                placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" disabled={loading} required />
              <span className="auth-field__icon"><MailIcon /></span>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field__label" htmlFor="login-password">Password</label>
            <div className="auth-field__input-wrap">
              <input id="login-password" type={showPass ? 'text' : 'password'}
                className="auth-field__input auth-field__input--password"
                placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" disabled={loading} required />
              <span className="auth-field__icon"><LockIcon /></span>
              <button type="button" className="auth-field__toggle"
                onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label className="auth-remember">
              <input type="checkbox" className="auth-remember__checkbox"
                checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="auth-remember__text">Remember me</span>
            </label>
            <button type="button" className="auth-forgot">Forgot password?</button>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="auth-form__footer">
          Don&apos;t have an account?{' '}
          <a href="#signup" onClick={(e) => { e.preventDefault(); onSignupRedirect?.(); }}>
            Create one
          </a>
          <br /><br />
          By signing in you agree to our{' '}
          <a href="#terms">Terms of Service</a> and{' '}
          <a href="#privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage({ onLogin, onSignupRedirect }) {
  return (
    <div className="auth-page">
      <LoginLeftPanel />
      <LoginForm onLogin={onLogin} onSignupRedirect={onSignupRedirect} />
    </div>
  );
}