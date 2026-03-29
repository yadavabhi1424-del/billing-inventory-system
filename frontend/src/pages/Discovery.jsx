import React, { useState, useEffect } from 'react';
import { getDiscovery, getConnections, sendConnectionRequest } from '../services/api';
import './Discovery.css';

const TYPES    = ['All', 'shop', 'supplier'];
const BIZ_TYPES = ['All', 'general', 'retail', 'food', 'pharmacy', 'electronics', 'clothing', 'other'];

export default function DiscoveryPage({ user }) {
  const oppositeType = user?.userType === 'supplier' ? 'shop' : 'supplier';
  const oppositeName = oppositeType === 'supplier' ? 'Suppliers' : 'Shops';

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters,    setFilters]    = useState({ type: oppositeType, city: '', business_type: '', search: '', radius: 50, nearMe: false });
  const [userLoc,   setUserLoc]   = useState(null);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemCatalog,  setItemCatalog]  = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [connections,  setConnections]  = useState([]);

  useEffect(() => {
    if (filters.nearMe && !userLoc) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setFilters(f => ({ ...f, nearMe: false }))
      );
    }
  }, [filters.nearMe]);

  useEffect(() => {
    let cancelled = false;
    const fetchDiscoveryData = async () => {
      setLoading(true);
      try {
        const params = { ...filters, page, limit: 24 };
        if (filters.nearMe && userLoc) {
          params.lat = userLoc.lat;
          params.lng = userLoc.lng;
        }
        const [discRes, connRes] = await Promise.all([
          getDiscovery(params),
          getConnections()
        ]);
        if (!cancelled && discRes.success) {
          setItems(discRes.data);
          setTotal(discRes.pagination.total);
        }
        if (!cancelled && connRes.success) {
          setConnections(connRes.data);
        }
      } catch (err) {
        // Handle error silently or via state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDiscoveryData();
    return () => { cancelled = true; };
  }, [filters, page, userLoc]);

  useEffect(() => {
    if (selectedItem && selectedItem.entity_type === 'supplier') {
      const fetchCatalog = async () => {
        setCatalogLoading(true);
        try {
          // getSupplierCatalog(supplierId, params)
          const { getSupplierCatalog } = await import('../services/api');
          const res = await getSupplierCatalog(selectedItem.entity_id, { limit: 6 });
          if (res.success) setItemCatalog(res.data);
          else setItemCatalog([]);
        } catch {
          setItemCatalog([]);
        } finally {
          setCatalogLoading(false);
        }
      };
      fetchCatalog();
    } else {
      setItemCatalog([]);
    }
  }, [selectedItem]);

  const handleConnect = async (partnerId) => {
    try {
      const res = await sendConnectionRequest(partnerId);
      if (res.success) {
        // instantly update local state to reflect Pending status
        setConnections(prev => [...prev, { partner_id: partnerId, status: 'PENDING', initiated_by: user?.userType || 'shop' }]);
        alert("Connection request sent successfully!");
      }
    } catch (err) {
      alert(err.message || "Failed to send connect request.");
    }
  };

  const set = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="discovery">
      <div className="discovery__header">
        <h1>Discover {oppositeName}</h1>
        <p>Find {oppositeName.toLowerCase()} on the platform to connect with</p>
      </div>

      {/* Filters */}
      <div className="discovery__filters">
        <div className="discovery-filters__main">
          <input
            className="discovery__search"
            placeholder="Search by name…"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
          <select value={filters.business_type} onChange={e => setFilters({ ...filters, business_type: e.target.value === 'All' ? '' : e.target.value })}>
            {BIZ_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input
            className="discovery__city"
            placeholder="City…"
            value={filters.city}
            onChange={e => setFilters({ ...filters, city: e.target.value })}
          />
        </div>

        <div className="discovery-filters__geo">
          <label className="discovery-geo-toggle">
            <input 
              type="checkbox" 
              checked={filters.nearMe} 
              onChange={e => setFilters({ ...filters, nearMe: e.target.checked })} 
            />
            <span>Near me</span>
          </label>
          
          {filters.nearMe && (
            <div className="discovery-geo-radius">
              <input 
                type="range" min="1" max="500" 
                value={filters.radius} 
                onChange={e => setFilters({ ...filters, radius: e.target.value })} 
              />
              <span className="radius-value">{filters.radius}km</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="discovery__loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="discovery__empty">No results found.</div>
      ) : (
        <>
          <p className="discovery__count">{total} result{total !== 1 ? 's' : ''}</p>
          <div className="discovery__grid">
            {items.map(item => (
              <div key={item.profile_id} className="discovery-card" onClick={() => setSelectedItem(item)}>
                {item.logo
                  ? <img className="discovery-card__logo" src={item.logo} alt={item.business_name} />
                  : <div className="discovery-card__logo-placeholder">
                      {item.entity_type === 'supplier' ? '🏭' : '🏪'}
                    </div>
                }
                <div className="discovery-card__body">
                  <span className={`discovery-card__badge discovery-card__badge--${item.entity_type}`}>
                    {item.entity_type}
                  </span>
                  <h3 className="discovery-card__name">{item.business_name}</h3>
                  {item.city && <p className="discovery-card__location">📍 {item.city}{item.state ? `, ${item.state}` : ''}</p>}
                  {item.description && <p className="discovery-card__desc">{item.description}</p>}
                  <span className="discovery-card__type">{item.business_type}</span>
                  {item.distance && <span className="discovery-card__distance">{Number(item.distance).toFixed(1)} km away</span>}
                </div>
              </div>
            ))}
          </div>

          {total > 24 && (
            <div className="discovery__pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page}</span>
              <button disabled={items.length < 24} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="discovery-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="discovery-modal" onClick={e => e.stopPropagation()}>
            <button className="discovery-modal__close" onClick={() => setSelectedItem(null)}>×</button>
            
            <div className="discovery-modal__header">
              {selectedItem.logo 
                ? <img className="discovery-modal__logo" src={selectedItem.logo} alt="Logo" />
                : <div className="discovery-modal__logo-placeholder">{selectedItem.entity_type === 'supplier' ? '🏭' : '🏪'}</div>
              }
              <div>
                <span className={`discovery-card__badge discovery-card__badge--${selectedItem.entity_type}`}>
                  {selectedItem.entity_type}
                </span>
                <h2 className="discovery-modal__name">{selectedItem.business_name}</h2>
                <div className="discovery-modal__type">{selectedItem.business_type}</div>
              </div>
            </div>

            <div className="discovery-modal__body">
              {selectedItem.description && (
                <div className="discovery-modal__section">
                  <h3>About</h3>
                  <p>{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.entity_type === 'supplier' && (
                <div className="discovery-modal__section">
                  <h3>Supplies</h3>
                  {catalogLoading ? (
                    <p style={{opacity: 0.5}}>Loading offerings...</p>
                  ) : itemCatalog.length > 0 ? (
                    <div className="discovery-modal__product-tags">
                      {itemCatalog.map(p => (
                        <span key={p.id} className="discovery-modal__tag">{p.name}</span>
                      ))}
                      {itemCatalog.length >= 6 && <span>...and more</span>}
                    </div>
                  ) : (
                    <p style={{opacity: 0.5}}>No products listed yet.</p>
                  )}
                </div>
              )}
              
              <div className="discovery-modal__section">
                <h3>Contact & Location</h3>
                <div className="discovery-modal__contact-grid">
                  <div className="discovery-modal__contact-card">
                    <Icon name="reports" size={20} style={{color:'var(--color-accent-primary)'}} />
                    <span>{selectedItem.phone || 'No phone provided'}</span>
                  </div>
                  <div className="discovery-modal__contact-card">
                    <Icon name="inventory" size={20} style={{color:'var(--color-accent-primary)'}} />
                    <span>{selectedItem.email || 'No email provided'}</span>
                  </div>
                </div>
                {selectedItem.address && (
                  <p className="discovery-modal__address">📍 {selectedItem.address}, {selectedItem.city}</p>
                )}
                
                {selectedItem.latitude && selectedItem.longitude && (
                  <div className="discovery-modal__map-box">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedItem.latitude},${selectedItem.longitude}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="discovery-modal__map-link"
                    >
                      <Icon name="manufacturers" size={16} />
                      View on Google Maps
                    </a>
                    <span className="discovery-modal__coords">
                      {Number(selectedItem.latitude).toFixed(4)}, {Number(selectedItem.longitude).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="discovery-modal__actions">
                {(() => {
                  const partnerId = selectedItem.entity_id;
                  const conn = (connections || []).find(c => 
                    partnerId && c.partner_id && 
                    String(c.partner_id).toLowerCase() === String(partnerId).toLowerCase()
                  );

                  if (!conn) {
                    return (
                      <button className="discovery-btn-connect" onClick={() => handleConnect(partnerId)}>
                        Connect Request
                      </button>
                    );
                  }
                  if (conn.status === 'PENDING') {
                    const isInitiator = conn.initiated_by === user?.userType;
                    if (!isInitiator) {
                      return <button className="discovery-btn-connect" style={{background: '#f59e0b'}}>Review pending request in CRM</button>;
                    }
                    return <button className="discovery-btn-connect" disabled style={{opacity: 0.6}}>Request Pending</button>;
                  }
                  if (conn.status === 'ACCEPTED') {
                    return (
                      <button 
                        className="discovery-btn-connect" 
                        style={{background: '#22c55e', opacity: 1}}
                        onClick={() => window.location.href = '/b2b-store'}
                      >
                        Marketplace Connected ✓
                      </button>
                    );
                  }
                  return (
                    <button className="discovery-btn-connect" onClick={() => handleConnect(partnerId)}>
                      Connect Again
                    </button>
                  );
                })()}
                <button 
                  className="discovery-btn-message"
                  onClick={() => alert(`Messaging with ${selectedItem.business_name} is currently in development. You can reach them at ${selectedItem.email || selectedItem.phone || 'their profile contact'}.`)}
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
