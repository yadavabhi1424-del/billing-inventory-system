// ============================================================
//  Suppliers.jsx — Connected to Backend
//  StockSense Pro
// ============================================================

import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getConnections, updateConnectionStatus // new B2B networking APIs
} from '../../services/api';
import './Suppliers.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

// ══════════════════════════════════════════════════════════
//  SUPPLIER FORM MODAL
// ══════════════════════════════════════════════════════════
// Field defined OUTSIDE the modal so React never unmounts/remounts inputs on re-render
function SupplierField({ label, field, placeholder, type = 'text', required, full, hint, form, errors, set }) {
  return (
    <div className={`supplier-form__field ${full ? 'supplier-form__field--full' : ''}`}>
      <label className="supplier-form__label">{label}{required && ' *'}</label>
      <input type={type}
        className={`supplier-form__input ${errors[field] ? 'supplier-form__input--error' : ''}`}
        placeholder={placeholder} value={form[field]}
        onChange={e => set(field, type === 'tel'
          ? e.target.value.replace(/\D/g, '').slice(0, 10)
          : e.target.value)}
      />
      {errors[field] && <span className="supplier-form__error">{errors[field]}</span>}
      {hint && <span className="supplier-form__hint">{hint}</span>}
    </div>
  );
}

function SupplierFormModal({ title, supplier = null, onClose, onSave, entityName }) {
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name:         supplier?.name          || '',
    contactPerson: supplier?.contactPerson || '',
    phone:        supplier?.phone         || '',
    email:        supplier?.email         || '',
    address:      supplier?.address       || '',
    city:         supplier?.city          || '',
    state:        supplier?.state         || '',
    pincode:      supplier?.pincode       || '',
    gstin:        supplier?.gstin         || '',
    paymentTerms: supplier?.paymentTerms  || '30 days',
    notes:        supplier?.notes         || '',
  });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Supplier name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Phone must be 10 digits';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email format';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const f = { form, errors, set };

  return (
    <div className="supplier-form-modal-backdrop" onClick={onClose}>
      <div className="supplier-form-modal" onClick={e => e.stopPropagation()}>
        <div className="supplier-form-modal__header">
          <h3>{title}</h3>
          <button className="supplier-form-modal__close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <form className="supplier-form" onSubmit={handleSubmit}>
          <div className="supplier-form__content">
            <div className="supplier-form__grid">
              <SupplierField label={`${entityName} Name`}   field="name"          placeholder="ABC Foods"          required {...f} />
              <SupplierField label="Contact Person"  field="contactPerson" placeholder="Rajesh Kumar"              {...f} />
              <SupplierField label="Phone"           field="phone"         placeholder="9876543210" type="tel" required {...f} />
              <SupplierField label="Email"           field="email"         placeholder="contact@abc.com" type="email" {...f} />
              <SupplierField label="City"            field="city"          placeholder="Delhi"                    {...f} />
              <SupplierField label="State"           field="state"         placeholder="Delhi"                    {...f} />
              <SupplierField label="Pincode"         field="pincode"       placeholder="110001"                   {...f} />
              <SupplierField label="GSTIN"           field="gstin"         placeholder="07AABCT1234A1Z5"          {...f} />
              <SupplierField label="Payment Terms"   field="paymentTerms"  placeholder="30 days" hint="e.g. 30 days, 45 days" {...f} />

              <div className="supplier-form__field supplier-form__field--full">
                <label className="supplier-form__label">Address</label>
                <textarea className="supplier-form__input supplier-form__textarea"
                  placeholder="123 Industrial Area, City" rows="2"
                  value={form.address} onChange={e => set('address', e.target.value)} />
              </div>

              <div className="supplier-form__field supplier-form__field--full">
                <label className="supplier-form__label">Notes</label>
                <textarea className="supplier-form__input supplier-form__textarea"
                  placeholder="Additional notes..." rows="2"
                  value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="supplier-form__footer">
            <button type="button" className="supplier-form__btn supplier-form__btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="supplier-form__btn supplier-form__btn--primary" disabled={saving}>
              <Icon name="check" size={16} />
              {saving ? 'Saving...' : isEdit ? `Update ${entityName}` : `Add ${entityName}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════
//  MAIN SUPPLIERS
// ══════════════════════════════════════════════════════════
export default function Suppliers({ user }) {
  const isSupplier = user?.userType === 'supplier';
  const entityName = isSupplier ? 'Customer' : 'Supplier';
  const entityNamePlural = isSupplier ? 'Customers' : 'Suppliers';

  const [suppliers, setSuppliers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  
  // Tabs: 'crm' | 'requests'
  const [activeTab, setActiveTab] = useState('crm');
  const [requests,  setRequests]  = useState([]);

  useEffect(() => { 
    fetchSuppliers(); 
    fetchRequests();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = isSupplier ? await getCustomers({ limit: 100 }) : await getSuppliers({ limit: 100 });
      if (res.success) setSuppliers(res.data);
    } catch (err) {
      console.error(`${entityNamePlural} fetch error:`, err.message);
    } finally {
      if (activeTab === 'crm') setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      if (activeTab === 'requests') setLoading(true);
      const res = await getConnections({ status: 'PENDING' });
      if (res.success) setRequests(res.data);
    } catch (err) {
      console.error("Requests fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (form) => {
    isSupplier ? await createCustomer(form) : await createSupplier(form);
    setShowAdd(false);
    fetchSuppliers();
  };

  const handleEdit = async (form) => {
    const id = isSupplier ? selected.customer_id : selected.supplier_id;
    isSupplier ? await updateCustomer(id, form) : await updateSupplier(id, form);
    setShowEdit(false);
    setSelected(null);
    fetchSuppliers();
  };

  const handleDelete = async (e, supplier) => {
    e.stopPropagation();
    if (!confirm(`Delete ${entityName.toLowerCase()} "${supplier.name}"?`)) return;
    const id = isSupplier ? supplier.customer_id : supplier.supplier_id;
    isSupplier ? await deleteCustomer(id) : await deleteSupplier(id);
    fetchSuppliers();
  };

  const handleRequestStatus = async (mapId, status) => {
    try {
      setLoading(true);
      const res = await updateConnectionStatus(mapId, status);
      if (res.success) {
        alert(`Request ${status.toLowerCase()} correctly. CRM has been automatically synchronized!`);
        await fetchRequests();
        await fetchSuppliers(); // refresh CRM table to show the new connection
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  const filteredRequests = requests.filter(r => 
    (r.name || r.business_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount    = suppliers.filter(s => s.isActive).length;
  const totalProducts  = suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  return (
    <div className="suppliers">

      {/* Stats */}
      <div className="suppliers-stats">
        {[
          { label: `Total ${entityNamePlural}`,  value: suppliers.length, icon: 'manufacturers', bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
          { label: `Active ${entityNamePlural}`, value: activeCount,      icon: 'check',         bg: 'var(--color-success-soft)', color: 'var(--color-success)'        },
          { label: 'Total Products',   value: totalProducts,    icon: 'box',           bg: 'var(--color-violet-soft)',  color: 'var(--color-violet)'         },
          { label: 'Order Count',      value: suppliers.reduce((s, sup) => s + (sup.orderCount || 0), 0), icon: 'billing', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
        ].map(s => (
          <div key={s.label} className="suppliers-stat-card">
            <div className="suppliers-stat-card__icon" style={{ background: s.bg, color: s.color }}>
              <Icon name={s.icon} size={24} />
            </div>
            <div className="suppliers-stat-card__content">
              <span className="suppliers-stat-card__label">{s.label}</span>
              <span className="suppliers-stat-card__value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar with Tabs */}
      <div className="suppliers-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`suppliers-tab ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'crm' ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === 'crm' ? '#818cf8' : '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}
          >
            My CRM
          </button>
          <button 
            className={`suppliers-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'requests' ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === 'requests' ? '#818cf8' : '#cbd5e1', cursor: 'pointer', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            Network Requests
            {requests.length > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{requests.length}</span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="suppliers-search">
            <Icon name="search" size={16} />
            <input className="suppliers-search__input"
              placeholder={`Search ${activeTab === 'crm' ? entityNamePlural.toLowerCase() : 'requests'}...`}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {activeTab === 'crm' && (
            <button className="suppliers-add-btn" onClick={() => setShowAdd(true)}>
              <Icon name="manufacturers" size={16} /> Add {entityName}
            </button>
          )}
        </div>
      </div>

      {/* CRM Table */}
      {activeTab === 'crm' && (
        <div className="suppliers-table-wrapper">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>{entityName} Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Payment Terms</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="suppliers-empty">
                    <Icon name="manufacturers" size={48} />
                    <p>{suppliers.length === 0 ? `No ${entityNamePlural.toLowerCase()} yet. Add your first ${entityName.toLowerCase()}!` : `No ${entityNamePlural.toLowerCase()} found`}</p>
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.supplier_id || s.customer_id} className="suppliers-row" onClick={() => setSelected(s)}>
                  <td>
                    <div className="suppliers-name">{s.name}</div>
                    {s.city && <div className="suppliers-company">{s.city}</div>}
                  </td>
                  <td><span className="suppliers-contact">{s.contactPerson || '—'}</span></td>
                  <td><span className="suppliers-phone">{s.phone}</span></td>
                  <td><span className="suppliers-products">{s.productCount || 0}</span></td>
                  <td><span className="suppliers-products">{s.orderCount || 0}</span></td>
                  <td><span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{s.paymentTerms || '—'}</span></td>
                  <td>
                    <span className={`suppliers-status-badge suppliers-status-badge--${s.isActive ? 'active' : 'inactive'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="suppliers-actions">
                      <button className="suppliers-action-btn" title="Edit"
                        onClick={e => { e.stopPropagation(); setSelected(s); setShowEdit(true); }}>
                        <Icon name="settings" size={14} />
                      </button>
                      <button className="suppliers-action-btn suppliers-action-btn--danger"
                        title="Delete" onClick={e => handleDelete(e, s)}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Network Requests Table */}
      {activeTab === 'requests' && (
        <div className="suppliers-table-wrapper">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Location</th>
                <th>Initiated By</th>
                <th>Date</th>
                <th style={{ width: 190 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="suppliers-empty">
                    <p>No pending requests.</p>
                  </td>
                </tr>
              ) : filteredRequests.map(r => (
                <tr key={r.map_id} className="suppliers-row">
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {r.logo ? <img src={r.logo} alt="" style={{width: 32, height: 32, borderRadius: 6, objectFit:'cover'}} />
                              : <div style={{width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}}>🏢</div>}
                      <span className="suppliers-name">{r.name || r.business_name}</span>
                    </div>
                  </td>
                  <td>{r.city || '—'}</td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                      {r.initiated_by} {r.initiated_by === user?.userType ? '(You)' : ''}
                    </span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {(r.initiated_by === user?.userType) ? (
                      <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>Awaiting Acceptance</span>
                    ) : (
                      <div className="suppliers-actions">
                        <button className="suppliers-action-btn" title="Accept"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '6px 12px', width: 'auto', borderRadius: '6px' }}
                          onClick={() => handleRequestStatus(r.map_id, 'ACCEPTED')}>
                          Accept
                        </button>
                        <button className="suppliers-action-btn" title="Reject"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '6px 12px', width: 'auto', borderRadius: '6px' }}
                          onClick={() => handleRequestStatus(r.map_id, 'REJECTED')}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Panel */}
      {selected && !showEdit && (
        <div className="suppliers-side-panel-backdrop" onClick={() => setSelected(null)}>
          <div className="suppliers-side-panel" onClick={e => e.stopPropagation()}>
            <div className="suppliers-side-panel__header">
              <h3>{entityName} Details</h3>
              <button className="suppliers-side-panel__close" onClick={() => setSelected(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="suppliers-side-panel__content">
              <h2 className="suppliers-detail-title">{selected.name}</h2>
              {selected.city && <p className="suppliers-detail-company">{selected.city}, {selected.state}</p>}

              {[
                { title: 'Contact', rows: [
                  ['Contact Person', selected.contactPerson || '—'],
                  ['Phone',          selected.phone],
                  ['Email',          selected.email || '—'],
                  ['Address',        selected.address || '—'],
                  ['GSTIN',          selected.gstin || '—'],
                ]},
                { title: 'Business', rows: [
                  ['Payment Terms',  selected.paymentTerms || '—'],
                  ['Products',       selected.productCount || 0],
                  ['Total Orders',   selected.orderCount   || 0],
                  ['Status',         selected.isActive ? 'Active' : 'Inactive'],
                ]},
              ].map(section => (
                <div key={section.title} className="suppliers-detail-section">
                  <h4>{section.title}</h4>
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="suppliers-detail-row">
                      <span>{label}</span>
                      <span style={{ textAlign: 'right', fontSize: '0.82rem' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}

              {selected.notes && (
                <div className="suppliers-detail-section">
                  <h4>Notes</h4>
                  <p className="suppliers-detail-notes">{selected.notes}</p>
                </div>
              )}
            </div>
            <div className="suppliers-side-panel__actions">
              <button className="suppliers-btn suppliers-btn--secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="suppliers-btn suppliers-btn--primary" onClick={() => setShowEdit(true)}>
                <Icon name="settings" size={16} /> Edit {entityName}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <SupplierFormModal title={`Add New ${entityName}`}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd} entityName={entityName} />
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <SupplierFormModal title={`Edit ${entityName}`}
          supplier={selected}
          onClose={() => { setShowEdit(false); setSelected(null); }}
          onSave={handleEdit} entityName={entityName} />
      )}
    </div>
  );
}