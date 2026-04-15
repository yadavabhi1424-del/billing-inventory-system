import { useState, useEffect } from 'react';
import { getShopTypes, saveShopProfile } from '../services/api';
import './SetupWizard.css';

const INVENTORY_TYPES = [
  { key: 'FINISHED',  label: 'Finished Goods',  desc: 'Products ready to sell',           icon: '📦' },
  { key: 'RAW',       label: 'Raw Materials',    desc: 'Materials used in production',     icon: '🪨' },
  { key: 'COMPONENT', label: 'Components/Parts', desc: 'Screws, chips, sub-assemblies',   icon: '🔩' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const TIMEZONES  = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

export default function SetupWizard({ user, onComplete }) {
  const [step,       setStep]      = useState(1);
  const [shopTypes,  setShopTypes] = useState([]);
  const [loading,    setLoading]   = useState(false);
  const [form, setForm] = useState({
    shop_name:        '',
    shop_type:        '',
    shop_description: '',
    inventory_types:  ['FINISHED'],
    currency:         'INR',
    timezone:         'Asia/Kolkata',
    address:          '',
    gstin:            '',
  });

  useEffect(() => {
    getShopTypes().then(r => setShopTypes(r.data || []));
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await saveShopProfile(form);
      if (res.success) {
        // Success! We can now proceed. 
        // We'll pass the form so the parent can update the user state immediately.
        onComplete(form);
      }
    } catch (e) {
      alert(e.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };
  const canNext = () => {
    if (step === 1) return form.shop_name.trim().length > 0;
    if (step === 2) return form.shop_type !== '';
    if (step === 3) return form.inventory_types.length > 0;
    return true;
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard">

        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-logo">📦 StockSense Pro</div>
          <div className="wizard-steps">
            {[1,2,3,4].map(s => (
              <div key={s} className={`wizard-step-dot ${step >= s ? 'active' : ''} ${step > s ? 'done' : ''}`}>
                {step > s ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Shop Details */}
        {step === 1 && (
          <div className="wizard-body">
            <div className="wizard-title">Welcome, {user.name}! 👋</div>
            <div className="wizard-sub">Let's set up your shop in 4 quick steps</div>

            <div className="wizard-field">
              <label>Shop Name *</label>
              <input
                type="text"
                placeholder="e.g. ABC Electronics"
                value={form.shop_name}
                onChange={e => update('shop_name', e.target.value)}
              />
            </div>

            <div className="wizard-field">
              <label>Shop Description</label>
              <textarea
                placeholder="Briefly describe what your shop sells..."
                value={form.shop_description}
                onChange={e => update('shop_description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="wizard-field">
              <label>Address</label>
              <input
                type="text"
                placeholder="Shop address"
                value={form.address}
                onChange={e => update('address', e.target.value)}
              />
            </div>

            <div className="wizard-row">
              <div className="wizard-field">
                <label>Currency</label>
                <select value={form.currency} onChange={e => update('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="wizard-field">
                <label>GSTIN (optional)</label>
                <input
                  type="text"
                  placeholder="GST number"
                  value={form.gstin}
                  onChange={e => update('gstin', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Shop Type */}
        {step === 2 && (
          <div className="wizard-body">
            <div className="wizard-title">What type of shop is this?</div>
            <div className="wizard-sub">This helps us tailor the app for your business</div>

            <div className="wizard-type-grid">
              {shopTypes.map(type => (
                <div
                  key={type.type_key}
                  className={`wizard-type-card ${form.shop_type === type.type_key ? 'selected' : ''}`}
                  onClick={() => update('shop_type', type.type_key)}
                >
                  <div className="wizard-type-icon">{type.icon}</div>
                  <div className="wizard-type-name">{type.display_name}</div>
                  <div className="wizard-type-desc">{type.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Inventory Types */}
        {step === 3 && (
          <div className="wizard-body">
            <div className="wizard-title">What do you stock?</div>
            <div className="wizard-sub">Select all inventory types your shop uses</div>

            <div className="wizard-inv-grid">
              {INVENTORY_TYPES.map(type => (
                <div
                  key={type.key}
                  className={`wizard-inv-card ${form.inventory_types.includes(type.key) ? 'selected' : ''}`}
                  onClick={() => toggleInventoryType(type.key)}
                >
                  <div className="wizard-inv-icon">{type.icon}</div>
                  <div className="wizard-inv-name">{type.label}</div>
                  <div className="wizard-inv-desc">{type.desc}</div>
                  <div className="wizard-inv-check">
                    {form.inventory_types.includes(type.key) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Confirm */}
        {step === 4 && (
          <div className="wizard-body">
            <div className="wizard-title">All set! 🎉</div>
            <div className="wizard-sub">Here's your shop summary</div>

            <div className="wizard-summary">
              <div className="wizard-summary-row">
                <span>Shop Name</span>
                <strong>{form.shop_name}</strong>
              </div>
              <div className="wizard-summary-row">
                <span>Shop Type</span>
                <strong>{shopTypes.find(t => t.type_key === form.shop_type)?.display_name}</strong>
              </div>
              <div className="wizard-summary-row">
                <span>Inventory Types</span>
                <strong>{form.inventory_types.join(', ')}</strong>
              </div>
              <div className="wizard-summary-row">
                <span>Currency</span>
                <strong>{form.currency}</strong>
              </div>
              {form.address && (
                <div className="wizard-summary-row">
                  <span>Address</span>
                  <strong>{form.address}</strong>
                </div>
              )}
            </div>

            <p style={{fontSize:13,color:'#64748b',marginTop:16,lineHeight:1.7}}>
              You can always update these settings later from the Settings page.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="wizard-footer">
          {step > 1 && (
            <button className="wizard-btn-back" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button
              className="wizard-btn-next"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
            >
              Next →
            </button>
          ) : (
            <button
              className="wizard-btn-finish"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Setting up...' : '🚀 Enter App'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}