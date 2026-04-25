import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../components/Icon';
import { getAllB2BReturns, processB2BReturn, rejectB2BReturn, getB2BOrderById } from '../../services/api';
import './B2BReturns.css'; // Use the new dedicated styling

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

const STATUS_MAP = {
  PENDING:  { label: 'Pending',   cls: 'pending' },
  APPROVED: { label: 'Approved',  cls: 'approved' },
  REJECTED: { label: 'Rejected',  cls: 'rejected' },
};

const ROWS_PER_PAGE = 10;

export default function B2BReturns({ user, filterDate }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [filter,  setFilter]  = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Modal states
  const [processModal, setProcessModal] = useState(null);
  const [processItems, setProcessItems] = useState([]);
  const [processLoading, setProcessLoading] = useState(false);

  const isSupplier = user?.userType === 'supplier';

  useEffect(() => {
    fetchReturns();
  }, [filterDate]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await getAllB2BReturns({ ...filterDate });
      if (res.success) setReturns(res.data);
    } catch (err) {
      console.error("Fetch returns error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter.toUpperCase();
  });

  const totalPages = Math.ceil(filteredReturns.length / ROWS_PER_PAGE);
  const paginatedReturns = filteredReturns.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  // ── Processing Logic ──────────────────────────────────────────
  const handleOpenProcess = (ret) => {
    setProcessModal({ returnReq: ret });
    setProcessItems(ret.items.map(ri => ({
      id: ri.id,
      name: ri.name,
      sku: ri.sku,
      unit_price: ri.unit_price,
      max_qty: ri.return_qty,
      current_qty: ri.return_qty,
      product_id: ri.product_id
    })));
  };

  const handleCloseProcess = () => {
    setProcessModal(null);
    setProcessItems([]);
    setProcessLoading(false);
  };

  const handleProcessQtyChange = (id, val) => {
    const qty = parseInt(val) || 0;
    setProcessItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, current_qty: Math.max(0, Math.min(qty, item.max_qty)) };
      }
      return item;
    }));
  };

  const handleConfirmProcess = async () => {
    try {
      setProcessLoading(true);
      const final_items = processItems.map(pi => ({
        return_item_id: pi.id,
        return_qty: pi.current_qty
      }));
      
      const res = await processB2BReturn(processModal.returnReq.order_id, processModal.returnReq.return_id, final_items);
      if (res.success) {
        handleCloseProcess();
        fetchReturns();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const handleRejectReturn = async () => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    
    try {
      setProcessLoading(true);
      const res = await rejectB2BReturn(processModal.returnReq.order_id, processModal.returnReq.return_id, reason);
      if (res.success) {
        handleCloseProcess();
        fetchReturns();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const processTotalRefund = processItems.reduce((s, i) => s + i.current_qty * Number(i.unit_price), 0);

  return (
    <div className="b2b-returns-container">
      
      <div className="returns-header">
        <div className="header-left">
          <h1>Return Requests</h1>
          <p>{filteredReturns.length} active return requests found</p>
        </div>
        
        <div className="header-filters">
          <div className="filter-group">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button 
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => { setFilter(f); setPage(0); }}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="refresh-btn" onClick={fetchReturns} title="Refresh Data">
            <Icon name="refresh" size={18} />
          </button>
        </div>
      </div>

      <div className="returns-table-container">
        {loading ? (
          <div className="loading-state" style={{ padding: '80px', textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: 20, color: 'var(--color-text-muted)' }}>Fetching your returns...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="empty-state-wrapper">
            <Icon name="box" size={56} />
            <h3>No returns found</h3>
            <p>We couldn't find any return requests matching your current filter.</p>
          </div>
        ) : (
          <table className="returns-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Order Reference</th>
                <th>{isSupplier ? 'Requested By' : 'Supplier'}</th>
                <th>Items Detail</th>
                <th>Refund Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReturns.map(r => (
                <tr key={r.return_id} className="return-row" onClick={() => setSelectedReturn(r)}>
                  <td>
                    <div className="cell-date">
                      <span className="main-date">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="sub-date">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td>
                    <span className="order-ref-badge">#{r.order_id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="cell-partner">
                      <div className="partner-avatar">{isSupplier ? (r.shop_name?.charAt(0) || 'S') : (r.supplier_name?.charAt(0) || 'S')}</div>
                      <span className="partner-name">{isSupplier ? r.shop_name : r.supplier_name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-items">
                      <span className="item-count">{r.items?.length || 0} {r.items?.length === 1 ? 'Item' : 'Items'}</span>
                      <span className="item-preview">
                        {r.items?.slice(0, 2).map(i => i.name).join(', ')}
                        {r.items?.length > 2 && '...'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="amount-display">{fmt(r.total_refund_amount)}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${STATUS_MAP[r.status]?.cls || ''}`}>
                      {STATUS_MAP[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="actions-wrapper">
                      {isSupplier && r.status === 'PENDING' ? (
                        <button 
                          className="action-btn-primary"
                          onClick={(e) => { e.stopPropagation(); handleOpenProcess(r); }}
                        >
                          Review & Process
                        </button>
                      ) : (
                        <button className="action-btn-icon" title="View Details">
                          <Icon name="billing" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info" style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Showing <strong>{page * ROWS_PER_PAGE + 1}</strong> to <strong>{Math.min((page + 1) * ROWS_PER_PAGE, filteredReturns.length)}</strong> of {filteredReturns.length} entries
          </div>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
            <div className="page-numbers">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i} 
                  className={`num-btn ${page === i ? 'active' : ''}`}
                  onClick={() => setPage(i)}
                >{i + 1}</button>
              ))}
            </div>
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* ── Details Panel ────────────────────────────────────────── */}
      {selectedReturn && createPortal(
        <>
          <div className={`side-panel-overlay ${selectedReturn ? 'open' : ''}`} onClick={() => setSelectedReturn(null)} />
          <div className={`side-panel ${selectedReturn ? 'open' : ''}`}>
            <div className="side-panel__content">
              <div className="side-panel__header">
                <div className="header-top">
                  <span className="order-tag">Return Request</span>
                  <button className="close-btn" onClick={() => setSelectedReturn(null)}><Icon name="x" size={20} /></button>
                </div>
                <h2>Order #{selectedReturn.order_id.slice(0, 8).toUpperCase()}</h2>
                <div className="header-meta">
                  <span className={`status-pill status-pill--large ${STATUS_MAP[selectedReturn.status]?.cls}`}>
                    {STATUS_MAP[selectedReturn.status]?.label}
                  </span>
                  <span className="date">{new Date(selectedReturn.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="side-panel__body">
                <div className="info-section">
                  <h3>{isSupplier ? 'From Shop' : 'Supplier Details'}</h3>
                  <div className="info-card">
                    <div className="info-card__row"><Icon name="box" size={14} /><strong>{isSupplier ? selectedReturn.shop_name : selectedReturn.supplier_name}</strong></div>
                  </div>
                </div>

                <div className="items-section">
                  <h3>Returned Items</h3>
                  <div className="items-list">
                    {selectedReturn.items?.map(item => (
                      <div key={item.id} className="item-row">
                        <div className="item-info"><span className="item-name">{item.name}</span><span className="item-sku">{item.sku}</span></div>
                        <div className="item-qty">{item.return_qty} × {fmt(item.unit_price)}</div>
                        <div className="item-total">{fmt(item.refund_amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedReturn.reason && (
                  <div className="notes-section">
                    <h3>Reason for Return</h3>
                    <p>{selectedReturn.reason}</p>
                  </div>
                )}
              </div>

              <div className="side-panel__footer">
                <div className="footer-actions">
                  {isSupplier && selectedReturn.status === 'PENDING' && (
                    <button className="panel-btn btn-primary" onClick={() => handleOpenProcess(selectedReturn)}>Process Return</button>
                  )}
                  <button className="panel-btn btn-outline" onClick={() => setSelectedReturn(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── Process Modal ────────────────────────────────────────── */}
      {processModal && createPortal(
        <div className="return-modal-overlay" onClick={handleCloseProcess}>
          <div className="return-modal" onClick={e => e.stopPropagation()}>
            <div className="return-modal__header">
              <div>
                <h2>Process Return Request</h2>
                <p>Order #{processModal.returnReq.order_id?.slice(0, 8).toUpperCase()}</p>
              </div>
              <button className="close-btn" onClick={handleCloseProcess}><Icon name="x" size={20} /></button>
            </div>

            <div className="return-modal__body">
              {processModal.returnReq.reason && (
                <div className="return-modal__hint" style={{ borderLeftColor: 'var(--color-warning)', padding: '10px 15px', background: 'rgba(245,158,11,0.1)', borderRadius: 4, margin: '15px 0' }}>
                  <strong>Shop's Reason:</strong> {processModal.returnReq.reason}
                </div>
              )}

              <p style={{ margin: '10px 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Review items and adjust quantities if needed.
              </p>

              <div className="return-items-list" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                {processItems.map(item => (
                  <div key={item.id} className="return-item-row return-item-row--selected" style={{ gridTemplateColumns: '1fr 80px 120px 90px', gap: 10, padding: '12px 15px', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="return-item-info">
                      <span className="return-item-name" style={{ fontWeight: 600, display: 'block' }}>{item.name}</span>
                      <span className="return-item-sku" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.sku} · Max: {item.max_qty}</span>
                    </div>
                    <div className="return-item-price" style={{ fontSize: '0.9rem' }}>{fmt(item.unit_price)}</div>
                    <div className="return-item-qty" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-bg-base)' }} onClick={() => handleProcessQtyChange(item.id, item.current_qty - 1)}>−</button>
                      <input 
                        type="number" 
                        value={item.current_qty} 
                        onChange={e => handleProcessQtyChange(item.id, e.target.value)}
                        style={{ width: 45, textAlign: 'center', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontWeight: 700 }}
                      />
                      <button style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-bg-base)' }} onClick={() => handleProcessQtyChange(item.id, item.current_qty + 1)}>+</button>
                    </div>
                    <div className="return-item-refund" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.current_qty * Number(item.unit_price))}</div>
                  </div>
                ))}
              </div>

              <div className="return-modal__summary" style={{ marginTop: 20, padding: '15px 0', borderTop: '2px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{processItems.filter(i => i.current_qty > 0).length} item(s) approved</span>
                <div className="return-refund-total">
                  <span style={{ marginRight: 10 }}>Total Refund:</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--color-accent-primary)' }}>{fmt(processTotalRefund)}</strong>
                </div>
              </div>
            </div>

            <div className="return-modal__footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 15, marginTop: 20 }}>
              <button className="panel-btn btn-reject" style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600 }} disabled={processLoading} onClick={handleRejectReturn}>Reject Entirely</button>
              <div style={{ display: 'flex', gap: 12, flex: 2 }}>
                <button className="panel-btn btn-outline" style={{ flex: 1 }} onClick={handleCloseProcess}>Cancel</button>
                <button className="panel-btn btn-primary" style={{ flex: 2 }} disabled={processLoading} onClick={handleConfirmProcess}>
                  {processLoading ? 'Processing...' : `Approve & Refund`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
