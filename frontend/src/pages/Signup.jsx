import { useState, useEffect, useRef } from 'react';
import './Auth.css';
import * as authAPI from '../services/api';

const SHOP_STEPS = [
  { num: '01', title: 'Register your shop',   desc: 'Create your account in seconds.' },
  { num: '02', title: 'Set up your profile',  desc: 'Tell us about your business type.' },
  { num: '03', title: 'Start managing stock', desc: 'Add products and start billing instantly.' },
];

const SUPPLIER_STEPS = [
  { num: '01', title: 'Register as supplier', desc: 'Create your supplier account in seconds.' },
  { num: '02', title: 'Set up your catalog',  desc: 'List your products for shops to discover.' },
  { num: '03', title: 'Accept orders',        desc: 'Receive and manage orders from shops.' },
];

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', key: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', key: 'weak' };
  if (score <= 2) return { level: 2, label: 'Medium', key: 'medium' };
  return { level: 3, label: 'Strong', key: 'strong' };
}

// Icons
const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function PasswordStrength({ password }) {
  const { level, label, key } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength__bars">
        {[1, 2, 3].map(i => (
          <div key={i} className={`auth-strength__bar ${i <= level ? `auth-strength__bar--${key}` : ''}`} />
        ))}
      </div>
      <span className={`auth-strength__label auth-strength__label--${key}`}>{label} password</span>
    </div>
  );
}

