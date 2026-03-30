import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDiscovery, getConnections, sendConnectionRequest, getOwnProfile } from '../services/api';
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
  const [fallback, setFallback] = useState(false);
  const [filters, setFilters] = useState({
    type: oppositeType,
    business_type: user?.business_type || 'All',
    search: '',
    match_my_category: true
  });

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [userLoc, setUserLoc] = useState({ lat: 20.5937, lng: 78.9629 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  const catMenuRef = useRef(null);
  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_KEY });
  const [map, setMap] = useState(null);
  const onLoad = useCallback(m => setMap(m), []);

  const handleCheckNearby = async () => {
    if (!navigator.geolocation) {
      fetchSavedLocation(true);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(newLoc);
        setViewMode('map');
      },
      () => {
        fetchSavedLocation(true);
      }
    );
  };

  useEffect(() => {
    // Initial auto-detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          // Note: No automatic switch to map mode on load
        },
        () => {
          fetchSavedLocation(false); 
        },
        { timeout: 5000 }
      );
    } else {
      fetchSavedLocation(false);
    }
  }, []);

  const fetchSavedLocation = async (shouldOpenMap = false) => {
    try {
      const res = await getOwnProfile();
      if (shouldOpenMap) setViewMode('map');
      if (res?.success && res.data?.latitude && res.data?.longitude) {
        setUserLoc({ lat: Number(res.data.latitude), lng: Number(res.data.longitude) });
      }
    } catch (err) {
      console.error("Failed to fetch saved location", err);
    }
    // Note: We don't force setViewMode('map') here anymore so it stays on grid by default
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = { ...filters, page, limit: 24 };

        // Radius filter only if map is active
        if (viewMode === 'map') {
          params.lat = userLoc.lat;
          params.lng = userLoc.lng;
        }

        const res = await getDiscovery(params);
        if (!cancelled && res.success) {
          setItems(res.data || []);
          setTotal(res.pagination?.total || 0);
          setFallback(res.fallback || false);
        }
      } catch (err) {
        console.error("Discovery error:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [filters, page, userLoc, viewMode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) setShowCatMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async (partnerId) => {
    try {
      const res = await sendConnectionRequest(partnerId);
      if (res.success) alert("Connection request sent!");
    } catch (err) {
      alert(err.message || "Failed to send request.");
    }
  };

  const handleAddCategory = (cat) => {
    const cleaned = cat.trim().toLowerCase();
    if (cleaned && !categories.includes(cleaned)) setCategories([...categories, cleaned]);
    setFilters({ ...filters, business_type: cleaned, match_my_category: false });
    setShowCatMenu(false);
    setPage(1);
  };

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
          {fallback && (<div className="discovery__fallback-notice"><h3>No exact matches.</h3><p>Recommended instead:</p></div>)}

          <div className="discovery__grid">
            {items.map(item => (
              <div key={item.profile_id} className="discovery-card" onClick={() => setSelectedItem(item)}>
                <div className="discovery-card__image">
                  {item.logo ? <img src={item.logo} /> : <span>{item.entity_type === 'supplier' ? '🏭' : '🏪'}</span>}
                  <span className={`badge badge--${item.entity_type}`}>{item.entity_type}</span>
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
          <div className="discovery-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>
            <div className="modal-header">
              <div className="modal-logo">{selectedItem.logo ? <img src={selectedItem.logo} /> : <span>{selectedItem.entity_type === 'supplier' ? '🏭' : '🏪'}</span>}</div>
              <div><h2>{selectedItem.business_name}</h2><span className="category-pill">{selectedItem.business_type}</span></div>
            </div>
            <div className="modal-body">
              <p className="description">{selectedItem.description || "No description provided."}</p>
              <div className="contact-info">
                <div className="info-item">📞 {selectedItem.phone || 'N/A'}</div>
                <div className="info-item">📧 {selectedItem.email || 'N/A'}</div>
                <div className="info-item">📍 {selectedItem.address || selectedItem.city || 'N/A'}</div>
              </div>
              <div className="modal-actions">
                <button className="connect-btn" onClick={() => handleConnect(selectedItem.entity_id)}>Connect</button>
                <button className="message-btn">Message</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
