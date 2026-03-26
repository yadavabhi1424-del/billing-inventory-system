import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import {
  getMe, changePassword, updateMyProfile,
  getShopProfile, saveShopProfile, getShopTypes,
} from '../../services/api';
import UserManagement from '../Users/UserManagement';
import './Settings.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getLocal = (key, def) => localStorage.getItem(`ss_${key}`) || def;
const saveLocal = (key, val) => localStorage.setItem(`ss_${key}`, val);

const INVENTORY_TYPES = [
  { key: 'FINISHED', label: 'Finished Goods', desc: 'Items ready for sale' },
  { key: 'RAW', label: 'Raw Materials', desc: 'Base materials for production' },
  { key: 'COMPONENT', label: 'Components & Parts', desc: 'Sub-assemblies used in products' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

// ══════════════════════════════════════════════════════════
//  SHOP PROFILE
// ══════════════════════════════════════════════════════════
function ShopProfile() {
  const [shopTypes, setShopTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shop_name: '',
    shop_type: '',
    shop_description: '',
    inventory_types: ['FINISHED'],
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    address: '',
    gstin: '',
  });

  useEffect(() => {
    Promise.all([getShopProfile(), getShopTypes()])
      .then(([profileRes, typesRes]) => {
        if (profileRes.data) {
          const p = profileRes.data;
          setForm({
            shop_name: p.shop_name || '',
            shop_type: p.shop_type || '',
            shop_description: p.shop_description || '',
            inventory_types: typeof p.inventory_types === 'string'
              ? JSON.parse(p.inventory_types)
              : p.inventory_types || ['FINISHED'],
            currency: p.currency || 'INR',
            timezone: p.timezone || 'Asia/Kolkata',
            address: p.address || '',
            gstin: p.gstin || '',
          });
        }
        setShopTypes(typesRes.data || []);
      })
      .catch(() => setError('Failed to load shop profile.'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleInventoryType = (key) => {
    setForm(f => ({
      ...f,
      inventory_types: f.inventory_types.includes(key)
        ? f.inventory_types.filter(t => t !== key)
        : [...f.inventory_types, key],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.shop_name || !form.shop_type)
      return setError('Shop name and type are required.');
    setSaving(true); setError('');
    try {
      await saveShopProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading shop profile...</div>;

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="settings-section-title">Basic Information</div>
      <div className="settings-grid">
        <div className="settings-field settings-field--full">
          <label className="settings-label">Shop Name *</label>
          <input className="settings-input" value={form.shop_name}
            onChange={e => update('shop_name', e.target.value)}
            placeholder="e.g. Ramesh Electronics" />
        </div>
        <div className="settings-field settings-field--full">
          <label className="settings-label">Description</label>
          <textarea className="settings-input settings-textarea"
            value={form.shop_description}
            onChange={e => update('shop_description', e.target.value)}
            placeholder="Briefly describe your business..." rows={2} />
        </div>
        <div className="settings-field">
          <label className="settings-label">Address</label>
          <input className="settings-input" value={form.address}
            onChange={e => update('address', e.target.value)}
            placeholder="Shop address" />
        </div>
        <div className="settings-field">
          <label className="settings-label">GSTIN</label>
          <input className="settings-input" value={form.gstin}
            onChange={e => update('gstin', e.target.value.toUpperCase())}
            placeholder="07AABCT1234A1Z5" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Currency</label>
          <select className="settings-input" value={form.currency}
            onChange={e => update('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="settings-field">
          <label className="settings-label">Timezone</label>
          <select className="settings-input" value={form.timezone}
            onChange={e => update('timezone', e.target.value)}>
            {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="settings-section-title">Shop Type *</div>
      <div className="settings-type-grid">
        {shopTypes.map(type => (
          <div key={type.type_key}
            className={`settings-type-card ${form.shop_type === type.type_key ? 'active' : ''}`}
            onClick={() => update('shop_type', type.type_key)}>
            <div className="settings-type-icon">{type.icon}</div>
            <div className="settings-type-name">{type.display_name}</div>
            <div className="settings-type-desc">{type.description}</div>
          </div>
        ))}
      </div>

      <div className="settings-section-title">Inventory Types</div>
      <div className="settings-inv-grid">
        {INVENTORY_TYPES.map(type => (
          <div key={type.key}
            className={`settings-inv-card ${form.inventory_types.includes(type.key) ? 'active' : ''}`}
            onClick={() => toggleInventoryType(type.key)}>
            {form.inventory_types.includes(type.key) && (
              <div className="settings-inv-check">✓</div>
            )}
            <div className="settings-inv-name">{type.label}</div>
            <div className="settings-inv-desc">{type.desc}</div>
          </div>
        ))}
      </div>

      {error && <div className="settings-error">{error}</div>}
      <div className="settings-footer">
        {saved && <span className="settings-saved">✅ Shop profile saved</span>}
        <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
          <Icon name="check" size={15} />
          {saving ? 'Saving...' : 'Save Shop Profile'}
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  BILLING SETTINGS
// ══════════════════════════════════════════════════════════
function BillingSettings() {
  const [form, setForm] = useState({
    currency: getLocal('currency', 'INR'),
    currencySymbol: getLocal('currencySymbol', '₹'),
    taxName: getLocal('taxName', 'GST'),
    invoicePrefix: getLocal('invoicePrefix', 'INV'),
    lowStockAlert: getLocal('lowStockAlert', 'true') === 'true',
  });
  const [saved, setSaved] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([k, v]) => saveLocal(k, String(v)));
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
            onChange={e => set('taxName', e.target.value)} placeholder="GST" />
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

      <div className="settings-toggle-row">
        <div>
          <div className="settings-toggle-label">Low Stock Alerts</div>
          <div className="settings-toggle-desc">Show warning when stock falls below minimum</div>
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
        {saved && <span className="settings-saved">✅ Saved</span>}
        <button type="submit" className="settings-btn settings-btn--primary">
          <Icon name="check" size={15} /> Save Billing Settings
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  MY ACCOUNT
// ══════════════════════════════════════════════════════════
function MyAccount({ user }) {
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [passSaved, setPassSaved] = useState(false);
  const [passError, setPassError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    try {
      await updateMyProfile(profile);

      // Update localStorage so app reflects new name
      const savedUser = JSON.parse(localStorage.getItem('stocksense_user') || '{}');
      savedUser.name = profile.name;
      savedUser.phone = profile.phone;
      localStorage.setItem('stocksense_user', JSON.stringify(savedUser));

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error(err.message);
    }
  };
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');
    if (passwords.newPass.length < 6) return setPassError('Min 6 characters.');
    if (passwords.newPass !== passwords.confirm) return setPassError('Passwords do not match.');
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
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="9876543210" inputMode="numeric" />
          </div>
        </div>
        <div className="settings-footer">
          {profileSaved && <span className="settings-saved">✅ Profile updated</span>}
          <button type="button" className="settings-btn settings-btn--primary"
            onClick={handleProfileSave}>
            <Icon name="check" size={15} /> Save Profile
          </button>
        </div>
      </div>

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
              <label className="settings-label">Confirm Password</label>
              <input className="settings-input" type="password"
                value={passwords.confirm} placeholder="Re-enter new password"
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            </div>
          </div>
          {passError && <div className="settings-error">{passError}</div>}
          {passSaved && <div className="settings-saved" style={{ marginTop: '0.5rem' }}>✅ Password changed</div>}
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
//  INVENTORY PREFERENCES
// ══════════════════════════════════════════════════════════
function InventoryPreferences() {
  const [form, setForm] = useState({
    defaultUnit: getLocal('defaultUnit', 'pcs'),
    lowStockThreshold: getLocal('lowStockThreshold', '10'),
    defaultTaxRate: getLocal('defaultTaxRate', '18'),
    defaultTaxType: getLocal('defaultTaxType', 'GST'),
    barcodeFormat: getLocal('barcodeFormat', 'CODE128'),
  });
  const [saved, setSaved] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([k, v]) => saveLocal(k, String(v)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="settings-grid">
        <div className="settings-field">
          <label className="settings-label">Default Unit</label>
          <select className="settings-input" value={form.defaultUnit}
            onChange={e => set('defaultUnit', e.target.value)}>
            {['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'dozen', 'meter', 'feet'].map(u =>
              <option key={u} value={u}>{u}</option>
            )}
          </select>
        </div>
        <div className="settings-field">
          <label className="settings-label">Default Low Stock Threshold</label>
          <input className="settings-input" type="number" value={form.lowStockThreshold}
            onChange={e => set('lowStockThreshold', e.target.value)} min={1} placeholder="10" />
          <span className="settings-hint">Alert when stock falls below this</span>
        </div>
        <div className="settings-field">
          <label className="settings-label">Default Tax Rate (%)</label>
          <input className="settings-input" type="number" value={form.defaultTaxRate}
            onChange={e => set('defaultTaxRate', e.target.value)} min={0} max={100} placeholder="18" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Default Tax Type</label>
          <select className="settings-input" value={form.defaultTaxType}
            onChange={e => set('defaultTaxType', e.target.value)}>
            {['GST', 'VAT', 'TAX', 'NONE'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="settings-field">
          <label className="settings-label">Barcode Format</label>
          <select className="settings-input" value={form.barcodeFormat}
            onChange={e => set('barcodeFormat', e.target.value)}>
            {['CODE128', 'EAN13', 'EAN8', 'QR', 'UPC'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div className="settings-footer">
        {saved && <span className="settings-saved">✅ Saved</span>}
        <button type="submit" className="settings-btn settings-btn--primary">
          <Icon name="check" size={15} /> Save Preferences
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════════
function Notifications() {
  const [form, setForm] = useState({
    lowStockEmail: getLocal('notif_lowStockEmail', 'true') === 'true',
    lowStockInApp: getLocal('notif_lowStockInApp', 'true') === 'true',
    aiRestockReminder: getLocal('notif_aiRestock', 'true') === 'true',
    weeklyReport: getLocal('notif_weeklyReport', 'false') === 'true',
    newUserAlert: getLocal('notif_newUserAlert', 'true') === 'true',
  });
  const [saved, setSaved] = useState(false);
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = (e) => {
    e.preventDefault();
    Object.entries(form).forEach(([k, v]) => saveLocal(`notif_${k}`, String(v)));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggles = [
    { key: 'lowStockEmail', label: 'Low Stock Email Alerts', desc: 'Get emailed when products run low' },
    { key: 'lowStockInApp', label: 'Low Stock In-App Alerts', desc: 'Show badge on inventory icon' },
    { key: 'aiRestockReminder', label: 'AI Restock Reminders', desc: 'AI notifies when to reorder based on predictions' },
    { key: 'weeklyReport', label: 'Weekly Sales Report', desc: 'Receive weekly summary every Monday' },
    { key: 'newUserAlert', label: 'New Member Alert', desc: 'Alert when a new team member is added' },
  ];

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <div className="settings-toggles-list">
        {toggles.map(t => (
          <div className="settings-toggle-row" key={t.key}>
            <div>
              <div className="settings-toggle-label">{t.label}</div>
              <div className="settings-toggle-desc">{t.desc}</div>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" checked={form[t.key]}
                onChange={e => set(t.key, e.target.checked)} />
              <span className="settings-toggle__track">
                <span className="settings-toggle__thumb" />
              </span>
            </label>
          </div>
        ))}
      </div>
      <div className="settings-footer">
        {saved && <span className="settings-saved">✅ Saved</span>}
        <button type="submit" className="settings-btn settings-btn--primary">
          <Icon name="check" size={15} /> Save Notifications
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
//  ABOUT
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
    { label: 'App Name', value: 'StockSense Pro' },
    { label: 'Version', value: 'v2.0.0' },
    { label: 'Frontend', value: 'React + Vite' },
    { label: 'Backend', value: 'Node.js + Express' },
    { label: 'Database', value: 'MySQL' },
    { label: 'Environment', value: import.meta.env.MODE || 'development' },
    { label: 'API URL', value: API_URL },
  ];

  return (
    <div className="settings-about">
      <div className={`settings-status-card settings-status-card--${backendStatus}`}>
        <div className="settings-status-card__dot" />
        <div>
          <div className="settings-status-card__title">
            Backend — {backendStatus === 'online' ? '✅ Connected' : backendStatus === 'checking' ? '⏳ Checking...' : '❌ Offline'}
          </div>
          <div className="settings-status-card__url">{API_URL}</div>
        </div>
      </div>
      <div className="settings-card">
        <div className="settings-card__header"><h3>System Information</h3></div>
        <div className="settings-info-table">
          {rows.map(({ label, value }) => (
            <div key={label} className="settings-info-row">
              <span className="settings-info-label">{label}</span>
              <span className="settings-info-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
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
  { id: 'shop', label: 'Shop Profile', icon: 'manufacturers' },
  { id: 'billing', label: 'Billing', icon: 'billing' },
  { id: 'account', label: 'My Account', icon: 'customers' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory' },
  { id: 'notif', label: 'Notifications', icon: 'dashboard' },
  { id: 'about', label: 'About', icon: 'settings' },
];

export default function Settings({ user }) {
  const [activeTab, setActiveTab] = useState('shop');

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1>Settings</h1>
        <p>Manage your shop configuration and preferences</p>
      </div>

      <div className="settings-layout">
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

        <div className="settings-main">
          {activeTab === 'shop' && <ShopProfile />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'account' && <MyAccount user={user} />}
          {activeTab === 'team' && <UserManagement user={user} />}
          {activeTab === 'inventory' && <InventoryPreferences />}
          {activeTab === 'notif' && <Notifications />}
          {activeTab === 'about' && <About />}
        </div>
      </div>
    </div>
  );
}