// ── OTP Verification Step ──────────────────────────────
function OtpStep({ email, onVerified, onLoginRedirect }) {
  const OTP_LENGTH = 6;
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60); // resend cooldown
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigitChange = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = cleaned;
    setDigits(next);
    // Auto-advance
    if (cleaned && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const next = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((ch, i) => { next[i] = ch; });
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      e.preventDefault();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < OTP_LENGTH) return setError('Please enter the complete 6-digit code.');
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp({ email, code });
      if (res.success) onVerified();
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await authAPI.resendOtp({ email });
      setCountdown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-form-panel auth-form-panel--signup">
      <div className="auth-form-wrapper auth-form-card">

        <div className="auth-otp__icon">📬</div>
        <div className="auth-form__header">
          <h2 className="auth-form__title">Check your email</h2>
          <p className="auth-form__subtitle">
            We sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              <AlertIcon />
              <span className="auth-error__text">{error}</span>
            </div>
          )}

          {/* OTP digit inputs */}
          <div className="auth-otp__inputs" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className={`auth-otp__input ${d ? 'auth-otp__input--filled' : ''}`}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                autoFocus={i === 0}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <span className="auth-submit__spinner" aria-hidden="true" />}
            {loading ? 'Verifying…' : 'Verify Email →'}
          </button>
        </form>

        <div className="auth-otp__resend">
          {countdown > 0 ? (
            <span className="auth-otp__resend-timer">Resend code in <strong>{countdown}s</strong></span>
          ) : (
            <button
              type="button"
              className="auth-otp__resend-btn"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        <p className="auth-form__footer" style={{ textAlign: 'center' }}>
          Already verified?{' '}
          <a href="#login" onClick={e => { e.preventDefault(); onLoginRedirect?.(); }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}

// ── Right panel ────────────────────────────────────────
function SignupRightPanel({ userType = 'shop' }) {
  const steps = userType === 'supplier' ? SUPPLIER_STEPS : SHOP_STEPS;
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
          {userType === 'supplier' ? (
            <>Your catalog,<br /><span>fully managed</span></>
          ) : (
            <>Your store,<br /><span>fully automated</span></>
          )}
        </h2>

        <p className="auth-brand__subtext">
          {userType === 'supplier'
            ? 'List products, accept orders from shops, and grow your distribution network with AI-powered forecasting.'
            : 'Set up once and StockSense handles billing, stock alerts, sales reports, and AI-powered demand forecasting.'}
        </p>

        <div className="auth-brand__steps">
          {steps.map(step => (
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

// ── Country Data ──────────────────────────────────────────────
const COUNTRY_CODES = [
  { name: 'India', code: 'IN', dial: '+91', flag: '🇮🇳' },
  { name: 'United States', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: 'AU', dial: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'Germany', code: 'DE', dial: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Japan', code: 'JP', dial: '+81', flag: '🇯🇵' },
  { name: 'China', code: 'CN', dial: '+86', flag: '🇨🇳' },
  { name: 'Brazil', code: 'BR', dial: '+55', flag: '🇧🇷' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'Mexico', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'Russia', code: 'RU', dial: '+7', flag: '🇷🇺' },
  { name: 'Italy', code: 'IT', dial: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'South Korea', code: 'KR', dial: '+82', flag: '🇰🇷' },
  { name: 'Singapore', code: 'SG', dial: '+65', flag: '🇸🇬' },
  { name: 'UAE', code: 'AE', dial: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966', flag: '🇸🇦' }
];

// ── Signup form ────────────────────────────────────────
function SignupForm({ onLoginRedirect, onOtpRequired, onUserTypeChange }) {
  const [userType,  setUserType]  = useState('shop');
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');

  // Phone selection state
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [prefixInput, setPrefixInput] = useState(COUNTRY_CODES[0].dial);
  const [showPrefixDrop, setShowPrefixDrop] = useState(false);
  const [prefixSearch, setPrefixSearch] = useState('');
  const prefixDropRef = useRef(null);

  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = confirmPass.length > 0 && password === confirmPass;
  const passwordMismatch = confirmPass.length > 0 && password !== confirmPass;
  const { level: passStrength } = getPasswordStrength(password);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (prefixDropRef.current && !prefixDropRef.current.contains(e.target)) {
        setShowPrefixDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrefixInputChange = (e) => {
    const val = e.target.value;
    setPrefixInput(val);
    setShowPrefixDrop(true);

    // Auto-detect country from exact dial code typed
    // Filter by elements that have exactly this dial code. Use US as default for +1 over CA initially
    const exactMatch = COUNTRY_CODES.find(c => c.dial === val);
    if (exactMatch) setSelectedCountry(exactMatch);

    setPrefixSearch(val.replace('+', '')); // auto-search the list too
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    setPrefixInput(country.dial);
    setShowPrefixDrop(false);
    setPrefixSearch('');
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Auto-detect if user pasted a number with a country code
    if (val.startsWith('+')) {
      const match = COUNTRY_CODES.find(c => val.startsWith(c.dial));
      if (match) {
        selectCountry(match);
        val = val.substring(match.dial.length);
      } else {
        val = val.replace('+', '');
      }
    }
    // Only keep digits and cap at 15
    setPhone(val.replace(/\D/g, '').slice(0, 15));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter a valid email address.');
    if (!phone.trim()) return setError('Please enter your phone number.');
    if (phone.length < 10) return setError('Phone number must be at least 10 digits.');
    if (passStrength < 2) return setError('Please use a stronger password.');
    if (!passwordsMatch) return setError('Passwords do not match.');
    if (!agreed) return setError('Please agree to the Terms of Service.');

    // Ensure valid prefix
    let finalPrefix = prefixInput;
    if (!finalPrefix.startsWith('+')) finalPrefix = '+' + finalPrefix.replace(/\D/g, '');
    if (finalPrefix === '+') return setError('Please select a valid country code.');

    setLoading(true);
    try {
      const res = await authAPI.signup({
        fullName,
        email,
        phone: `${finalPrefix}${phone}`,
        password,
        userType,
      });
      if (res.success) onOtpRequired(email);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(prefixSearch.toLowerCase()) ||
    c.dial.includes(prefixSearch) ||
    c.code.toLowerCase().includes(prefixSearch.toLowerCase())
  );

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

        {/* ── User Type Toggle ─────────────────────────────── */}
        <div className="auth-usertype-toggle">
          <button
            type="button"
            className={`auth-usertype-btn ${userType === 'shop' ? 'auth-usertype-btn--active' : ''}`}
            onClick={() => { setUserType('shop'); onUserTypeChange?.('shop'); }}
            disabled={loading}
          >
            🏪 I'm a Shop
          </button>
          <button
            type="button"
            className={`auth-usertype-btn ${userType === 'supplier' ? 'auth-usertype-btn--active' : ''}`}
            onClick={() => { setUserType('supplier'); onUserTypeChange?.('supplier'); }}
            disabled={loading}
          >
            🏭 I'm a Supplier
          </button>
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

                {/* Custom Prefix Dropdown */}
                <div className="auth-prefix-selector" ref={prefixDropRef}>
                  <div className="auth-prefix-trigger">
                    <span className="auth-prefix-flag">{selectedCountry?.flag || '🌍'}</span>
                    <input
                      type="text"
                      className="auth-prefix-input"
                      value={prefixInput}
                      onChange={handlePrefixInputChange}
                      onFocus={() => setShowPrefixDrop(true)}
                      placeholder="+91"
                      disabled={loading}
                    />
                  </div>

                  {showPrefixDrop && (
                    <div className="auth-prefix-dropdown">
                      <div className="auth-prefix-search">
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={prefixSearch}
                          onChange={(e) => setPrefixSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="auth-prefix-list">
                        {filteredCountries.map(c => (
                          <div
                            key={c.code}
                            className={`auth-prefix-item ${selectedCountry.code === c.code ? 'active' : ''}`}
                            onClick={() => selectCountry(c)}
                          >
                            <span className="auth-prefix-item-flag">{c.flag}</span>
                            <span className="auth-prefix-item-name">{c.name}</span>
                            <span className="auth-prefix-item-dial">{c.dial}</span>
                          </div>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="auth-prefix-item empty">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <input id="signup-phone" type="tel" className="auth-field__phone-input"
                  placeholder="9876543210" value={phone}
                  onChange={handlePhoneChange}
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
                  className={`auth-field__input auth-field__input--password ${passwordsMatch ? 'auth-field__input--success' :
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
              {passwordsMatch && <p className="auth-field__hint auth-field__hint--success">✓ Passwords match</p>}
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

// ── Page root ──────────────────────────────────────────
export default function SignupPage({ onLoginRedirect }) {
  const [step,     setStep]     = useState('form');
  const [email,    setEmail]    = useState('');
  const [userType, setUserType] = useState('shop');

  const handleOtpRequired = (registeredEmail) => {
    setEmail(registeredEmail);
    setStep('otp');
  };

  const handleVerified = () => { onLoginRedirect?.(); };

  return (
    <div className="auth-page">
      {step === 'form' ? (
        <SignupForm
          onLoginRedirect={onLoginRedirect}
          onOtpRequired={handleOtpRequired}
          onUserTypeChange={setUserType}
        />
      ) : (
        <OtpStep
          email={email}
          onVerified={handleVerified}
          onLoginRedirect={onLoginRedirect}
        />
      )}
      <SignupRightPanel userType={userType} />
    </div>
  );
}