// ReturnModal.jsx — Walk-in Customer Return System
import { useState, useEffect } from 'react';
import { returnTransaction, getReturnsByInvoice } from '../../services/api';
import Icon from '../../components/Icon';
import './ReturnModal.css';

const fmt    = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQty = (n) => Number(n || 0);

const REFUND_METHODS = [
  { key: 'CASH',  label: 'Cash Refund',   icon: '💵' },
  { key: 'CARD',  label: 'Card Refund',   icon: '💳' },
  { key: 'UPI',   label: 'UPI Refund',    icon: '📱' },
  { key: 'CREDIT', label: 'Store Credit', icon: '🏷️' },
];

export default function ReturnModal({ txn, shopInfo, onClose, onSuccess }) {
  const [step,         setStep]         = useState(1); // 1=items, 2=details, 3=success
  const [returnItems,  setReturnItems]  = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [result,       setResult]       = useState(null);
  const [existingReturns, setExistingReturns] = useState([]);

  // Initialise return item state from the original transaction items
  useEffect(() => {
    if (!txn?.items) return;
    setReturnItems(
      txn.items.map(item => ({
        product_id:   item.product_id,
        productName:  item.productName,
        sku:          item.sku,
        sellingPrice: item.sellingPrice,
        taxRate:      item.taxRate,
        discountAmount: item.discountAmount,
        originalQty:  item.quantity,
        returnedQty:  item.returnedQty || 0,
        remainingQty: item.quantity - (item.returnedQty || 0),
        returnQty:    0,
        selected:     false,
      }))
    );

    // Load existing returns
    getReturnsByInvoice(txn.transaction_id)
      .then(res => { if (res.success) setExistingReturns(res.data); })
      .catch(() => {});
  }, [txn]);

  const updateQty = (idx, val) => {
    setReturnItems(prev => prev.map((ri, i) => {
      if (i !== idx) return ri;
      const qty = Math.max(0, Math.min(ri.remainingQty, parseInt(val) || 0));
      return { ...ri, returnQty: qty, selected: qty > 0 };
    }));
  };

  // Calculate refund preview
  const origTotal   = parseFloat(txn?.totalAmount || 0);
  const origSubtotal = parseFloat(txn?.subtotal || 0);
  const origDiscount = parseFloat(txn?.discountAmount || 0);
  const discountRatio = origSubtotal > 0 ? origDiscount / origSubtotal : 0;

  let previewSubtotal = 0, previewTax = 0;
  for (const ri of returnItems) {
    if (!ri.returnQty) continue;
    const unitNet = parseFloat(ri.sellingPrice) - (parseFloat(ri.discountAmount || 0) / ri.originalQty);
    const unitTax = unitNet * (parseFloat(ri.taxRate || 0) / 100);
    previewSubtotal += unitNet * ri.returnQty;
    previewTax      += unitTax * ri.returnQty;
  }
  const previewDiscount = previewSubtotal * discountRatio;
  const previewRefund   = Math.round((previewSubtotal - previewDiscount + previewTax) * 100) / 100;

  const activeItems = returnItems.filter(ri => ri.returnQty > 0);

  const handleSubmit = async () => {
    if (!activeItems.length) { setError('Select at least one item to return.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await returnTransaction(txn.transaction_id, {
        returnItems: activeItems.map(ri => ({ product_id: ri.product_id, returnQty: ri.returnQty })),
        returnReason,
        refundMethod,
      });
      if (res.success) {
        setResult(res.data);
        setStep(3);
        onSuccess?.();
      } else {
        setError(res.message || 'Return failed.');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rm-panel">

        {/* ── Header ── */}
        <div className="rm-header">
          <div className="rm-header__icon">↩</div>
          <div className="rm-header__title">
            <h3>Return / Refund</h3>
            <p>{txn?.invoiceNumber}</p>
          </div>
          <button className="rm-close" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* ── Step Indicator ── */}
        {step < 3 && (
          <div className="rm-steps">
            {['Select Items', 'Reason & Method', 'Confirm'].map((s, i) => (
              <div key={i} className={`rm-step ${step === i + 1 ? 'rm-step--active' : ''} ${step > i + 1 ? 'rm-step--done' : ''}`}>
                <div className="rm-step__dot">{step > i + 1 ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ STEP 1 — Select Items ══════════ */}
        {step === 1 && (
          <div className="rm-body">
            {existingReturns.length > 0 && (
              <div className="rm-existing-returns">
                <span className="rm-badge-label">Previous returns on this invoice</span>
                {existingReturns.map(r => (
                  <div key={r.transaction_id} className="rm-existing-return-row">
                    <span className="rm-ret-inv">{r.invoiceNumber}</span>
                    <span className="rm-ret-amt">{fmt(Math.abs(r.totalAmount))} refunded</span>
                    <span className="rm-ret-method">{r.paymentMethod}</span>
                    <span className="rm-ret-date">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="rm-items-header">
              <span>Item</span>
              <span>Sold</span>
              <span>Returned</span>
              <span>Remaining</span>
              <span>Return Qty</span>
              <span>Refund</span>
            </div>

            {returnItems.map((ri, idx) => {
              const unitNet  = parseFloat(ri.sellingPrice) - (parseFloat(ri.discountAmount || 0) / ri.originalQty);
              const unitTax  = unitNet * (parseFloat(ri.taxRate || 0) / 100);
              const lineRef  = (unitNet + unitTax) * ri.returnQty;
              const isExhausted = ri.remainingQty <= 0;

              return (
                <div key={ri.product_id} className={`rm-item-row ${isExhausted ? 'rm-item-row--exhausted' : ''} ${ri.returnQty > 0 ? 'rm-item-row--selected' : ''}`}>
                  <div className="rm-item-name">
                    <div>{ri.productName}</div>
                    <span className="rm-item-sku">{ri.sku}</span>
                  </div>
                  <span className="rm-item-qty">{ri.originalQty}</span>
                  <span className="rm-item-qty rm-item-qty--returned">{ri.returnedQty}</span>
                  <span className={`rm-item-qty ${isExhausted ? 'rm-item-qty--zero' : ''}`}>{ri.remainingQty}</span>
                  <div className="rm-qty-spin">
                    <button onClick={() => updateQty(idx, ri.returnQty - 1)} disabled={ri.returnQty <= 0}>−</button>
                    <input
                      type="number" min={0} max={ri.remainingQty}
                      value={ri.returnQty}
                      onChange={e => updateQty(idx, e.target.value)}
                      disabled={isExhausted}
                    />
                    <button onClick={() => updateQty(idx, ri.returnQty + 1)} disabled={ri.returnQty >= ri.remainingQty || isExhausted}>+</button>
                  </div>
                  <span className={`rm-item-refund ${ri.returnQty > 0 ? 'rm-item-refund--active' : ''}`}>
                    {ri.returnQty > 0 ? fmt(lineRef) : '—'}
                  </span>
                </div>
              );
            })}

            {/* Preview */}
            {previewRefund > 0 && (
              <div className="rm-preview">
                  <div className="rm-preview__row">
                    <span>Items returning</span>
                    <strong>{activeItems.length}</strong>
                  </div>
                  <div className="rm-preview__row">
                    <span>Return subtotal</span>
                    <span>{fmt(previewSubtotal)}</span>
                  </div>
                  {previewDiscount > 0 && (
                    <div className="rm-preview__row rm-preview__row--discount">
                      <span>Invoice discount (proportional)</span>
                      <span>− {fmt(previewDiscount)}</span>
                    </div>
                  )}
                  {previewTax > 0 && (
                    <div className="rm-preview__row">
                      <span>Tax (GST reversal)</span>
                      <span>{fmt(previewTax)}</span>
                    </div>
                  )}
                  <div className="rm-preview__row rm-preview__total">
                    <span>Total Refund</span>
                    <strong>{fmt(previewRefund)}</strong>
                  </div>
              </div>
            )}

            {error && <div className="rm-error">{error}</div>}

            <div className="rm-footer">
              <button className="rm-btn rm-btn--outline" onClick={onClose}>Cancel</button>
              <button
                className="rm-btn rm-btn--primary"
                disabled={activeItems.length === 0}
                onClick={() => { setError(''); setStep(2); }}
              >
                Next: Reason &amp; Method →
              </button>
            </div>
          </div>
        )}

        {/* ══════════ STEP 2 — Reason & Refund Method ══════════ */}
        {step === 2 && (
          <div className="rm-body">
            <div className="rm-section-label">Return Summary</div>
            <div className="rm-summary-items">
              {activeItems.map(ri => (
                <div key={ri.product_id} className="rm-summary-item">
                  <span>{ri.productName}</span>
                  <span>×{ri.returnQty}</span>
                </div>
              ))}
            </div>

            <div className="rm-divider" />

            <div className="rm-section-label">Reason for Return</div>
            <textarea
              className="rm-textarea"
              rows={3}
              placeholder="e.g. Damaged product, wrong item, customer changed mind..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />

            <div className="rm-section-label" style={{ marginTop: '1.2rem' }}>Refund Method</div>
            <div className="rm-method-grid">
              {REFUND_METHODS.map(m => (
                <button
                  key={m.key}
                  className={`rm-method-btn ${refundMethod === m.key ? 'rm-method-btn--active' : ''}`}
                  onClick={() => setRefundMethod(m.key)}
                >
                  <span className="rm-method-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="rm-refund-total-display">
              <span>Total Refund via {REFUND_METHODS.find(m=>m.key===refundMethod)?.label}</span>
              <strong>{fmt(previewRefund)}</strong>
            </div>

            {error && <div className="rm-error">{error}</div>}

            <div className="rm-footer">
              <button className="rm-btn rm-btn--outline" onClick={() => setStep(1)}>← Back</button>
              <button
                className="rm-btn rm-btn--danger"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Processing...' : `Confirm Return & Refund ${fmt(previewRefund)}`}
              </button>
            </div>
          </div>
        )}

        {/* ══════════ STEP 3 — Success ══════════ */}
        {step === 3 && result && (
          <div className="rm-body rm-body--success">
            <div className="rm-success-icon">✅</div>
            <h3>Return Processed!</h3>
            <div className="rm-success-inv">{result.returnInvoiceNumber}</div>
            <p className="rm-success-sub">Return invoice created successfully</p>

            <div className="rm-success-details">
              <div className="rm-success-row">
                <span>Refund Amount</span>
                <strong>{fmt(result.refundTotal)}</strong>
              </div>
              <div className="rm-success-row">
                <span>Refund Method</span>
                <strong>{REFUND_METHODS.find(m=>m.key===result.refundMethod)?.label || result.refundMethod}</strong>
              </div>
              <div className="rm-success-row">
                <span>Original Invoice</span>
                <strong>{txn?.invoiceNumber}</strong>
              </div>
              <div className="rm-success-row">
                <span>Return Invoice</span>
                <strong>{result.returnInvoiceNumber}</strong>
              </div>
            </div>

            <button 
              className="rm-btn rm-btn--primary" 
              style={{ marginTop:'1.5rem', width:'100%', maxWidth: '360px', flex: 'none' }} 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
