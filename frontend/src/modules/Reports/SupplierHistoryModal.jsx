import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getSupplierOrderHistory } from '../../services/api';
import OrderReceiptModal from './OrderReceiptModal';
import './SupplierHistoryModal.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SupplierHistoryModal({ supplier, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState(null);

  useEffect(() => {
    setLoading(true);
    getSupplierOrderHistory(supplier.supplier_id)
      .then(res => {
        if (res.success) setOrders(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [supplier.supplier_id]);

  return (
    <>
      <div className="history-modal-backdrop" onClick={onClose}>
        <div className={`history-modal ${isMaximized ? 'history-modal--maximized' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="history-modal__header">
            <div className="history-modal__title">
              <Icon name="history" size={20} />
              <div>
                <h3>{supplier.name}</h3>
                <span className="subtitle">Order History & Receipts</span>
              </div>
            </div>
            <div className="history-modal__actions">
              <button className="history-action-btn" onClick={() => setIsMaximized(!isMaximized)} title={isMaximized ? 'Restore' : 'Maximize'}>
                <Icon name={isMaximized ? 'minimize' : 'maximize'} size={18} />
              </button>
              <button className="history-action-btn" onClick={onClose} title="Close">
                <Icon name="x" size={24} />
              </button>
            </div>
          </div>

          <div className="history-modal__body">
            {loading ? (
              <div className="history-loading">
                <div className="app-loading__spinner" />
                <span>Loading order history...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="history-empty">
                <Icon name="inbox" size={48} />
                <p>No orders found for this supplier.</p>
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Order ID</th>
                      <th>Source Type</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>{formatDate(order.date)}</td>
                        <td>{order.orderNumber}</td>
                        <td>
                          <span className={`source-badge ${order.source.toLowerCase()}`}>
                            {order.source}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${order.status.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{fmt(order.totalAmount)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="view-receipt-btn"
                            onClick={() => setSelectedOrderForReceipt(order)}
                          >
                            <Icon name="file-text" size={16} /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrderForReceipt && (
        <OrderReceiptModal 
          order={selectedOrderForReceipt} 
          supplier={supplier}
          onClose={() => setSelectedOrderForReceipt(null)} 
        />
      )}
    </>
  );
}
