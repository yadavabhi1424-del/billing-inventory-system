import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscovery, getConnections, sendConnectionRequest, getOwnProfile, getCatalog, placeB2BOrder } from '../services/api';
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import './Discovery.css';

const INITIAL_CATEGORIES = ['All', 'general', 'retail', 'food', 'pharmacy', 'electronics', 'clothing', 'auto_parts', 'hardware', 'stationery', 'textile'];

const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function DiscoveryPage({ user }) {
  const oppositeType = user?.userType === 'supplier' ? 'shop' : 'supplier';
  const oppositeName = oppositeType === 'supplier' ? 'Suppliers' : 'Shops';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [userLoc, setUserLoc] = useState({ lat: 20.5937, lng: 78.9629 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [cart, setCart] = useState({}); // { productId: { ...product, qty } }
  const catMenuRef = useRef(null);
  const [fallback, setFallback] = useState(false);

  const [filters, setFilters] = useState({
    type: oppositeType,
    business_type: user?.business_type || 'All',
    search: '',
    match_my_category: true
  });

  const [viewMode, setViewMode] = useState('grid');
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: "YOUR_API_KEY_HERE" });

  const fetchCatalog = async (supplierId) => {
    setCatalogLoading(true);
    try {
      const res = await getCatalog(supplierId);
      if (res.success) setCatalog(res.data);
    } catch (err) {
      console.error("Failed to fetch catalog", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleCheckNearby = () => {
    setFilters(prev => ({ ...prev, match_my_category: true, search: '' }));
  };

  const handleAddCategory = (newCat) => {
    if (!categories.includes(newCat)) {
      setCategories([...categories, newCat]);
    }
    setFilters({ ...filters, business_type: newCat, match_my_category: false });
    setShowCatMenu(false);
  };

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDiscovery({
        ...filters,
        page,
        limit: 20
      });
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

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (selectedItem && selectedItem.entity_type === 'supplier') {
      // Use slug for catalog fetching instead of entity_id (db_name) to avoid mismatches
      fetchCatalog(selectedItem.slug || selectedItem.entity_id);
    } else {
      setCatalog([]);
    }
    setCart({}); // Reset cart when switching profiles
  }, [selectedItem]);

  const updateCart = (product, delta) => {
    setCart(prev => {
      const existing = prev[product.product_id];
      const newQty = (existing?.qty || 0) + delta;
      
      if (newQty <= 0) {
        const { [product.product_id]: _, ...rest } = prev;
        return rest;
      }
      
      return { 
        ...prev, 
        [product.product_id]: { ...product, qty: newQty } 
      };
    });
  };

  const handlePlaceOrder = async () => {
    const items = Object.values(cart);
    if (!items.length) return alert("Your cart is empty!");
    
    try {
      const res = await placeB2BOrder({ 
        supplier_id: selectedItem.entity_id, 
        items 
      });
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
        <input className="discovery__main-search" placeholder={`Search for ${oppositeName.toLowerCase()}...`} value={filters.search}
          onChange={e => { setFilters({ ...filters, search: e.target.value, match_my_category: false }); setPage(1); }} />
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
        <button className="discovery-nearby-btn" onClick={handleCheckNearby}>📍 Nearby Partners</button>
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
                  {item.logo ? <img src={item.logo} /> : <span>{item.entity_type === 'supplier' ? '🏭' : '🏪'}</span>}
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

      {/* OVERLAY LAYERS: Map Modal & Partner Modal */}
      {viewMode === 'map' && (
        <div className="discovery-modal-overlay" onClick={() => setViewMode('grid')}>
          {!isLoaded ? (
            <div className="discovery-map-modal error-state">
              <div className="map-modal-header">
                <h2>🗺️ Interactive Discovery Map</h2>
                <button className="close-btn-inline" onClick={() => setViewMode('grid')}>×</button>
              </div>
              <div className="error-body">
                <h3>Map Could Not Be Loaded</h3>
                <p>This is usually due to missing authorization or project billing configuration.</p>
                <button className="connect-btn" onClick={() => setViewMode('grid')}>Return to Grid</button>
              </div>
            </div>
          ) : (
            <div className={`discovery-map-modal ${isMapMaximized ? 'maximized' : ''}`} onClick={e => e.stopPropagation()}>
              <div className="map-modal-header">
                <h2>🗺️ Interactive Discovery Map</h2>
                <div className="map-modal-actions">
                  <button className="maximize-btn" onClick={() => setIsMapMaximized(!isMapMaximized)}>
                    {isMapMaximized ? '🗗 Minimize' : '🗖 Maximize'}
                  </button>
                  <button className="close-btn-inline" onClick={() => setViewMode('grid')}>×</button>
                </div>
              </div>

              <div className="discovery__map-container-modal">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={userLoc}
                  zoom={12}
                  options={{ styles: mapStyles }}
                  onLoad={onLoad}
                >
                  <Marker position={userLoc} icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" label="You" />
                  {items.filter(i => i.latitude).map(item => (
                    <Marker
                      key={item.profile_id}
                      position={{ lat: Number(item.latitude), lng: Number(item.longitude) }}
                      onClick={() => setSelectedItem(item)}
                      icon={item.entity_type === 'supplier' ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png" : "https://maps.google.com/mapfiles/ms/icons/green-dot.png"}
                    />
                  ))}
                </GoogleMap>

                <div className="map-overlay-modal">
                  <div className="map-info-panel">
                    <p>Showing <strong>{items.length}</strong> partners near you.</p>
                    <div className="map-partner-list">
                      {items.map(i => (
                        <div key={i.profile_id} className="map-partner-pin" onClick={() => setSelectedItem(i)}>
                          <strong>{i.business_name}</strong>
                          <span>{i.distance ? `${Number(i.distance).toFixed(1)} km` : i.city}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <div className="discovery-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="discovery-modal discovery-modal--catalog" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>

            <div className="modal-header-compact">
              <div className="modal-logo-compact">
                {selectedItem.logo ? <img src={selectedItem.logo} /> : <span>{selectedItem.entity_type === 'supplier' ? '🏭' : '🏪'}</span>}
              </div>
              <div className="modal-info-compact">
                <h2>{selectedItem.business_name}</h2>
                <div className="modal-sub-info">
                  <span className="category-pill">{selectedItem.business_type}</span>
                  <span className="modal-contact">📞 {selectedItem.phone || 'N/A'}</span>
                  <span className="modal-contact">📧 {selectedItem.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="modal-layout-main" style={{ 
              display: 'grid', 
              gridTemplateColumns: cartItems.length > 0 ? '1fr 360px' : '1fr' 
            }}>
              {/* Catalog Section */}
              <div className="modal-catalog">
                {catalogLoading ? (
                  <div className="catalog-loading">Loading catalog...</div>
                ) : catalog.length === 0 ? (
                  <div className="catalog-empty">No products listed by this supplier.</div>
                ) : (
                  <div className="catalog-grid">
                    {catalog.map(prod => (
                      <div key={prod.product_id} className="catalog-card">
                        {prod.image && <img src={prod.image} className="catalog-card__img" alt={prod.name} />}
                        <div className="catalog-card__details">
                          <h4>{prod.name}</h4>
                          <p className="sku">{prod.sku}</p>
                          <div className="catalog-card__footer">
                            <span className="price">₹{prod.price}</span>
                            <div className="qty-controls">
                              <button onClick={() => updateCart(prod, -1)} disabled={!cart[prod.product_id]}>−</button>
                              <span>{cart[prod.product_id]?.qty || 0}</span>
                              <button onClick={() => updateCart(prod, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Cart */}
              {cartItems.length > 0 && (
                <div className="modal-sidebar-cart visible">
                  <h3>My Order</h3>
                  <div className="cart-items-list">
                    {cartItems.map(item => (
                      <div key={item.product_id} className="cart-item-row">
                        <div className="cart-item-info">
                          <div className="name">{item.name}</div>
                          <div className="sub">₹{item.price} × {item.qty}</div>
                        </div>
                        <div className="item-total">₹{item.price * item.qty}</div>
                      </div>
                    ))}
                  </div>
                  <div className="cart-footer">
                    <div className="cart-total-row">
                      <span>Total Amount</span>
                      <strong>₹{cartTotal}</strong>
                    </div>
                    <button className="place-order-btn" onClick={handlePlaceOrder}>
                      Place Order Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
