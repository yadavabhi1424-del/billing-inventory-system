import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscovery, getCatalog, placeB2BOrder } from '../services/api';
import './Discovery.css';

const INITIAL_CATEGORIES = ['All', 'general', 'retail', 'food', 'pharmacy', 'electronics', 'clothing', 'auto_parts', 'hardware', 'stationery', 'textile'];

export default function DiscoveryPage({ user }) {
  const oppositeType = user?.userType === 'supplier' ? 'shop' : 'supplier';
  const oppositeName = oppositeType === 'supplier' ? 'Suppliers' : 'Shops';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [cart, setCart] = useState({});
  const catMenuRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  const [filters, setFilters] = useState({
    type: oppositeType,
    business_type: user?.business_type || 'All',
    search: '',
    match_my_category: true
  });

  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  const fetchCatalog = async (supplierId) => {
    setCatalogLoading(true);
    setCatalogSearch('');
    try {
      const res = await getCatalog(supplierId);
      if (res.success) setCatalog(res.data);
    } catch (err) {
      console.error("Failed to fetch catalog", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleAddCategory = (newCat) => {
    if (!categories.includes(newCat)) setCategories([...categories, newCat]);
    setFilters({ ...filters, business_type: newCat, match_my_category: false });
    setShowCatMenu(false);
  };

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDiscovery({ ...filters, page, limit: 20 });
      if (res.success) {
        setItems(res.data);
        setFallback(res.fallback || false);
      }
    } catch (err) {
      console.error("Discovery error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  useEffect(() => {
    if (selectedItem && selectedItem.entity_type === 'supplier') {
      fetchCatalog(selectedItem.slug || selectedItem.entity_id);
    } else {
      setCatalog([]);
    }
    setCart({});
  }, [selectedItem]);

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

  const handlePlaceOrder = async () => {
    const orderItems = Object.values(cart);
    if (!orderItems.length) return alert("Your cart is empty!");
    try {
      const res = await placeB2BOrder({ supplier_id: selectedItem.entity_id, items: orderItems });
      if (res.success) {
        alert("Order placed successfully! Check 'B2B Orders' for updates.");
        setSelectedItem(null);
      }
    } catch (err) {
      alert("Failed to place order: " + err.message);
    }
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

  return (
    <div className="discovery">
      {/* Search Header */}
      <div className="discovery__search-container">
        <input
          className="discovery__main-search"
          placeholder={`Search for ${oppositeName.toLowerCase()}...`}
          value={filters.search}
          onChange={e => { setFilters({ ...filters, search: e.target.value, match_my_category: false }); setPage(1); }}
        />
        <button className="discovery__search-btn">🔍 Search</button>
      </div>

      <div className="discovery__sub-header">
        <div className="discovery__category-selector" ref={catMenuRef}>
          <div className="cat-trigger" onClick={() => setShowCatMenu(!showCatMenu)}>
            <span className="cat-label">Category:</span>
            <span className="cat-value">{filters.business_type === 'All' ? 'All' : filters.business_type}</span>
            <span className="cat-arrow">▼</span>
          </div>
          {showCatMenu && (
            <div className="cat-menu">
              <input autoFocus className="cat-menu-search" placeholder="Filter..." value={catSearch} onChange={e => setCatSearch(e.target.value)} />
              <div className="cat-list">
                {categories.filter(c => c.includes(catSearch.toLowerCase())).map(c => (
                  <div key={c} className={`cat-item ${filters.business_type === c ? 'active' : ''}`}
                    onClick={() => { setFilters({ ...filters, business_type: c, match_my_category: false }); setShowCatMenu(false); }}>
                    {c}
                  </div>
                ))}
                {catSearch && !categories.includes(catSearch) && (
                  <div className="cat-item create-new" onClick={() => handleAddCategory(catSearch)}>+ Add "{catSearch}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="discovery__loading">Searching platform...</div>
      ) : (
        <>
          {(fallback && (filters.search.trim() || (filters.business_type !== 'All' && !filters.match_my_category))) && (
            <div className="discovery__fallback-notice">
              <h3>No exact matches.</h3>
              <p>Recommended instead:</p>
            </div>
          )}
          <div className="discovery__grid">
            {items.map(item => (
              <div key={item.profile_id} className="discovery-card" onClick={() => setSelectedItem(item)}>
                <div className="discovery-card__image">
                  {item.logo ? <img src={item.logo} alt="" /> : <span>{item.entity_type === 'supplier' ? '🏭' : '🏪'}</span>}
                  {item.connectionStatus === 'ACCEPTED' && <span className="badge badge--connected">Connected</span>}
                  {item.connectionStatus === 'PENDING' && <span className="badge badge--pending">Pending</span>}
                </div>
                <div className="discovery-card__content">
                  <h3>{item.business_name}</h3>
                  <p className="location">📍 {item.city}</p>
                  <div className="tags">
                    <span className="tag-category">{item.business_type}</span>
                    {item.distance && <span className="tag-distance">{Number(item.distance).toFixed(1)}km</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Supplier / Partner Catalog Modal — matches Suppliers.jsx design */}
      {selectedItem && (
  <div className="catalog-modal-overlay" onClick={() => setSelectedItem(null)}>
    <div className="catalog-modal" onClick={e => e.stopPropagation()}>

      <div className="catalog-modal__header">
        <div className="catalog-modal__header-left">
          <h2 className="catalog-modal__title">{selectedItem.business_name}</h2>
          <div className="catalog-modal__meta">
            {selectedItem.phone && <span>{selectedItem.phone}</span>}
            {selectedItem.email && <span>{selectedItem.email || 'No email provided'}</span>}
            {selectedItem.city && <span>{[selectedItem.city, selectedItem.state].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        <button className="catalog-modal__close" onClick={() => setSelectedItem(null)}>
          <span style={{ fontSize: '1rem' }}>✕</span>
        </button>
      </div>

      <div className="catalog-modal__body">
        <div className={`catalog-pos-grid ${cartItems.length > 0 ? 'catalog-pos-grid--with-panel' : ''}`}>

          <div className="catalog-products-area">
            {selectedItem.entity_type === 'supplier' && (
              <div className="catalog-search-wrap">
                <span className="catalog-search-icon">🔍</span>
                <input
                  className="catalog-search-input"
                  placeholder="Search products in this catalog..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                />
              </div>
            )}

            <div className="catalog-cards-grid">
              {catalogLoading ? (
                <div className="catalog-loading-state"><div className="app-loading__spinner" /></div>
              ) : selectedItem.entity_type === 'shop' ? (
                <div className="catalog-empty-state" style={{ flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '2.5rem' }}>🏬</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Retail Partner Profile</div>
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>This is a retail shop. They do not list a B2B wholesale catalog.</p>
                </div>
              ) : catalog.length === 0 ? (
                <div className="catalog-empty-state">No products listed by this supplier.</div>
              ) : (
                catalog
                  .filter(p => (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()))
                  .map(p => {
                    const inCart = cart[p.product_id];
                    return (
                      <div
                        key={p.product_id}
                        className={`catalog-product-card ${inCart ? 'catalog-product-card--in-cart' : ''}`}
                        onClick={() => updateCart(p, 1)}
                      >
                        <div className="catalog-product-card__name">{p.name}</div>
                        <div className="catalog-product-card__sku">{p.sku || 'N/A'}</div>
                        <div className="catalog-product-card__price">{fmt(p.price)}</div>
                      </div>
                    );
                  })
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
                      <div className="catalog-order-item__price">{fmt(item.price)} × {item.qty}</div>
                    </div>
                    <div className="catalog-order-item__qty">
                      <button className="catalog-order-item__qty-btn" onClick={() => updateCart(item, -1)}>−</button>
                      <input
                        className="catalog-order-item__qty-input"
                        type="text"
                        inputMode="numeric"
                        value={item.qty}
                        onChange={e => {
                          const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                          const current = item.qty;
                          updateCart(item, val - current);
                        }}
                      />
                      <button className="catalog-order-item__qty-btn" onClick={() => updateCart(item, 1)}>+</button>
                    </div>
                    <span className="catalog-order-item__total">{fmt(item.qty * item.price)}</span>
                    <button className="catalog-order-item__remove" onClick={() => updateCart(item, -item.qty)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="catalog-order-grand-total">
                <span className="catalog-order-grand-total__label">Total</span>
                <span className="catalog-order-grand-total__value">{fmt(cartTotal)}</span>
              </div>

              <button className="catalog-order-place-btn" onClick={handlePlaceOrder}>
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
