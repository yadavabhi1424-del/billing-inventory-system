import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  getB2BOrders, 
  getB2BOrderById, 
  updateB2BOrderStatus, 
  createB2BReturn,
  processB2BReturn,
  rejectB2BReturn
} from '../../services/api';
import Icon from '../../components/Icon';
import './B2BOrders.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const STATUS_MAP = {
  PENDING:          { label: 'Pending',      cls: 'status--pending' },
  ACCEPTED:         { label: 'Accepted',     cls: 'status--accepted' },
  BILLED:           { label: 'Billed',       cls: 'status--billed' },
  CLOSED:           { label: 'Closed',       cls: 'status--closed' },
  REJECTED:         { label: 'Rejected',     cls: 'status--rejected' },
  RETURN_REQUESTED: { label: 'Return Req.',  cls: 'status--warning' },
  RETURN_PENDING_SHOP: { label: 'Pending',   cls: 'status--warning' },
  RETURNED:         { label: 'Returned',     cls: 'status--accepted' }
};

export default function B2BOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Shop Initiates Return
  const [returnModal, setReturnModal] = useState(null); // { order }
  const [returnItems, setReturnItems] = useState([]);   // [{ ...item, selected, return_qty }]
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(null); // { message }
  
  // Supplier Processes Return
  const [processModal, setProcessModal] = useState(null); // { order, returnReq }
  const [processItems, setProcessItems] = useState([]);   // [{ return_item_id, return_qty, max_qty, ... }]
  const [processLoading, setProcessLoading] = useState(false);

  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 10;

  const isSupplier = user?.userType === 'supplier';
  const navigate = useNavigate();

  const getDisplayStatus = (order) => {
    const retStatus = order.latest_return_status || (order.returns?.[0]?.status);

    if (order.status === 'RETURN_REQUESTED' || retStatus === 'PENDING') {
      return isSupplier ? 'RETURN_REQUESTED' : 'RETURN_PENDING_SHOP';
    }
    
    if (order.status === 'CLOSED' && retStatus === 'APPROVED') {
      return 'RETURNED';
    }

    return order.status;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getB2BOrders();
      if (res.success) setOrders(res.data);
    } catch (err) {
      console.error("Fetch orders failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPanel = async (orderId) => {
    try {
      const res = await getB2BOrderById(orderId);
      if (res.success) {
        setSelectedOrder(res.data);
        setPanelOpen(true);
      }
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const handleAction = async (id, status, reason) => {
    try {
      const res = await updateB2BOrderStatus(id, status, reason);
      if (res.success) {
        // Redirection logic for Inventory Review
        if (status === 'CLOSED' && res.unsyncedItems && res.unsyncedItems.length > 0) {
          const item = res.unsyncedItems[0];
          alert(`Order received. ${res.unsyncedItems.length} item(s) need review in your inventory. Opening review sequence...`);
          
          navigate('/inventory', {
            state: {
              reviewQueue: res.unsyncedItems, // Pass the whole list
              orderInfo: {
                supplierName: selectedOrder?.supplier_name,
                supplierId: selectedOrder?.supplier_id,
                supplierDbName: selectedOrder?.supplier_db_name,
                orderId: id,
              }
            }
          });
          return;
        }

        fetchOrders();
        if (selectedOrder?.order_id === id) {
          const detail = await getB2BOrderById(id);
          if (detail.success) setSelectedOrder(detail.data);
        }
        if (panelOpen && status === 'REJECTED') handleClosePanel();
        if (status === 'CLOSED') alert("Order received successfully.");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejectClick = (orderId) => {
    setRejectReason('');
    setRejectModal({ orderId });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    await handleAction(rejectModal.orderId, 'REJECTED', rejectReason.trim());
    setRejectModal(null);
    setRejectReason('');
  };

  // ── Shop Return Flow ──────────────────────────────────────────
  const handleOpenReturn = (order) => {
    const initItems = (order.items || []).map(item => ({
      ...item,
      selected: false,
      return_qty: 1,
    }));
    setReturnItems(initItems);
    setReturnReason('');
    setReturnSuccess(null);
    setReturnModal({ order });
  };

  const handleCloseReturn = () => {
    setReturnModal(null);
    setReturnItems([]);
    setReturnSuccess(null);
  };

  const handleToggleReturnItem = (itemId) => {
    setReturnItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, selected: !i.selected } : i
    ));
  };

  const handleReturnQtyChange = (itemId, val) => {
    setReturnItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const parsed = Math.max(1, Math.min(i.qty, parseInt(val) || 1));
      return { ...i, return_qty: parsed };
    }));
  };

  const selectedReturnItems = returnItems.filter(i => i.selected);
  const totalRefund = selectedReturnItems.reduce((sum, i) => sum + (i.return_qty * Number(i.price)), 0);

  const handleConfirmReturnRequest = async () => {
    if (!selectedReturnItems.length) {
      alert('Please select at least one item to return.');
      return;
    }

    setReturnLoading(true);
    try {
      const payload = selectedReturnItems.map(i => ({
        order_item_id: i.id,
        product_id:    i.product_id,
        name:          i.name,
        sku:           i.sku,
        return_qty:    i.return_qty,
        unit_price:    Number(i.price),
      }));

      const res = await createB2BReturn(returnModal.order.order_id, payload, returnReason.trim());
      if (res.success) {
        setReturnSuccess({ message: "Return requested successfully. The supplier will review." });
        fetchOrders();
        if (selectedOrder?.order_id === returnModal.order.order_id) {
          const detail = await getB2BOrderById(returnModal.order.order_id);
          if (detail.success) setSelectedOrder(detail.data);
        }
      }
    } catch (err) {
      alert('Return failed: ' + err.message);
    } finally {
      setReturnLoading(false);
    }
  };

  // ── Supplier Processing Flow ──────────────────────────────────
  const handleOpenProcess = async (order) => {
    try {
      // Find the pending return for this order
      const pendingReturn = (order.returns || []).find(r => r.status === 'PENDING');
      if (!pendingReturn) return alert("No pending return request found.");
      
      const initItems = (pendingReturn.items || []).map(ri => ({
        ...ri,
        max_qty: ri.return_qty,
        current_qty: ri.return_qty
      }));
      
      setProcessItems(initItems);
      setProcessModal({ order, returnReq: pendingReturn });
    } catch (e) { alert("Failed to open process modal"); }
  };

  const handleCloseProcess = () => {
    setProcessModal(null);
    setProcessItems([]);
  };

  const handleProcessQtyChange = (id, val) => {
    setProcessItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const parsed = Math.max(0, Math.min(i.max_qty, parseInt(val) || 0));
      return { ...i, current_qty: parsed };
    }));
  };

  const processTotalRefund = processItems.reduce((sum, i) => sum + (i.current_qty * Number(i.unit_price)), 0);

  const handleConfirmProcess = async () => {
    if (processItems.every(i => i.current_qty === 0)) {
      alert("Cannot process return with 0 quantities for all items. Did you mean to use 'Reject Entire Return'?");
      return;
    }

    setProcessLoading(true);
    try {
      const payload = processItems.map(i => ({
        return_item_id: i.id,
        return_qty: i.current_qty
      }));
      
      const res = await processB2BReturn(processModal.order.order_id, processModal.returnReq.return_id, payload);
      if (res.success) {
        alert("Return processed correctly.");
        handleCloseProcess();
        fetchOrders();
        if (selectedOrder?.order_id === processModal.order.order_id) {
          const detail = await getB2BOrderById(processModal.order.order_id);
          if (detail.success) setSelectedOrder(detail.data);
        }
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const handleRejectProcess = async () => {
    if (!window.confirm("Are you sure you want to reject this return request?")) return;
    setProcessLoading(true);
    try {
      const res = await rejectB2BReturn(processModal.order.order_id, processModal.returnReq.return_id, "Rejected by supplier");
      if (res.success) {
        handleCloseProcess();
        fetchOrders();
        if (selectedOrder?.order_id === processModal.order.order_id) {
          const detail = await getB2BOrderById(processModal.order.order_id);
          if (detail.success) setSelectedOrder(detail.data);
        }
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessLoading(false);
    }
  };

  return (
    <div className="b2b-orders-v2">
      <div className="orders-table-container">
        {loading ? (
          <div className="orders-loading-state"><div className="spinner" /><span>Fetching network orders...</span></div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state"><Icon name="cart" size={48} /><p>No orders found in your network.</p></div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order No.</th>
                <th>{isSupplier ? 'Shop Name' : 'Supplier'}</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE).map(o => (
                <tr key={o.order_id} className="order-row" onClick={() => handleOpenPanel(o.order_id)}>
                  <td>
                    <div className="date-cell">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      <span className="time">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td><span className="order-no-badge">#{o.order_number || o.order_id.slice(0, 4).toUpperCase()}</span></td>
                  <td>
                    <div className="business-cell">
                      {o.logo && <img src={o.logo} alt="" className="mini-logo" />}
                      <strong>{o.business_name}</strong>
                    </div>
                  </td>
                  <td>{fmt(o.total_amount)}</td>
                  <td>
                    {(() => {
                      const displayStatus = getDisplayStatus(o);
                      return (
                        <span className={`status-pill ${STATUS_MAP[displayStatus] ? STATUS_MAP[displayStatus].cls : 'status--closed'}`}>
                          {STATUS_MAP[displayStatus] ? STATUS_MAP[displayStatus].label : displayStatus}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-right">
                    <div className="row-actions" onClick={e => e.stopPropagation()}>
                      {isSupplier && o.status === 'PENDING' && (
                        <>
                          <button className="icon-btn btn-accept" title="Accept" onClick={() => handleAction(o.order_id, 'ACCEPTED')}><Icon name="check" size={16} /></button>
                          <button className="icon-btn btn-reject" title="Reject" onClick={() => handleRejectClick(o.order_id)}><Icon name="x" size={16} /></button>
                        </>
                      )}
                      
                      {/* Shop Requests Return */}
                      {!isSupplier && ['CLOSED', 'BILLED'].includes(o.status) && !o.latest_return_status && (
                        <button className="icon-btn btn-return" title="Request Return" onClick={async (e) => {
                          e.stopPropagation();
                          const res = await getB2BOrderById(o.order_id);
                          if (res.success) handleOpenReturn(res.data);
                        }}><Icon name="reports" size={16} /></button>
                      )}
                      
                      {/* Supplier Processes Return */}
                      {isSupplier && o.status === 'RETURN_REQUESTED' && (
                        <button className="icon-btn btn-return" title="Process Return" onClick={async (e) => {
                          e.stopPropagation();
                          const res = await getB2BOrderById(o.order_id);
                          if (res.success) handleOpenProcess(res.data);
                        }}><Icon name="reports" size={16} /></button>
                      )}

                      <button className="icon-btn btn-view" onClick={() => handleOpenPanel(o.order_id)}><Icon name="chevronRight" size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && orders.length > 0 && (() => {
          const totalPages = Math.ceil(orders.length / ROWS_PER_PAGE);
          if (totalPages <= 1) return null;
          return (
            <div className="inventory-pagination" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-soft)' }}>
              <button
                className="inv-page-btn"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >‹ Prev</button>

              <div className="inv-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`inv-page-dot ${page === i ? 'is-active' : ''}`}
                    onClick={() => setPage(i)}
                  >{i + 1}</button>
                ))}
              </div>

              <span className="inv-page-info" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, orders.length)} of {orders.length}
              </span>

              <button
                className="inv-page-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >Next ›</button>
            </div>
          );
        })()}
      </div>

      {createPortal(
        <>
          <div className={`side-panel-overlay ${panelOpen ? 'open' : ''}`} onClick={handleClosePanel} />
          <div className={`side-panel ${panelOpen ? 'open' : ''}`}>
            {selectedOrder && (
              <div className="side-panel__content">
                <div className="side-panel__header">
                  <div className="header-top">
                    <span className="order-tag">Order Details</span>
                    <button className="close-btn" onClick={handleClosePanel}><Icon name="x" size={20} /></button>
                  </div>
                  <h2>Order #{selectedOrder.order_number}</h2>
                  <div className="header-meta">
                    {(() => {
                      const displayStatus = getDisplayStatus(selectedOrder);
                      return (
                        <span className={`status-pill status-pill--large ${STATUS_MAP[displayStatus] ? STATUS_MAP[displayStatus].cls : 'status--closed'}`}>
                          {STATUS_MAP[displayStatus] ? STATUS_MAP[displayStatus].label : displayStatus}
                        </span>
                      );
                    })()}
                    <span className="date">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="side-panel__body">
                  <div className="info-section">
                    <h3>{isSupplier ? 'Billing To' : 'Supplier Details'}</h3>
                    <div className="info-card">
                      <div className="info-card__row"><Icon name="box" size={14} /><strong>{isSupplier ? selectedOrder.shop_name : selectedOrder.supplier_name}</strong></div>
                      {(isSupplier ? selectedOrder.shop_phone : selectedOrder.supplier_phone) && (
                        <div className="info-card__row"><Icon name="payment" size={14} /><span>{isSupplier ? selectedOrder.shop_phone : selectedOrder.supplier_phone}</span></div>
                      )}
                      {(isSupplier ? selectedOrder.shop_email : selectedOrder.supplier_email) && (
                        <div className="info-card__row"><Icon name="mail" size={14} /><span>{isSupplier ? selectedOrder.shop_email : selectedOrder.supplier_email}</span></div>
                      )}
                      {(isSupplier ? selectedOrder.shop_address : selectedOrder.supplier_address) && (
                        <div className="info-card__row"><Icon name="location" size={14} /><span>{isSupplier ? selectedOrder.shop_address : selectedOrder.supplier_address}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="items-section">
                    <h3>Ordered Items</h3>
                    <div className="items-list">
                      {selectedOrder.items?.map(item => (
                        <div key={item.id} className="item-row">
                          <div className="item-info"><span className="item-name">{item.name}</span><span className="item-sku">{item.sku}</span></div>
                          <div className="item-qty">{item.qty} × {fmt(item.price)}</div>
                          <div className="item-total">{fmt(item.total)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOrder.returns?.length > 0 && (
                    <div className="returns-section">
                      <h3>Return History</h3>
                      {selectedOrder.returns.map(r => (
                        <div 
                          key={r.return_id} 
                          className={`return-history-item ${isSupplier && r.status === 'PENDING' ? 'return-history-item--clickable' : ''}`}
                          onClick={() => {
                            if (isSupplier && r.status === 'PENDING') {
                              handleOpenProcess(selectedOrder);
                            }
                          }}
                        >
                          <div className="return-history-item__meta">
                            <span className={`status-pill status-pill--sm ${r.status === 'APPROVED' ? 'status--accepted' : r.status === 'REJECTED' ? 'status--rejected' : 'status--pending'}`}>
                              {r.status}
                            </span>
                            <span className="return-history-item__date">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                          <div className="return-history-item__amount">Refund: <strong>{fmt(r.total_refund_amount)}</strong></div>
                          {r.reason && <div className="return-history-item__items">Reason: {r.reason}</div>}
                          {r.items && (
                            <div className="return-history-item__items">
                              {r.items.map(ri => `${ri.return_qty}x ${ri.name}`).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedOrder.rejection_reason && (
                    <div className="notes-section" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                      <h3 style={{ color: '#ef4444', marginBottom: 4 }}>Rejection Reason</h3><p style={{ color: '#ef4444', opacity: 0.85 }}>{selectedOrder.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="side-panel__footer">
                  <div className="footer-actions">
                    {/* Supplier accepts/rejects pending order */}
                    {isSupplier && selectedOrder.status === 'PENDING' && (
                      <div className="dual-actions">
                        <button className="panel-btn btn-accept" onClick={() => handleAction(selectedOrder.order_id, 'ACCEPTED')}>Accept Order</button>
                        <button className="panel-btn btn-reject" onClick={() => handleRejectClick(selectedOrder.order_id)}>Reject</button>
                      </div>
                    )}
                    
                    {/* Supplier converts accepted order to bill */}
                    {isSupplier && selectedOrder.status === 'ACCEPTED' && (
                      <button className="panel-btn btn-primary" onClick={() => navigate(`/billing?order_id=${selectedOrder.order_id}`)}>Proceed to Bill</button>
                    )}

                    {/* Shop marks billed order as received */}
                    {!isSupplier && selectedOrder.status === 'BILLED' && (
                      <button className="panel-btn btn-success" onClick={() => handleAction(selectedOrder.order_id, 'CLOSED')}>
                         <Icon name="check" size={15} /> Mark Received & Review Stock
                      </button>
                    )}

                    {/* Shop reviews closed order items */}
                    {!isSupplier && selectedOrder.status === 'CLOSED' && (() => {
                      const pending = (selectedOrder.items || []).filter(i => !i.inventory_synced);
                      // Deduct returns for sanity
                      const actualPending = pending.filter(item => {
                        let returnedQty = 0;
                        if (selectedOrder.returns) {
                           selectedOrder.returns.forEach(r => {
                              if (r.status === 'APPROVED') {
                                 const ri = r.items?.find(ri => ri.product_id === item.product_id);
                                 if (ri) returnedQty += Number(ri.return_qty);
                              }
                           });
                        }
                        return (item.qty - returnedQty) > 0;
                      });

                      if (actualPending.length > 0) {
                        return (
                          <button 
                            className="panel-btn btn-primary" 
                            onClick={() => {
                              navigate('/inventory', {
                                state: {
                                  reviewQueue: actualPending.map(ap => ({
                                    id: ap.id,
                                    name: ap.name,
                                    sku: ap.sku,
                                    price: ap.price,
                                    finalQty: ap.qty // Note: simplified for manual trigger from drawer
                                  })),
                                  orderInfo: {
                                    supplierName: selectedOrder?.supplier_name,
                                    supplierId: selectedOrder?.supplier_id,
                                    supplierDbName: selectedOrder?.supplier_db_name,
                                    orderId: selectedOrder.order_id,
                                  }
                                }
                              });
                            }}
                          >
                             <Icon name="refresh" size={15} /> Review & Update Stock ({actualPending.length})
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Shop requests return */}
                    {!isSupplier && ['CLOSED', 'BILLED'].includes(selectedOrder.status) && (!selectedOrder.returns || selectedOrder.returns.length === 0) && (
                      <button className="panel-btn btn-return" onClick={() => handleOpenReturn(selectedOrder)}>↩ Request Return</button>
                    )}
                    
                    {/* Supplier processes return */}
                    {isSupplier && selectedOrder.returns?.some(r => r.status === 'PENDING') && (
                      <button className="panel-btn btn-return" onClick={() => handleOpenProcess(selectedOrder)}>↩ Process Return</button>
                    )}

                    <button className="panel-btn btn-outline" onClick={handleClosePanel}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Rejection Modals... (omitted for brevity, keep unchanged where possible but I must include it) */}
      {rejectModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRejectModal(null)}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '2rem', width: 420, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>Reject Order</h3>
            <textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-primary)', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="panel-btn btn-outline" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="panel-btn btn-reject" onClick={handleConfirmReject}>Confirm Reject</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Shop Request Return Modal ──────────────────────────────────── */}
      {returnModal && createPortal(
        <div className="return-modal-overlay" onClick={handleCloseReturn}>
          <div className="return-modal" onClick={e => e.stopPropagation()}>
            {returnSuccess ? (
              <div className="return-modal__success">
                <div className="return-success-icon">✓</div>
                <h3>Request Sent</h3>
                <p>{returnSuccess.message}</p>
                <button className="panel-btn btn-primary" onClick={handleCloseReturn}>Done</button>
              </div>
            ) : (
              <>
                <div className="return-modal__header">
                  <div>
                    <h2>Request Return</h2>
                    <p>Order #{returnModal.order.order_number || returnModal.order.order_id?.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <button className="close-btn" onClick={handleCloseReturn}><Icon name="x" size={20} /></button>
                </div>

                <div className="return-modal__body">
                  <p className="return-modal__hint">Select items to return and specify the request quantity.</p>

                  <div className="return-items-list">
                    {returnItems.map(item => (
                      <div key={item.id} className={`return-item-row ${item.selected ? 'return-item-row--selected' : ''}`}>
                        <label className="return-item-check"><input type="checkbox" checked={item.selected} onChange={() => handleToggleReturnItem(item.id)}/></label>
                        <div className="return-item-info"><span className="return-item-name">{item.name}</span><span className="return-item-sku">{item.sku} · Ordered: {item.qty}</span></div>
                        <div className="return-item-price">{fmt(item.price)}/ea</div>
                        {item.selected && (
                          <div className="return-item-qty">
                            <button onClick={() => handleReturnQtyChange(item.id, item.return_qty - 1)}>−</button>
                            <input type="number" min={1} max={item.qty} value={item.return_qty} onChange={e => handleReturnQtyChange(item.id, e.target.value)} />
                            <button onClick={() => handleReturnQtyChange(item.id, item.return_qty + 1)}>+</button>
                          </div>
                        )}
                        {item.selected && <div className="return-item-refund">{fmt(item.return_qty * Number(item.price))}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="return-reason">
                    <label>Reason for Return</label>
                    <textarea rows={2} placeholder="Explain why..." value={returnReason} onChange={e => setReturnReason(e.target.value)} />
                  </div>

                  <div className="return-modal__summary">
                    <span>{selectedReturnItems.length} item(s) selected</span>
                    <div className="return-refund-total"><span>Expected Refund:</span><strong>{fmt(totalRefund)}</strong></div>
                  </div>
                </div>

                <div className="return-modal__footer">
                  <button className="panel-btn btn-outline" onClick={handleCloseReturn}>Cancel</button>
                  <button className="panel-btn btn-return" disabled={!selectedReturnItems.length || returnLoading} onClick={handleConfirmReturnRequest}>
                    {returnLoading ? 'Processing...' : `Submit Request`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Supplier Process Return Modal ──────────────────────────────────── */}
      {processModal && createPortal(
        <div className="return-modal-overlay" onClick={handleCloseProcess}>
          <div className="return-modal" onClick={e => e.stopPropagation()}>
            <div className="return-modal__header">
              <div>
                <h2>Process Return Request</h2>
                <p>Order #{processModal.order.order_number || processModal.order.order_id?.slice(0, 8).toUpperCase()}</p>
              </div>
              <button className="close-btn" onClick={handleCloseProcess}><Icon name="x" size={20} /></button>
            </div>

            <div className="return-modal__body">
              {processModal.returnReq.reason && (
                <div className="return-modal__hint" style={{ borderLeftColor: 'var(--color-warning)' }}>
                  <strong>Shop's Reason:</strong> {processModal.returnReq.reason}
                </div>
              )}

              <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem' }}>Adjust approved quantities if needed. Set quantity to 0 to reject an item.</p>

              <div className="return-items-list">
                {processItems.map(item => (
                  <div key={item.id} className="return-item-row return-item-row--selected" style={{ gridTemplateColumns: '1fr 80px 120px 90px', paddingLeft: 20 }}>
                    <div className="return-item-info"><span className="return-item-name">{item.name}</span><span className="return-item-sku">{item.sku} · Requested: {item.max_qty}</span></div>
                    <div className="return-item-price">{fmt(item.unit_price)}/ea</div>
                    <div className="return-item-qty">
                      <button onClick={() => handleProcessQtyChange(item.id, item.current_qty - 1)}>−</button>
                      <input type="number" min={0} max={item.max_qty} value={item.current_qty} onChange={e => handleProcessQtyChange(item.id, e.target.value)} />
                      <button onClick={() => handleProcessQtyChange(item.id, item.current_qty + 1)}>+</button>
                    </div>
                    <div className="return-item-refund">{fmt(item.current_qty * Number(item.unit_price))}</div>
                  </div>
                ))}
              </div>

              <div className="return-modal__summary">
                <span>{processItems.filter(i => i.current_qty > 0).length} item(s) approved</span>
                <div className="return-refund-total"><span>Approved Refund:</span><strong>{fmt(processTotalRefund)}</strong></div>
              </div>
            </div>

            <div className="return-modal__footer" style={{ justifyContent: 'space-between' }}>
              <button className="panel-btn btn-reject" disabled={processLoading} onClick={handleRejectProcess}>Reject Entire Return</button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="panel-btn btn-outline" onClick={handleCloseProcess}>Cancel</button>
                <button className="panel-btn btn-return" disabled={processLoading} onClick={handleConfirmProcess}>
                  {processLoading ? 'Processing...' : `Approve Return (${fmt(processTotalRefund)})`}
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
