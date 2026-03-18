// ============================================================
//  Settings.jsx — Settings Module
//  StockSense Pro
// ============================================================

import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getMe, changePassword } from '../../services/api';
import './Settings.css';

// ── Helpers ──────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Save to localStorage (since we removed settings table) ───
const getStoreSetting  = (key, def) => localStorage.getItem(`ss_${key}`) || def;
const saveStoreSetting = (key, val) => localStorage.setItem(`ss_${key}`, val);

// ══════════════════════════════════════════════════════════
//  SECTION: STORE INFORMATION
// ══════════════════════════════════════════════════════════
function StoreInformation() {
  const [form, setForm] = useState({
    storeName:    getStoreSetting('storeName',    'StockSense Pro Store'),
    address:      getStoreSetting('address',      ''),
    phone:        getStoreSetting('phone',        ''),
    email:        getStoreSetting('email',        ''),
    gstin:        getStoreSetting('gstin',        ''),
    city:         getStoreSetting('city',         ''),
    state:        getStoreSetting('state',        ''),
    pincode:      getStoreSetting('pincode',      ''),
  });
  const [saved, setSaved] = useState(false);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([k, v]) => saveStoreSetting(k, v));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="settings-grid">
        <div className="settings-field settings-field--full">
          <label className="settings-label">Store Name</label>
          <input className="settings-input" value={form.storeName}
            onChange={e => set('storeName', e.target.value)}
            placeholder="StockSense Pro Store" />
        </div>
        <div className="settings-field settings-field--full">
          <label className="settings-label">Address</label>
          <textarea className="settings-input settings-textarea" value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="123 Main Market, City" rows={2} />
        </div>
        <div className="settings-field">
          <label className="settings-label">City</label>
          <input className="settings-input" value={form.city}
            onChange={e => set('city', e.target.value)} placeholder="Varanasi" />
        </div>
        <div className="settings-field">
          <label className="settings-label">State</label>
          <input className="settings-input" value={form.state}
            onChange={e => set('state', e.target.value)} placeholder="Uttar Pradesh" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Pincode</label>
          <input className="settings-input" value={form.pincode}
            onChange={e => set('pincode', e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="221001" inputMode="numeric" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Phone</label>
          <input className="settings-input" value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
            placeholder="9876543210" inputMode="numeric" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Email</label>
          <input className="settings-input" type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="store@gmail.com" />
        </div>
        <div className="settings-field">
          <label className="settings-label">GSTIN</label>
          <input className="settings-input" value={form.gstin}
            onChange={e => set('gstin', e.target.value.toUpperCase())}
            placeholder="07AABCT1234A1Z5" />
          <span className="settings-hint">Appears on tax invoices</span>
        </div>
      </div>
      <div className="settings-footer">
        {saved && <span className="settings-saved">✅ Saved successfully</span>}
        <button type="submit" className="settings-btn settings-btn--primary">
          <Icon name="check" size={15} /> Save Store Info
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  SECTION: BILLING SETTINGS
// ══════════════════════════════════════════════════════════
function BillingSettings() {
  const [form, setForm] = useState({
    currency:       getStoreSetting('currency',       'INR'),
    currencySymbol: getStoreSetting('currencySymbol', '₹'),
    taxName:        getStoreSetting('taxName',        'GST'),
    invoicePrefix:  getStoreSetting('invoicePrefix',  'INV'),
    lowStockAlert:  getStoreSetting('lowStockAlert',  'true') === 'true',
  });
  const [saved, setSaved] = useState(false);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([k, v]) => saveStoreSetting(k, String(v)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="settings-grid">
        <div className="settings-field">
          <label className="settings-label">Currency</label>
          <select className="settings-input" value={form.currency}
            onChange={e => set('currency', e.target.value)}>
            <option value="INR">INR — Indian Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <div className="settings-field">
          <label className="settings-label">Currency Symbol</label>
          <input className="settings-input" value={form.currencySymbol}
            onChange={e => set('currencySymbol', e.target.value)}
            placeholder="₹" maxLength={3} />
        </div>
        <div className="settings-field">
          <label className="settings-label">Tax Name</label>
          <input className="settings-input" value={form.taxName}
            onChange={e => set('taxName', e.target.value)}
            placeholder="GST" />
          <span className="settings-hint">Shown on invoices (GST, VAT, Tax)</span>
        </div>
        <div className="settings-field">
          <label className="settings-label">Invoice Prefix</label>
          <input className="settings-input" value={form.invoicePrefix}
            onChange={e => set('invoicePrefix', e.target.value.toUpperCase())}
            placeholder="INV" maxLength={10} />
          <span className="settings-hint">e.g. INV → INV-20260318-0001</span>
        </div>
      </div>

      {/* Toggle */}
      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-label">Low Stock Alerts</div>
          <div className="settings-toggle-desc">Show warning when product stock falls below minimum level</div>
        </div>
        <label className="settings-toggle">
          <input type="checkbox" checked={form.lowStockAlert}
            onChange={e => set('lowStockAlert', e.target.checked)} />
          <span className="settings-toggle__track">
            <span className="settings-toggle__thumb" />
          </span>
        </label>
      </div>

      <div className="settings-footer">
        {saved && <span className="settings-saved">✅ Saved successfully</span>}
        <button type="submit" className="settings-btn settings-btn--primary">
          <Icon name="check" size={15} /> Save Billing Settings
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  SECTION: MY ACCOUNT
// ══════════════════════════════════════════════════════════
function MyAccount({ user }) {
  const [profile,      setProfile]      = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords,    setPasswords]    = useState({ current: '', newPass: '', confirm: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [passSaved,    setPassSaved]    = useState(false);
  const [passError,    setPassError]    = useState('');
  const [saving,       setSaving]       = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    if (passwords.newPass.length < 6)              return setPassError('New password must be at least 6 characters.');
    if (passwords.newPass !== passwords.confirm)   return setPassError('Passwords do not match.');
    try {
      setSaving(true);
      await changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
      setPassSaved(true);
      setPasswords({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPassSaved(false), 2500);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-account">
      {/* Profile Info */}
      <div className="settings-card">
        <div className="settings-card__header">
          <h3>Profile Information</h3>
          <p>Update your display name and phone number</p>
        </div>
        <div className="settings-profile-avatar">
          <div className="settings-avatar">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="settings-avatar-name">{user?.name}</div>
            <div className="settings-avatar-role">{user?.role} · {user?.email}</div>
          </div>
        </div>
        <div className="settings-grid">
          <div className="settings-field">
            <label className="settings-label">Full Name</label>
            <input className="settings-input" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Your name" />
          </div>
          <div className="settings-field">
            <label className="settings-label">Phone</label>
            <input className="settings-input" value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
              placeholder="9876543210" inputMode="numeric" />
          </div>
        </div>
        <div className="settings-footer">
          {profileSaved && <span className="settings-saved">✅ Profile updated</span>}
        </div>
      </div>

      {/* Change Password */}
      <div className="settings-card">
        <div className="settings-card__header">
          <h3>Change Password</h3>
          <p>Use a strong password with letters, numbers and symbols</p>
        </div>
        <form onSubmit={handlePasswordChange}>
          <div className="settings-grid">
            <div className="settings-field settings-field--full">
              <label className="settings-label">Current Password</label>
              <input className="settings-input" type="password"
                value={passwords.current} placeholder="Enter current password"
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div className="settings-field">
              <label className="settings-label">New Password</label>
              <input className="settings-input" type="password"
                value={passwords.newPass} placeholder="Min 6 characters"
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} />
            </div>
            <div className="settings-field">
              <label className="settings-label">Confirm New Password</label>
              <input className="settings-input" type="password"
                value={passwords.confirm} placeholder="Re-enter new password"
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            </div>
          </div>
          {passError  && <div className="settings-error">{passError}</div>}
          {passSaved  && <div className="settings-saved" style={{ marginTop: '0.5rem' }}>✅ Password changed successfully</div>}
          <div className="settings-footer">
            <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
              <Icon name="check" size={15} />
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SECTION: ABOUT
// ══════════════════════════════════════════════════════════
function About() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(d => setBackendStatus(d.success ? 'online' : 'offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const rows = [
    { label: 'App Name',        value: 'StockSense Pro'    },
    { label: 'Version',         value: 'v2.0.0'            },
    { label: 'Frontend',        value: 'React + Vite'      },
    { label: 'Backend',         value: 'Node.js + Express' },
    { label: 'Database',        value: 'MySQL'             },
    { label: 'Environment',     value: import.meta.env.MODE || 'development' },
    { label: 'API URL',         value: API_URL             },
  ];

  return (
    <div className="settings-about">
      {/* Backend Status */}
      <div className={`settings-status-card settings-status-card--${backendStatus}`}>
        <div className="settings-status-card__dot" />
        <div>
          <div className="settings-status-card__title">
            Backend Server — {backendStatus === 'online' ? '✅ Connected' : backendStatus === 'checking' ? '⏳ Checking...' : '❌ Offline'}
          </div>
          <div className="settings-status-card__url">{API_URL}</div>
        </div>
      </div>

      {/* Info Table */}
      <div className="settings-card">
        <div className="settings-card__header">
          <h3>System Information</h3>
        </div>
        <div className="settings-info-table">
          {rows.map(({ label, value }) => (
            <div key={label} className="settings-info-row">
              <span className="settings-info-label">{label}</span>
              <span className="settings-info-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className="settings-credits">
        <p>Built with ❤️ using React, Node.js, Express and MySQL</p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.78rem' }}>
          StockSense Pro © {new Date().getFullYear()} — All rights reserved
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN SETTINGS
// ══════════════════════════════════════════════════════════
const TABS = [
  { id: 'store',    label: 'Store Info',       icon: 'manufacturers' },
  { id: 'billing',  label: 'Billing',          icon: 'billing'       },
  { id: 'account',  label: 'My Account',       icon: 'customers'     },
  { id: 'about',    label: 'About',            icon: 'settings'      },
];

export default function Settings({ user }) {
  const [activeTab, setActiveTab] = useState('store');

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1>Settings</h1>
        <p>Manage your store configuration and account preferences</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {TABS.map(tab => (
            <button key={tab.id}
              className={`settings-sidebar__item ${activeTab === tab.id ? 'settings-sidebar__item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <Icon name={tab.icon} size={17} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-main">
          {activeTab === 'store'   && <StoreInformation />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'account' && <MyAccount user={user} />}
          {activeTab === 'about'   && <About />}
        </div>
      </div>
    </div>
  );
}