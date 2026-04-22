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

            {/* Header */}
            <div className="catalog-modal__header">
              <div className="supplier-profile-header">
                <div className="header-topline">
                  <div className="business-main">
                    <h2>{selectedItem.business_name}</h2>
                    {selectedItem.owner_name && (
                      <span className="owner-badge">Owner: {selectedItem.owner_name}</span>
                    )}
                  </div>
                  <div className="header-actions">
                    <button className="close-catalog-btn" onClick={() => setSelectedItem(null)}>✕</button>
                  </div>
                </div>
                <div className="header-details">
                  {selectedItem.phone && (
                    <div className="header-detail-item">
                      <span>○</span>
                      <span>{selectedItem.phone}</span>
                    </div>
                  )}
                  <div className="header-detail-item">
                    <span>○</span>
                    <span>{selectedItem.email || 'No email provided'}</span>
                  </div>
                  {(selectedItem.address || selectedItem.city) && (
                    <div className="header-detail-item">
                      <span>○</span>
                      <span>
                        {[selectedItem.address, selectedItem.city, selectedItem.state, selectedItem.pincode]
                          .filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="catalog-modal__body">
              <div className="catalog-modal__split" style={{
                gridTemplateColumns: cartItems.length > 0 ? '1fr 360px' : '1fr'
              }}>
                {/* Catalog Products */}
                <div className="catalog-products">
                  {selectedItem.entity_type === 'supplier' && (
                    <div className="catalog-search-bar">
                      <span style={{ color: 'var(--color-text-muted)', display: 'flex' }}>🔍</span>
                      <input
                        placeholder="Search products in this catalog..."
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="catalog-grid">
                    {catalogLoading ? (
                      <div className="catalog-loading-state">
                        <div className="app-loading__spinner" />
                        <p>Loading catalog...</p>
                      </div>
                    ) : selectedItem.entity_type === 'shop' ? (
                      <div className="catalog-empty-state" style={{flexDirection:'column', gap:'12px', padding: '2rem'}}>
                         <div style={{fontSize: '2.5rem'}}>🏬</div>
                         <div style={{fontSize: '1.25rem', color: 'var(--color-text-primary)', fontWeight: 700}}>Retail Partner Profile</div>
                         <p style={{color: 'var(--color-text-muted)'}}>This is a retail shop. They do not list a B2B wholesale catalog.</p>
                         
                         <div style={{marginTop: '1.5rem', padding: '1.5rem', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '500px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-sm)'}}>
                             <div>
                               <strong style={{color: 'var(--color-text-primary)', fontSize: '1.15rem'}}>{selectedItem.business_name}</strong>
                               {selectedItem.owner_name && <div style={{color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '4px', fontWeight: 500}}>Owner: {selectedItem.owner_name}</div>}
                             </div>
                             
                             <div style={{display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--color-text-secondary)', fontSize: '0.9rem'}}>
                               <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                 <span style={{color: 'var(--color-text-muted)'}}>✉️</span> <span>{selectedItem.email || 'No email provided'}</span>
                               </div>
                               {selectedItem.phone && (
                                 <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                   <span style={{color: 'var(--color-text-muted)'}}>📞</span> <span>{selectedItem.phone}</span>
                                 </div>
                               )}
                               <div style={{display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
                                 <span style={{color: 'var(--color-text-muted)'}}>📍</span> <span style={{lineHeight: 1.4}}>{[selectedItem.address, selectedItem.city, selectedItem.state, selectedItem.pincode].filter(Boolean).join(', ') || 'No address provided'}</span>
                               </div>
                             </div>

                             {selectedItem.description && (
                               <div style={{marginTop: '4px', paddingTop: '16px', borderTop: '1px solid var(--color-border)'}}>
                                 <strong style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)'}}>About Shop</strong>
                                 <p style={{marginTop: '8px', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: '0.9rem'}}>{selectedItem.description}</p>
                               </div>
                             )}
                         </div>
                      </div>
                    ) : catalog.length === 0 ? (
                      <div className="catalog-empty-state">No products listed by this supplier.</div>
                    ) : (
                      catalog
                        .filter(p => (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()))
                        .map(prod => (
                          <div key={prod.product_id} className="catalog-card">
                            {prod.image && <img src={prod.image} className="catalog-card__img" alt={prod.name} />}
                            <div className="catalog-card__body">
                              <span className="catalog-card__sku">SKU: {prod.sku || 'N/A'}</span>
                              <h4 className="catalog-card__title">{prod.name}</h4>
                              {prod.description && <p className="catalog-card__desc">{prod.description}</p>}
                              <div className="catalog-card__footer">
                                <span className="catalog-card__price">{fmt(prod.price)}</span>
                                <div className="catalog-card__qty-control">
                                  <button onClick={() => updateCart(prod, -1)} disabled={!cart[prod.product_id]}>-</button>
                                  <input 
                                    type="number"
                                    min="0"
                                    className="hide-spinners"
                                    value={cart[prod.product_id]?.qty || 0}
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 0;
                                      const current = cart[prod.product_id]?.qty || 0;
                                      updateCart(prod, val - current);
                                    }}
                                    style={{ width: '40px', textAlign: 'center', background: 'transparent', border: '1px solid rgba(150,150,150,0.3)', color: 'inherit', borderRadius: '4px', fontWeight: 'bold', margin: '0 5px' }}
                                  />
                                  <button onClick={() => updateCart(prod, 1)}>+</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Order Summary Sidebar */}
                {cartItems.length > 0 && (
                  <div className="catalog-cart">
                    <div className="cart-header">
                      <h3>Order Summary</h3>
                      <span className="cart-badge">{cartItems.length} items</span>
                    </div>
                    <div className="cart-items-list">
                      {cartItems.map(item => (
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
                        <strong className="total-amount">{fmt(cartTotal)}</strong>
                      </div>
                      <button className="catalog-place-order-btn" onClick={handlePlaceOrder}>
                        Confirm B2B Order
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
