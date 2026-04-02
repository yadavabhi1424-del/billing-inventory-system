import React, { useState } from 'react';
import Icon from '../../components/Icon';
import './OrderReceiptModal.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function OrderReceiptModal({ order, supplier, onClose }) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const isB2B = order.source === 'B2B';

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal" onClick={e => e.stopPropagation()}>
        <div className="receipt-modal__header hide-on-print">
          <h3>Order Receipt</h3>
          <div className="receipt-modal__actions">
            <button className="receipt-action-btn primary" onClick={handlePrint}>
              <Icon name="printer" size={16} /> Print Receipt
            </button>
            <button className="receipt-action-btn" onClick={onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        <div className="receipt-printable-area">
          <div className="receipt-head">
            <div className="receipt-brand">
              <Icon name="box" size={32} />
              <h2>{supplier.name}</h2>
              {supplier.phone && <p>Ph: {supplier.phone}</p>}
            </div>
            <div className="receipt-meta">
              <h2>INVOICE / RECEIPT</h2>
              <div className="meta-grid">
                <span className="meta-lbl">Order No:</span>
                <span className="meta-val">{order.orderNumber}</span>
                <span className="meta-lbl">Date:</span>
                <span className="meta-val">{formatDate(order.date)}</span>
                <span className="meta-lbl">Type:</span>
                <span className="meta-val">{isB2B ? 'Network B2B Order' : 'Local Purchase Order'}</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider"></div>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'right' }}>{item.qty} {item.receivedQty !== undefined && parseInt(item.receivedQty) !== parseInt(item.qty) && <span style={{fontSize:'0.75rem', color: '#666', display:'block'}}>Rcvd: {item.receivedQty}</span>}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.totalAmount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No item details available</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="receipt-summary">
            <div className="receipt-summary-row">
              <span>Subtotal:</span>
              <span>{order.subtotal ? fmt(order.subtotal) : fmt(order.totalAmount)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="receipt-summary-row">
                <span>Tax:</span>
                <span>{fmt(order.taxAmount)}</span>
              </div>
            )}
            <div className="receipt-summary-row primary">
              <span>Total Amount:</span>
              <span>{fmt(order.totalAmount)}</span>
            </div>
          </div>
          
          <div className="receipt-footer">
            {order.notes && (
              <div className="receipt-notes">
                <strong>Notes:</strong> {order.notes}
              </div>
            )}
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
