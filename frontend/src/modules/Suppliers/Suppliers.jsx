// ============================================================
//  Suppliers.jsx — Connected to Backend
//  StockSense Pro
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Icon from '../../components/Icon';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getConnections, updateConnectionStatus, disconnectPartner, // new B2B networking APIs
  getCatalog, placeB2BOrder
} from '../../services/api';
import B2BOrders from '../B2B/B2BOrders';
import './Suppliers.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

// ══════════════════════════════════════════════════════════
//  MAIN SUPPLIERS
// ══════════════════════════════════════════════════════════
export default function Suppliers({ user }) {
  const isSupplier = user?.userType === 'supplier';
  const entityName = isSupplier ? 'Customer' : 'Supplier';
  const entityNamePlural = isSupplier ? 'Customers' : 'Suppliers';

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  // Tabs: 'crm' | 'requests' | 'orders'
  const [activeTab, setActiveTab] = useState('crm');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Catalog / Ordering State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [cart, setCart] = useState({}); // { productId: { ...item, qty } }
  const [catalogSearch, setCatalogSearch] = useState('');

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
      if (activeTab === 'requests') setLoading(false);
    }
  };

  const handleDelete = async (e, supplier) => {
    e.stopPropagation();
    if (!confirm(`Delete ${entityName.toLowerCase()} "${supplier.name}"?`)) return;
    const id = isSupplier ? supplier.customer_id : supplier.supplier_id;
    isSupplier ? await deleteCustomer(id) : await deleteSupplier(id);
    fetchSuppliers();
  };

  const handleDisconnect = async (e, partner) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to DISCONNECT from "${partner.name}"? Historical reports will move to inactive, but new orders will be blocked.`)) return;

    try {
      setLoading(true);
      const res = await disconnectPartner(partner.slug);
      if (res.success) {
        alert("Disconnected successfully. Connection is now inactive.");
        fetchSuppliers();
      }
    } catch (err) {
      alert("Disconnection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestStatus = async (mapId, status) => {
    try {
      setLoading(true);
      const res = await updateConnectionStatus(mapId, status);
      if (res.success) {
        alert(`Request ${status.toLowerCase()} correctly. CRM has been automatically synchronized!`);
        await fetchRequests();
        await fetchSuppliers();
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCatalog = async () => {
    if (!selected) return;
    setCatalogLoading(true);
    setShowCatalogModal(true);
    try {
      const res = await getCatalog(selected.supplier_id || selected.entity_id);
      if (res.success) setCatalog(res.data);
    } catch (err) {
      alert("Failed to fetch catalog: " + err.message);
    } finally {
      setCatalogLoading(false);
    }
  };

  const updateCart = (product, delta) => {
    setCart(prev => {
      const existing = prev[product.product_id];
      const newQty = (existing?.qty || 0) + delta;
      if (newQty <= 0) {
        const { [product.product_id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product.product_id]: { ...product, qty: newQty } };
    });
  };

  const handlePlaceB2BOrder = async () => {
    const items = Object.values(cart);
    if (!items.length) return;
    try {
      setLoading(true);
      const res = await placeB2BOrder({
        supplier_id: selected.supplier_id || selected.entity_id,
        items
      });
      if (res.success) {
        alert("Order placed successfully! Check 'Purchase Orders' for updates.");
        setCart({});
        setShowCatalogModal(false);
        setActiveTab('orders');
      }
    } catch (err) {
      alert("Failed to place order: " + err.message);
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

  const activeCount = suppliers.filter(s => s.isActive).length;
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0);

  if (loading && !showCatalogModal) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  return (
    <div className="suppliers">

      {/* Stats */}
      <div className="suppliers-stats">
        {[
          { label: `Total ${entityNamePlural}`, value: suppliers.length, icon: 'manufacturers', bg: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' },
          { label: `Active ${entityNamePlural}`, value: activeCount, icon: 'check', bg: 'var(--color-success-soft)', color: 'var(--color-success)' },
          { label: 'Total Products', value: totalProducts, icon: 'box', bg: 'var(--color-violet-soft)', color: 'var(--color-violet)' },
          { label: 'Order Count', value: suppliers.reduce((s, sup) => s + (sup.orderCount || 0), 0), icon: 'billing', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
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
          >
            My CRM
          </button>
          <button
            className={`suppliers-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Network Requests
            {requests.length > 0 && (
              <span className="request-badge">{requests.length}</span>
            )}
          </button>
          {!isSupplier && (
            <button
              className={`suppliers-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Purchase Orders
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="suppliers-search">
            <Icon name="search" size={16} />
            <input className="suppliers-search__input"
              placeholder={`Search ${activeTab === 'crm' ? entityNamePlural.toLowerCase() : 'requests'}...`}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
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
                    <Icon name="discovery" size={48} />
                    <p>{suppliers.length === 0 ? `No active ${entityNamePlural.toLowerCase()} yet. Use Discovery to connect!` : `No ${entityNamePlural.toLowerCase()} found`}</p>
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
                      {s.is_network ? (
                        <button className="suppliers-action-btn suppliers-action-btn--warning"
                          title="Disconnect" onClick={e => handleDisconnect(e, s)}>
                          <Icon name="zapOff" size={14} />
                        </button>
                      ) : (
                        <button className="suppliers-action-btn suppliers-action-btn--danger"
                          title="Delete" onClick={e => handleDelete(e, s)}>
                          <Icon name="x" size={14} />
                        </button>
                      )}
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
                      {r.logo ? <img src={r.logo} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏢</div>}
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

      {/* Purchase Orders Table */}
      {activeTab === 'orders' && (
        <div className="suppliers-table-wrapper" style={{ flex: 1, padding: 0 }}>
          <B2BOrders user={user} />
        </div>
      )}

      {/* Side Panel */}
      {selected && (
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
                {
                  title: 'Contact', rows: [
                    ['Owner / Person', selected.contactPerson || '—'],
                    ['Phone', selected.phone],
                    ['Email', selected.email || '—'],
                    ['Address', selected.address || '—'],
                    ['GSTIN', selected.gstin || '—'],
                  ]
                },
                {
                  title: 'Business', rows: [
                    ['Payment Terms', selected.paymentTerms || '—'],
                    ['Products', selected.productCount || 0],
                    ['Total Orders', selected.orderCount || 0],
                    ['Status', selected.isActive ? 'Active' : 'Inactive'],
                  ]
                },
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

              {!isSupplier && selected.isActive && (
                <button className="suppliers-detail-order-btn" onClick={handleOpenCatalog}>
                  <Icon name="billing" size={18} /> Shop Supplier Catalog
                </button>
              )}

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
              {selected.is_network && (
                <button className="suppliers-btn"
                  style={{ background: 'var(--color-warning)', color: 'white' }}
                  onClick={e => handleDisconnect(e, selected)}>
                  <Icon name="zapOff" size={16} /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Order Modal — Dynamic B2B Procurement Overlay */}
      {showCatalogModal && (
        <div className="catalog-modal-overlay">
          <div className="catalog-modal">
            <div className="catalog-modal__header">
              {/* TOP 30%: Supplier Profile Header */}
              <div className="supplier-profile-header">
                <div className="header-topline">
                  <div className="business-main">
                    <h2>{selected.name}</h2>
                    <span className="owner-badge">Owner: {selected.contactPerson}</span>
                  </div>
                  <div className="header-actions">
                    <button className="close-catalog-btn" onClick={() => setShowCatalogModal(false)}>
                      <Icon name="x" size={24} />
                    </button>
                  </div>
                </div>
                <div className="header-details">
                  <div className="header-detail-item">
                    <Icon name="phone" size={14} />
                    <span>{selected.phone}</span>
                  </div>
                  <div className="header-detail-item">
                    <Icon name="mail" size={14} />
                    <span>{selected.email || 'No email provided'}</span>
                  </div>
                  <div className="header-detail-item">
                    <Icon name="location" size={14} />
                    <span>{selected.address || 'Address not listed'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="catalog-modal__body">
              <div className="catalog-modal__split" style={{ 
                gridTemplateColumns: Object.values(cart).length > 0 ? '1fr 360px' : '1fr' 
              }}>
                {/* LEFT 70%: Product Catalog */}
                <div className="catalog-products">
                  <div className="catalog-search-bar">
                    <Icon name="search" size={18} />
                    <input placeholder="Search products in this catalog..." 
                           value={catalogSearch} 
                           onChange={e => setCatalogSearch(e.target.value)} />
                  </div>
                  
                  <div className="catalog-grid">
                    {catalogLoading ? (
                      <div className="catalog-loading-state">
                        <div className="app-loading__spinner" />
                        <p>Loading catalog...</p>
                      </div>
                    ) : catalog.filter(p => (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase())).map(p => (
                      <div key={p.product_id} className="catalog-card">
                        {p.image && <img src={p.image} alt="" className="catalog-card__img" />}
                        <div className="catalog-card__body">
                          <span className="catalog-card__sku">SKU: {p.sku || 'N/A'}</span>
                          <h4 className="catalog-card__title">{p.name}</h4>
                          <p className="catalog-card__desc">{p.description}</p>
                          <div className="catalog-card__footer">
                            <span className="catalog-card__price">{fmt(p.price)}</span>
                            <div className="catalog-card__qty-control">
                              <button onClick={() => updateCart(p, -1)} disabled={!cart[p.product_id]}>-</button>
                              <span className="qty-val">{cart[p.product_id]?.qty || 0}</span>
                              <button onClick={() => updateCart(p, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!catalogLoading && catalog.length === 0 && (
                      <div className="catalog-empty-state">No products found in this catalog.</div>
                    )}
                  </div>
                </div>

                {/* RIGHT SIDE: Procurement Cart (Conditional) */}
                {Object.values(cart).length > 0 && (
                  <div className="catalog-cart">
                    <div className="cart-header">
                      <h3>Order Summary</h3>
                      <span className="cart-badge">{Object.values(cart).length} items</span>
                    </div>
                    
                    <div className="cart-items-list">
                      {Object.values(cart).map(item => (
                        <div key={item.product_id} className="cart-item-entry">
                          <div className="item-meta">
                            <strong>{item.name}</strong>
                            <span>{item.qty} × {fmt(item.price)}</span>
                          </div>
                          <span className="item-subtotal">{fmt(item.qty * item.price)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="cart-footer-btn-wrapper">
                      <div className="cart-total-display">
                        <span>Total Invoice Amount</span>
                        <strong className="total-amount">
                          {fmt(Object.values(cart).reduce((sum, item) => sum + (item.qty * item.price), 0))}
                        </strong>
                      </div>
                      <button className="catalog-place-order-btn" 
                              disabled={loading}
                              onClick={handlePlaceB2BOrder}>
                        {loading ? 'Placing Order...' : 'Confirm B2B Order'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}