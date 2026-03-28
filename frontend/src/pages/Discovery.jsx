import React, { useState, useEffect } from 'react';
import { getDiscovery } from '../services/api';
import './Discovery.css';

const TYPES    = ['All', 'shop', 'supplier'];
const BIZ_TYPES = ['All', 'general', 'retail', 'food', 'pharmacy', 'electronics', 'clothing', 'other'];

export default function DiscoveryPage({ user }) {
  const oppositeType = user?.userType === 'supplier' ? 'shop' : 'supplier';
  const oppositeName = oppositeType === 'supplier' ? 'Suppliers' : 'Shops';

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: oppositeType, city: '', business_type: '', search: '' });
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDiscovery({ ...filters, page, limit: 24 })
      .then(res => {
        if (!cancelled) {
          setItems(res.data);
          setTotal(res.pagination?.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, page]);

  const set = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="discovery">
      <div className="discovery__header">
        <h1>Discover {oppositeName}</h1>
        <p>Find {oppositeName.toLowerCase()} on the platform to connect with</p>
      </div>

      {/* Filters */}
      <div className="discovery__filters">
        <input
          className="discovery__search"
          placeholder="Search by name…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
        />
        <select value={filters.business_type} onChange={e => set('business_type', e.target.value === 'All' ? '' : e.target.value)}>
          {BIZ_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          className="discovery__city"
          placeholder="City…"
          value={filters.city}
          onChange={e => set('city', e.target.value)}
        />
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
              
              <div className="discovery-modal__section">
                <h3>Contact & Location</h3>
                <div className="discovery-modal__contact-grid">
                  {selectedItem.email && <div>📞 {selectedItem.phone || 'Phone not provided'}</div>}
                  {selectedItem.email && <div>✉️ {selectedItem.email}</div>}
                  {(selectedItem.address || selectedItem.city) && (
                    <div style={{gridColumn: '1 / -1'}}>
                      📍 {selectedItem.address ? selectedItem.address + ', ' : ''} 
                         {selectedItem.city ? selectedItem.city : ''} 
                         {selectedItem.state ? ', ' + selectedItem.state : ''} 
                         {selectedItem.pincode ? ' - ' + selectedItem.pincode : ''}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="discovery-modal__actions">
                <button className="discovery-btn-connect">Connect Request</button>
                <button className="discovery-btn-message">Send Message</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
