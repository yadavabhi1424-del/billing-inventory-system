import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getB2BOrders, getB2BOrderById, updateB2BOrderStatus } from '../../services/api';
import Icon from '../../components/Icon';
import './B2BOrders.css';


const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const STATUS_MAP = {
  PENDING:  { label: 'Pending',   cls: 'status--pending' },
  ACCEPTED: { label: 'Placed',    cls: 'status--accepted' },
  BILLED:   { label: 'Billed',    cls: 'status--billed' },
  CLOSED:   { label: 'Closed',    cls: 'status--closed' },
  REJECTED: { label: 'Rejected',  cls: 'status--rejected' }
};

export default function B2BOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addedItems, setAddedItems] = useState({});
  
  const isSupplier = user?.userType === 'supplier';
  const navigate = useNavigate();

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
        // Refresh added-items tracking for this order from localStorage
        const stored = JSON.parse(localStorage.getItem('b2b_added_items') || '{}');
        setAddedItems(stored);
      }
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setSelectedOrder(null), 300); // Wait for transition
  };

  const handleAction = async (id, status) => {
    try {
      const res = await updateB2BOrderStatus(id, status);
      if (res.success) {
        fetchOrders();
        if (selectedOrder?.order_id === id) {
          setSelectedOrder(prev => ({ ...prev, status }));
        }
        // If it was a list-level action, close panel if open
        if (panelOpen && status === 'REJECTED') handleClosePanel();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="b2b-orders-v2">
      
      {/* Main Table List */}
      <div className="orders-table-container">
        {loading ? (
          <div className="orders-loading-state">
            <div className="spinner" />
            <span>Fetching network orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <Icon name="cart" size={48} />
            <p>No orders found in your network.</p>
          </div>
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
              {orders.map(o => (
                <tr key={o.order_id} className="order-row" onClick={() => handleOpenPanel(o.order_id)}>
                  <td>
                    <div className="date-cell">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      <span className="time">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td>
                    <span className="order-no-badge">#{o.order_number || o.order_id.slice(0, 4).toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="business-cell">
                      {o.logo && <img src={o.logo} alt="" className="mini-logo" />}
                      <strong>{o.business_name}</strong>
                    </div>
                  </td>
                  <td>{fmt(o.total_amount)}</td>
                  <td>
                    <span className={`status-pill ${STATUS_MAP[o.status].cls}`}>
                      {STATUS_MAP[o.status].label}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="row-actions" onClick={e => e.stopPropagation()}>
                      {isSupplier && o.status === 'PENDING' && (
                        <>
                          <button className="icon-btn btn-accept" title="Accept" onClick={() => handleAction(o.order_id, 'ACCEPTED')}>
                            <Icon name="check" size={16} />
                          </button>
                          <button className="icon-btn btn-reject" title="Reject" onClick={() => handleAction(o.order_id, 'REJECTED')}>
                            <Icon name="x" size={16} />
                          </button>
                        </>
                      )}
                      <button className="icon-btn btn-view" onClick={() => handleOpenPanel(o.order_id)}>
                        <Icon name="chevronRight" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Panel Drawer */}
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
                <span className={`status-pill status-pill--large ${STATUS_MAP[selectedOrder.status].cls}`}>
                  {STATUS_MAP[selectedOrder.status].label}
                </span>
                <span className="date">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="side-panel__body">
              <div className="info-section">
                <h3>{isSupplier ? 'Billing To' : 'Supplier Details'}</h3>
                <div className="info-card">
                  <div className="info-card__row">
                    <Icon name="box" size={14} />
                    <strong>{isSupplier ? selectedOrder.shop_name : selectedOrder.supplier_name}</strong>
                  </div>
                  <div className="info-card__row">
                    <Icon name="payment" size={14} />
                    <span>{isSupplier ? selectedOrder.shop_phone : selectedOrder.supplier_phone}</span>
                  </div>
                </div>
              </div>

              <div className="items-section">
                <h3>Ordered Items</h3>
                <div className="items-list">
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className={`item-row ${!isSupplier && selectedOrder.status === 'CLOSED' ? 'item-row--with-action' : ''}`}>
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <span className="item-sku">{item.sku}</span>
                      </div>
                      <div className="item-qty">
                        {item.qty} × {fmt(item.price)}
                      </div>
                      <div className="item-total">{fmt(item.total)}</div>
                      {!isSupplier && selectedOrder.status === 'CLOSED' && (() => {
                        const itemKey = `${selectedOrder.order_id}_${item.id}`;
                        const isAdded = !!addedItems[itemKey];
                        return (
                          <button
                            className={`item-add-inventory-btn ${isAdded ? 'item-add-inventory-btn--added' : ''}`}
                            title={isAdded ? 'Already added to inventory' : 'Add to Inventory'}
                            disabled={isAdded}
                            onClick={() => navigate('/inventory', {
                              state: {
                                addFromOrder: {
                                  name: item.name,
                                  costPrice: item.price,
                                  quantity: item.qty,
                                  supplierName: selectedOrder.supplier_name,
                                  supplierId: selectedOrder.supplier_id,
                                  supplierDbName: selectedOrder.supplier_db_name,
                                  orderId: selectedOrder.order_id,
                                  itemId: item.id,
                                }
                              }
                            })}
                          >
                            <Icon name={isAdded ? 'check' : 'box'} size={13} />
                            {isAdded ? 'Added' : 'Add item'}
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedOrder.notes && (
                <div className="notes-section">
                  <h3>Notes</h3>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="side-panel__footer">
              <div className="footer-summary">
                <span>Summary</span>
                <div className="total-row">
                  <span>Total Amount</span>
                  <strong>{fmt(selectedOrder.total_amount)}</strong>
                </div>
              </div>

              <div className="footer-actions">
                {isSupplier && selectedOrder.status === 'PENDING' && (
                  <div className="dual-actions">
                    <button className="panel-btn btn-accept" onClick={() => handleAction(selectedOrder.order_id, 'ACCEPTED')}>
                      Accept Order
                    </button>
                    <button className="panel-btn btn-reject" onClick={() => handleAction(selectedOrder.order_id, 'REJECTED')}>
                      Reject
                    </button>
                  </div>
                )}
                
                {isSupplier && selectedOrder.status === 'ACCEPTED' && (
                  <button className="panel-btn btn-primary" onClick={() => navigate(`/billing?order_id=${selectedOrder.order_id}`)}>
                    Proceed to Bill
                  </button>
                )}

                {!isSupplier && selectedOrder.status === 'BILLED' && (
                  <button className="panel-btn btn-success" onClick={() => handleAction(selectedOrder.order_id, 'CLOSED')}>
                    Mark Received
                  </button>
                )}

                <button className="panel-btn btn-outline" onClick={handleClosePanel}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
