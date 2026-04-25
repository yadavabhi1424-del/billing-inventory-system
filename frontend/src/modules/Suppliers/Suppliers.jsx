import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { getSuppliers, deleteSupplier, getCustomers, deleteCustomer, disconnectPartner, getCatalog, placeB2BOrder } from '../../services/api';
import B2BOrders from '../B2B/B2BOrders';
import './Suppliers.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Suppliers({ user }) {
  const isSupplier = user?.userType === 'supplier';
  const entityName = isSupplier ? 'Customer' : 'Supplier';
  const entityNamePlural = isSupplier ? 'Customers' : 'Suppliers';

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'orders' ? 'orders' : 'crm');
  const [loading, setLoading] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [cart, setCart] = useState({});
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => { fetchSuppliers(); }, []); // eslint-disable-line

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = isSupplier ? await getCustomers({ limit: 100 }) : await getSuppliers({ limit: 100 });
      if (res.success) setSuppliers(res.data);
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (e, s) => {
    e.stopPropagation();
    if (!confirm(`Delete ${entityName.toLowerCase()} "${s.name}"?`)) return;
    const id = isSupplier ? s.customer_id : s.supplier_id;
    isSupplier ? await deleteCustomer(id) : await deleteSupplier(id);
    fetchSuppliers();
  };

  const handleDisconnect = async (e, partner) => {
    e.stopPropagation();
    if (!confirm(`Disconnect from "${partner.name}"?`)) return;
    try {
      setLoading(true);
      const res = await disconnectPartner(partner.slug);
      if (res.success) { alert('Disconnected successfully.'); fetchSuppliers(); }
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleOpenCatalog = async () => {
    if (!selected) return;
    setCatalogLoading(true);
    setCart({});
    setShowCatalogModal(true);
    try {
      const res = await getCatalog(selected.supplier_id || selected.entity_id);
      if (res.success){
        setCatalog(res.data);
      }
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setCatalogLoading(false); }
  };

  const updateCart = (product, delta) => {
    setCart(prev => {
      const newQty = (prev[product.product_id]?.qty || 0) + delta;
      if (newQty <= 0) {
        const { [product.product_id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product.product_id]: { ...product, qty: newQty } };
    });
  };

  const setQty = (product, qty) => {
    if (qty <= 0) {
      setCart(prev => { const { [product.product_id]: _, ...rest } = prev; return rest; });
    } else {
      setCart(prev => ({ ...prev, [product.product_id]: { ...product, qty } }));
    }
  };

  const handlePlaceB2BOrder = async () => {
    const items = Object.values(cart);
    if (!items.length) return;
    try {
      setLoading(true);
      const res = await placeB2BOrder({ supplier_id: selected.supplier_id || selected.entity_id, items });
      if (res.success) {
        alert("Order placed! Check 'Purchase Orders' for updates.");
        setCart({}); setShowCatalogModal(false); setActiveTab('orders');
      }
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );
  const activeCount = suppliers.filter(s => s.isActive).length;
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.productCount || 0), 0);
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

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
          { label: `Total ${entityNamePlural}`, value: suppliers.length, icon: 'manufacturers', accent: 'var(--color-accent-primary)' },
          { label: `Active ${entityNamePlural}`, value: activeCount, icon: 'check', accent: 'var(--color-success)' },
          { label: 'Total Products', value: totalProducts, icon: 'box', accent: 'var(--color-violet)' },
          { label: 'Order Count', value: suppliers.reduce((s, sup) => s + (sup.orderCount || 0), 0), icon: 'billing', accent: 'var(--color-warning)' },
        ].map(s => (
          <div key={s.label} className="suppliers-stat-card" style={{ '--accent': s.accent }}>
            <div className="suppliers-stat-card__icon"><Icon name={s.icon} size={20} /></div>
            <div className="suppliers-stat-card__content">
              <span className="suppliers-stat-card__label">{s.label}</span>
              <span className="suppliers-stat-card__value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="suppliers-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`suppliers-tab ${activeTab === 'crm' ? 'active' : ''}`} onClick={() => setActiveTab('crm')}>My CRM</button>
          {!isSupplier && <button className={`suppliers-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>Purchase Orders</button>}
        </div>
        <div className="suppliers-search">
          <Icon name="search" size={16} />
          <input className="suppliers-search__input" placeholder={`Search ${entityNamePlural.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* CRM Table */}
      {activeTab === 'crm' && (
        <div className="suppliers-table-wrapper">
          <table className="suppliers-table">
            <thead><tr>
              <th>{entityName} Name</th><th>Contact Person</th><th>Phone</th>
              <th>Products</th><th>Orders</th><th>Payment Terms</th><th>Status</th><th style={{ width: 100 }}>Action</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="suppliers-empty"><Icon name="discovery" size={48} /><p>No {entityNamePlural.toLowerCase()} found</p></td></tr>
              ) : filtered.map(s => (
                <tr key={s.supplier_id || s.customer_id} className="suppliers-row" onClick={() => setSelected(s)}>
                  <td><div className="suppliers-name">{s.name}</div>{s.city && <div className="suppliers-company">{s.city}</div>}</td>
                  <td><span className="suppliers-contact">{s.contactPerson || '—'}</span></td>
                  <td><span className="suppliers-phone">{s.phone}</span></td>
                  <td><span className="suppliers-products">{s.productCount || 0}</span></td>
                  <td><span className="suppliers-products">{s.orderCount || 0}</span></td>
                  <td><span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{s.paymentTerms || '—'}</span></td>
                  <td><span className={`suppliers-status-badge suppliers-status-badge--${s.isActive ? 'active' : 'inactive'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="suppliers-actions">
                      {s.is_network
                        ? <button className="suppliers-action-btn suppliers-action-btn--warning" title="Disconnect" onClick={e => handleDisconnect(e, s)}><Icon name="zapOff" size={14} /></button>
                        : <button className="suppliers-action-btn suppliers-action-btn--danger" title="Delete" onClick={e => handleDelete(e, s)}><Icon name="x" size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && <div className="b2b-orders-container" style={{ flex: 1, padding: 0 }}><B2BOrders user={user} /></div>}

      {/* Side Panel */}
      {selected && (
        <div className="suppliers-side-panel-backdrop" onClick={() => setSelected(null)}>
          <div className="suppliers-side-panel" onClick={e => e.stopPropagation()}>
            <div className="suppliers-side-panel__header">
              <h3>{entityName} Details</h3>
              <button className="suppliers-side-panel__close" onClick={() => setSelected(null)}><Icon name="x" size={20} /></button>
            </div>
            <div className="suppliers-side-panel__content">
              <h2 className="suppliers-detail-title">{selected.name}</h2>
              {selected.city && <p className="suppliers-detail-company">{selected.city}, {selected.state}</p>}
              {[
                { title: 'Contact', rows: [['Owner', selected.contactPerson || '—'], ['Phone', selected.phone], ['Email', selected.email || '—'], ['Address', selected.address || '—'], ['GSTIN', selected.gstin || '—']] },
                { title: 'Business', rows: [['Payment Terms', selected.paymentTerms || '—'], ['Products', selected.productCount || 0], ['Total Orders', selected.orderCount || 0], ['Status', selected.isActive ? 'Active' : 'Inactive']] },
              ].map(section => (
                <div key={section.title} className="suppliers-detail-section">
                  <h4>{section.title}</h4>
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="suppliers-detail-row">
                      <span>{label}</span><span style={{ textAlign: 'right', fontSize: '0.82rem' }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
              {!isSupplier && selected.isActive && (
                <button className="suppliers-detail-order-btn" onClick={handleOpenCatalog}>
                  <Icon name="billing" size={18} /> Shop Supplier Catalog
                </button>
              )}
            </div>
            <div className="suppliers-side-panel__actions">
              <button className="suppliers-btn suppliers-btn--secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.is_network && (
                <button className="suppliers-btn" style={{ background: 'var(--color-warning)', color: 'white' }} onClick={e => handleDisconnect(e, selected)}>
                  <Icon name="zapOff" size={16} /> Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
{showCatalogModal && (
  <div className="catalog-modal-overlay" onClick={() => { setShowCatalogModal(false); setCart({}); }}>
    <div className="catalog-modal" onClick={e => e.stopPropagation()}>

      <div className="catalog-modal__header">
        <div className="catalog-modal__header-left">
          <h2 className="catalog-modal__title">{selected.name}</h2>
          <div className="catalog-modal__meta">
            {selected.phone && <span>{selected.phone}</span>}
            {selected.email && <span>{selected.email}</span>}
            {selected.address && <span>{selected.address}</span>}
          </div>
        </div>
        <button className="catalog-modal__close" onClick={() => { setShowCatalogModal(false); setCart({}); }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="catalog-modal__body">
        <div className={`catalog-pos-grid ${cartItems.length > 0 ? 'catalog-pos-grid--with-panel' : ''}`}>

          <div className="catalog-products-area">
            <div className="catalog-search-wrap">
              <span className="catalog-search-icon"><Icon name="search" size={16} /></span>
              <input
                className="catalog-search-input"
                placeholder="Search products in this catalog..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
              />
            </div>
            <div className="catalog-cards-grid">
              {catalogLoading ? (
                <div className="catalog-loading-state"><div className="app-loading__spinner" /></div>
              ) : catalog
                .filter(p => (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()))
                .map(p => {
                  const inCart = cart[p.product_id];
                  return (
                    <div
                      key={p.product_id}
                      className={`catalog-product-card ${inCart ? 'catalog-product-card--in-cart' : ''} ${p.stock === 0 ? 'catalog-product-card--out' : ''}`}
                      onClick={() => updateCart(p, 1)}
                    >
                      <div className="catalog-product-card__name">{p.name}</div>
                      <div className="catalog-product-card__sku">{p.sku || 'N/A'}</div>
                      <div className="catalog-product-card__price">₹{p.price}</div>
                      {inCart && <div className="catalog-product-card__qty-badge">{inCart.qty}</div>}
                    </div>
                  );
                })
              }
              {!catalogLoading && catalog.length === 0 && (
                <div className="catalog-empty-state">No products in catalog.</div>
              )}
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="catalog-order-panel">
              <div className="catalog-order-panel__header">
                <span className="catalog-order-panel__title">Order Summary</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="catalog-order-items">
                {cartItems.map(item => (
                  <div key={item.product_id} className="catalog-order-item">
                    <div className="catalog-order-item__info">
                      <div className="catalog-order-item__name">{item.name}</div>
                      <div className="catalog-order-item__price">₹{item.price} × {item.qty}</div>
                    </div>
                    <div className="catalog-order-item__qty">
                      <button className="catalog-order-item__qty-btn" onClick={() => updateCart(item, -1)}>−</button>
                      <input
                        className="catalog-order-item__qty-input"
                        type="text"
                        inputMode="numeric"
                        value={item.qty}
                        onChange={e => {
                          const v = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          setQty(item, v);
                        }}
                      />
                      <button className="catalog-order-item__qty-btn" onClick={() => updateCart(item, 1)}>+</button>
                    </div>
                    <span className="catalog-order-item__total">{fmt(item.qty * item.price)}</span>
                    <button className="catalog-order-item__remove" onClick={() => updateCart(item, -item.qty)}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="catalog-order-grand-total">
                <span className="catalog-order-grand-total__label">Total</span>
                <span className="catalog-order-grand-total__value">{fmt(cartTotal)}</span>
              </div>

              <button className="catalog-order-place-btn" disabled={loading} onClick={handlePlaceB2BOrder}>
                <Icon name="check" size={16} />
                {loading ? 'Placing...' : `Confirm B2B Order — ${fmt(cartTotal)}`}
              </button>
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