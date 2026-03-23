import { useState } from 'react';
import './Auth.css';
import * as authAPI from '../services/api';

const STEPS = [
  { num: '01', title: 'Register your shop',    desc: 'Create your account in seconds.' },
  { num: '02', title: 'Set up your profile',   desc: 'Tell us about your business type.' },
  { num: '03', title: 'Start managing stock',  desc: 'Add products and start billing instantly.' },
];

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', key: '' };
  let score = 0;
  if (password.length >= 8)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;
  if (score <= 1) return { level: 1, label: 'Weak',   key: 'weak'   };
  if (score <= 2) return { level: 2, label: 'Medium', key: 'medium' };
  return           { level: 3, label: 'Strong', key: 'strong' };
}

// Icons
const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

function PasswordStrength({ password }) {
  const { level, label, key } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength__bars">
        {[1,2,3].map(i => (
          <div key={i} className={`auth-strength__bar ${i <= level ? `auth-strength__bar--${key}` : ''}`} />
        ))}
      </div>
      <span className={`auth-strength__label auth-strength__label--${key}`}>{label} password</span>
    </div>
  );
}

function SignupRightPanel() {
  return (
    <div className="auth-brand auth-brand--signup">
      <div className="auth-brand__glow-1" aria-hidden="true" />
      <div className="auth-brand__glow-2" aria-hidden="true" />

      <div className="auth-brand__content">
        <div className="auth-brand__eyebrow">
          <span className="auth-brand__eyebrow-line" />
          Get started for free
        </div>

        <h2 className="auth-brand__headline">
          Your store,<br /><span>fully automated</span>
        </h2>

        <p className="auth-brand__subtext">
          Set up once and StockSense handles billing, stock alerts,
          sales reports, and AI-powered demand forecasting.
        </p>

        <div className="auth-brand__steps">
          {STEPS.map(step => (
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

function SignupForm({ onLoginRedirect }) {
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed,      setAgreed]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const passwordsMatch   = confirmPass.length > 0 && password === confirmPass;
  const passwordMismatch = confirmPass.length > 0 && password !== confirmPass;
  const { level: passStrength } = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim())  return setError('Please enter your full name.');
    if (!email.trim())     return setError('Please enter a valid email address.');
    if (!phone.trim())     return setError('Please enter your phone number.');
    if (passStrength < 2)  return setError('Please use a stronger password.');
    if (!passwordsMatch)   return setError('Passwords do not match.');
    if (!agreed)           return setError('Please agree to the Terms of Service.');

    setLoading(true);
    try {
      // Call tenant registration endpoint
      const res = await authAPI.registerTenant({
        ownerName:  fullName,
        ownerEmail: email,
        ownerPhone: `+91${phone}`,
        password,
        shopName:   fullName + "'s Shop", // temp — wizard will update this
      });

      if (res.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="auth-form-panel auth-form-panel--signup">
        <div className="auth-form-wrapper auth-form-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 className="auth-form__title">Shop registered!</h2>
          <p className="auth-form__subtitle" style={{ marginBottom: 24 }}>
            Your account is ready. Sign in to complete your shop setup.
          </p>
          <button className="auth-submit" onClick={onLoginRedirect}>
            Go to Sign In →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-panel auth-form-panel--signup">
      <div className="auth-form-wrapper auth-form-wrapper--signup auth-form-card">

        <div className="auth-form__logo">
          <div className="auth-form__logo-icon"><BoxIcon /></div>
          <div>
            <span className="auth-form__logo-name">StockSense</span>
            <span className="auth-form__logo-version">Pro · v2.0</span>
          </div>
        </div>

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
          {error && (
            <div className="auth-error" role="alert">
              <AlertIcon />
              <span className="auth-error__text">{error}</span>
            </div>
          )}

          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-fullname">Full Name</label>
              <div className="auth-field__input-wrap">
                <input id="signup-fullname" type="text" className="auth-field__input"
                  placeholder="Ravi Kumar" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name" disabled={loading} required />
                <span className="auth-field__icon"><UserIcon /></span>
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-phone">Phone Number</label>
              <div className="auth-field__phone-wrap">
                <span className="auth-field__prefix">🇮🇳 +91</span>
                <input id="signup-phone" type="tel" className="auth-field__phone-input"
                  placeholder="98765 43210" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  autoComplete="tel" inputMode="numeric" disabled={loading} required />
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-field__label" htmlFor="signup-email">Email Address</label>
            <div className="auth-field__input-wrap">
              <input id="signup-email" type="email" className="auth-field__input"
                placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email" disabled={loading} required />
              <span className="auth-field__icon"><MailIcon /></span>
            </div>
          </div>

          <div className="auth-field-row">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-password">Password</label>
              <div className="auth-field__input-wrap">
                <input id="signup-password" type={showPass ? 'text' : 'password'}
                  className="auth-field__input auth-field__input--password"
                  placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password" disabled={loading} required />
                <span className="auth-field__icon"><LockIcon /></span>
                <button type="button" className="auth-field__toggle"
                  onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="signup-confirm">Confirm Password</label>
              <div className="auth-field__input-wrap">
                <input id="signup-confirm" type={showConfirm ? 'text' : 'password'}
                  className={`auth-field__input auth-field__input--password ${
                    passwordsMatch ? 'auth-field__input--success' :
                    passwordMismatch ? 'auth-field__input--error' : ''}`}
                  placeholder="Re-enter password" value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  autoComplete="new-password" disabled={loading} required />
                <span className="auth-field__icon"><LockIcon /></span>
                <button type="button" className="auth-field__toggle"
                  onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordMismatch && <p className="auth-field__hint auth-field__hint--error">Passwords don't match</p>}
              {passwordsMatch   && <p className="auth-field__hint auth-field__hint--success">✓ Passwords match</p>}
            </div>
          </div>

          <label className="auth-terms">
            <input type="checkbox" className="auth-terms__checkbox"
              checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={loading} />
            <span className="auth-terms__text">
              I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
            </span>
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage({ onLoginRedirect }) {
  return (
    <div className="auth-page">
      <SignupForm onLoginRedirect={onLoginRedirect} />
      <SignupRightPanel />
    </div>
  );
}