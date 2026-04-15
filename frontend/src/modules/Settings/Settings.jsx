import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  const [currOpen, setCurrOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const currRef = useRef(null);
  const tzRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (currRef.current && !currRef.current.contains(e.target)) setCurrOpen(false);
      if (tzRef.current && !tzRef.current.contains(e.target)) setTzOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        <div className={`settings-field settings-dropdown-wrapper ${currOpen ? 'is-open' : ''}`} ref={currRef}>
          <label className="settings-label">Currency</label>
          <div className="settings-input settings-select-trigger" onClick={() => setCurrOpen(o => !o)}>
            <span>{form.currency}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {currOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {CURRENCIES.map(c => (
                  <div key={c} className="settings-dropdown-item" onClick={() => { update('currency', c); setCurrOpen(false); }}>{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={`settings-field settings-dropdown-wrapper ${tzOpen ? 'is-open' : ''}`} ref={tzRef}>
          <label className="settings-label">Timezone</label>
          <div className="settings-input settings-select-trigger" onClick={() => setTzOpen(o => !o)}>
            <span>{form.timezone}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {tzOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {TIMEZONES.map(t => (
                  <div key={t} className="settings-dropdown-item" onClick={() => { update('timezone', t); setTzOpen(false); }}>{t}</div>
                ))}
              </div>
            </div>
          )}
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
  const [currOpen, setCurrOpen] = useState(false);
  const currRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (currRef.current && !currRef.current.contains(e.target)) setCurrOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        <div className={`settings-field settings-dropdown-wrapper ${currOpen ? 'is-open' : ''}`} ref={currRef}>
          <label className="settings-label">Currency</label>
          <div className="settings-input settings-select-trigger" onClick={() => setCurrOpen(o => !o)}>
            <span>{form.currency} — {form.currency === 'INR' ? 'Indian Rupee' : form.currency === 'USD' ? 'US Dollar' : 'Euro'}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {currOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {['INR', 'USD', 'EUR'].map(c => (
                  <div key={c} className="settings-dropdown-item" onClick={() => { set('currency', c); setCurrOpen(false); }}>{c} — {c === 'INR' ? 'Indian Rupee' : c === 'USD' ? 'US Dollar' : 'Euro'}</div>
                ))}
              </div>
            </div>
          )}
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
    if (passwords.newPass.length < 8) return setPassError('Minimum 8 characters required.');
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
          <p>Use a strong password with at least 8 characters (letters, numbers and symbols)</p>
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
                value={passwords.newPass} placeholder="Min 8 characters"
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
    skuPrefix: getLocal('skuPrefix', 'SKU'),
  });
  const [saved, setSaved] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const unitRef = useRef(null);
  const taxRef = useRef(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (unitRef.current && !unitRef.current.contains(e.target)) setUnitOpen(false);
      if (taxRef.current && !taxRef.current.contains(e.target)) setTaxOpen(false);
      if (barcodeRef.current && !barcodeRef.current.contains(e.target)) setBarcodeOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        <div className={`settings-field settings-dropdown-wrapper ${unitOpen ? 'is-open' : ''}`} ref={unitRef}>
          <label className="settings-label">Default Unit</label>
          <div className="settings-input settings-select-trigger" onClick={() => setUnitOpen(o => !o)}>
            <span>{form.defaultUnit}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {unitOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'dozen', 'meter', 'feet'].map(u => (
                  <div key={u} className="settings-dropdown-item" onClick={() => { set('defaultUnit', u); setUnitOpen(false); }}>{u}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="settings-field">
          <label className="settings-label">SKU Prefix</label>
          <input className="settings-input" type="text" value={form.skuPrefix}
            onChange={e => set('skuPrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
            placeholder="SKU" maxLength={10} />
          <span className="settings-hint">Used for auto-generating SKUs (e.g. PRD)</span>
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
        <div className={`settings-field settings-dropdown-wrapper ${taxOpen ? 'is-open' : ''}`} ref={taxRef}>
          <label className="settings-label">Default Tax Type</label>
          <div className="settings-input settings-select-trigger" onClick={() => setTaxOpen(o => !o)}>
            <span>{form.defaultTaxType}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {taxOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {['GST', 'VAT', 'TAX', 'NONE'].map(t => (
                  <div key={t} className="settings-dropdown-item" onClick={() => { set('defaultTaxType', t); setTaxOpen(false); }}>{t}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={`settings-field settings-dropdown-wrapper ${barcodeOpen ? 'is-open' : ''}`} ref={barcodeRef}>
          <label className="settings-label">Barcode Format</label>
          <div className="settings-input settings-select-trigger" onClick={() => setBarcodeOpen(o => !o)}>
            <span>{form.barcodeFormat}</span>
            <Icon name="chevron-down" size={14} />
          </div>
          {barcodeOpen && (
            <div className="settings-dropdown-menu">
              <div className="settings-dropdown-list">
                {['CODE128', 'EAN13', 'EAN8', 'QR', 'UPC'].map(b => (
                  <div key={b} className="settings-dropdown-item" onClick={() => { set('barcodeFormat', b); setBarcodeOpen(false); }}>{b}</div>
                ))}
              </div>
            </div>
          )}
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
// ══════════════════════════════════════════════════════════
//  APPEARANCE SETTINGS
// ══════════════════════════════════════════════════════════
function AppearanceSettings({ theme }) {
  const isDark = theme === 'dark';
  const prefix = isDark ? 'dark' : 'light';

  const [bgType, setBgType] = useState(getLocal(`bg_${prefix}_type`, 'default'));
  const [bgVal, setBgVal] = useState(getLocal(`bg_${prefix}_val`, ''));
  const [saved, setSaved] = useState(false);

  const presets = isDark 
    ? [
        { type: 'color', val: '#020617', label: 'Obsidian' },
        { type: 'color', val: '#0f172a', label: 'Slate' },
        { type: 'color', val: '#1e1b4b', label: 'Midnight' },
        { type: 'image', val: 'linear-gradient(135deg, #020617 0%, #1e1b4b 100%)', label: 'Cosmos' },
        { type: 'image', val: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', label: 'Steel' },
        { type: 'image', val: 'linear-gradient(135deg, #111827 0%, #1e293b 100%)', label: 'Shadow' }
      ]
    : [
        { type: 'color', val: '#f8fafc', label: 'Alabaster' },
        { type: 'color', val: '#f1f5f9', label: 'Cloud' },
        { type: 'color', val: '#fef2f2', label: 'Rose' },
        { type: 'color', val: '#eff6ff', label: 'Sky' },
        { type: 'color', val: '#f5f3ff', label: 'Lavender' },
        { type: 'image', val: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', label: 'Frost' },
        { type: 'image', val: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', label: 'Misty' },
        { type: 'image', val: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', label: 'Ocean' }
      ];

  const handleSave = (type, val) => {
    setBgType(type);
    setBgVal(val);
    saveLocal(`bg_${prefix}_type`, type);
    saveLocal(`bg_${prefix}_val`, val);
    
    // Trigger global update
    window.dispatchEvent(new Event('ss_bg_update'));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large (max 2MB). Please use a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleSave('image', reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-form">
      <div className="settings-section-title">Current Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</div>

      <div className="settings-card">
        <div className="settings-card__header">
          <h3>Main Background</h3>
          <p>Customize the app's base background layer for {isDark ? 'dark' : 'light'} mode</p>
        </div>

        <div className="appearance-options">
          <div className="appearance-section">
            <label className="settings-label">Solid Colors</label>
            <div className="color-presets">
              <button 
                className={`color-preset color-preset--default ${bgType === 'default' ? 'active' : ''}`}
                onClick={() => handleSave('default', '')}
                title="System Default"
              >
                <Icon name="refresh" size={14} />
              </button>
              {presets.map(c => (
                <button 
                  key={c.label}
                  className={`color-preset ${bgVal === c.val ? 'active' : ''}`}
                  style={{ background: c.val }}
                  onClick={() => handleSave(c.type, c.val)}
                  title={c.label}
                />
              ))}
              <div className="color-picker-wrapper">
                <input 
                  type="color" 
                  value={bgType === 'color' ? bgVal : '#6366f1'} 
                  onChange={(e) => handleSave('color', e.target.value)}
                />
                <Icon name="settings" size={12} />
              </div>
            </div>
          </div>

          <div className="appearance-divider" />

          <div className="appearance-section">
            <label className="settings-label">Background Image</label>
            <div className="image-upload-zone">
              {bgType === 'image' && bgVal ? (
                <div className="bg-preview-container">
                  <img src={bgVal} alt="Background preview" className="bg-preview" />
                  <button className="bg-remove-btn" onClick={() => handleSave('default', '')}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ) : (
                <label className="image-upload-label">
                  <Icon name="box" size={24} />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                </label>
              )}
            </div>
            <p className="settings-hint">High-quality abstract patterns work best (Max 2MB)</p>
          </div>
        </div>

        <div className="settings-footer">
          {saved && <span className="settings-saved">✅ Applied to {isDark ? 'Dark' : 'Light'} Mode</span>}
        </div>
      </div>

      <div className="settings-info-card" style={{ background: 'var(--color-bg-overlay)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          <Icon name="check" size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          <strong>Pro Tip:</strong> Backgrounds are saved separately for Light and Dark modes. Toggle your theme in the header to set the perfect background for both!
        </p>
      </div>
    </div>
  );
}

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
  { id: 'shop',       label: 'Shop Profile',   icon: 'manufacturers' },
  { id: 'billing',    label: 'Billing',         icon: 'billing' },
  { id: 'account',    label: 'My Account',      icon: 'customers' },
  { id: 'team',       label: 'Team',            icon: 'users' },
  { id: 'inventory',  label: 'Inventory',       icon: 'inventory' },
  { id: 'notif',      label: 'Notifications',   icon: 'dashboard' },
  { id: 'appearance', label: 'Appearance',      icon: 'settings' },
  { id: 'about',      label: 'About',           icon: 'settings' },
];

// Tabs visible to each role
const ROLE_TABS = {
  owner:   ['shop', 'account', 'team', 'inventory', 'notif', 'appearance', 'about'],
  admin:   ['shop', 'billing', 'account', 'team', 'inventory', 'notif', 'appearance', 'about'],
  manager: ['account', 'appearance'],
  cashier: ['account', 'appearance'],
};

export default function Settings({ user }) {
  const [searchParams] = useSearchParams();
  const role = user?.role?.toLowerCase() || 'cashier';

  const allowedTabIds = ROLE_TABS[role] || ['account', 'appearance'];
  const filteredTabs = TABS.filter(t => allowedTabIds.includes(t.id));

  const defaultTab = filteredTabs[0]?.id || 'account';

  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    if (t && filteredTabs.some(tab => tab.id === t)) return t;
    return defaultTab;
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && filteredTabs.some(tab => tab.id === t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1>Settings</h1>
        <p>Manage your shop configuration and preferences</p>
      </div>

      <div className="settings-layout">
        <div className="settings-sidebar">
          {filteredTabs.map(tab => (
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
          {activeTab === 'appearance' && <AppearanceSettings theme={document.documentElement.getAttribute('data-theme') || 'dark'} />}
          {activeTab === 'about' && <About />}
        </div>
      </div>
    </div>
  );
}