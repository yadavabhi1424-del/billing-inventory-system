import { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import { getTransactions, getTransactionById, getShopProfile, getReturnsByInvoice } from '../../services/api';
import ReturnModal from './ReturnModal';
import './Transactions.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDec = (n) => '₹' + Number(n || 0).toFixed(2);

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
};

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── Original Bill Modal (Invoice format from POS) ─────────────
function InvoiceBillModal({ txn, shopInfo, onClose, onInitiateReturn, linkedReturns = [] }) {
  if (!txn) return null;

  const customerName = txn.customerName ||
    (txn.notes?.includes('Customer:')
      ? txn.notes.split('Customer:')[1].split('|')[0].trim()
      : 'Walk-in Customer');

  const subtotal = parseFloat(txn.subtotal || 0);
  const discount = parseFloat(txn.discountAmount || 0);
  const tax      = parseFloat(txn.taxAmount || 0);
  const total    = parseFloat(txn.totalAmount || 0);
  const cgst     = tax / 2;
  const sgst     = tax / 2;
  const taxable  = subtotal - discount;

  const handlePrint = () => window.print();

  return (
    <div className="invoice-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="invoice-modal">

        {/* Actions */}
        <div className="invoice-modal__actions">
          <button className="invoice-action-btn" onClick={handlePrint}>
            <Icon name="billing" size={15} /> Print Bill
          </button>
          <button className="invoice-action-btn invoice-action-btn--close" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Invoice */}
        <div className="invoice">
          <div className="invoice__header">
            <div>
              <div className="invoice__store-name">{shopInfo?.name || shopInfo?.businessName || 'Your Store'}</div>
              <div className="invoice__store-details">
                {shopInfo?.address}<br />
                {shopInfo?.phone && <>Ph: {shopInfo.phone} · </>}{shopInfo?.email}<br />
                {shopInfo?.gstin && <>GSTIN: {shopInfo.gstin}</>}
              </div>
            </div>
            <div className="invoice__meta">
              <div className="invoice__number">TAX INVOICE</div>
              <div className="invoice__number" style={{ fontSize: '0.9rem', marginTop: 4 }}>{txn.invoiceNumber}</div>
              <div className="invoice__date">
                {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          <div className="invoice__customer-section">
            <div className="invoice__customer-label">Bill To</div>
            <div className="invoice__customer-name">{customerName}</div>
            {txn.customerPhone && (
              <div className="invoice__customer-phone">{txn.customerPhone}</div>
            )}
          </div>

          <table className="invoice__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>GST%</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(txn.items || []).map((item, i) => (
                <tr key={item.item_id || i}>
                  <td>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.productName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{item.sku}</div>
                  </td>
                  <td>{item.taxRate || 0}%</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtDec(item.sellingPrice)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {fmtDec(item.totalAmount || item.sellingPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="invoice__totals">
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">Subtotal</span>
                <span className="invoice__totals-value">{fmtDec(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="invoice__totals-row">
                  <span className="invoice__totals-label">Discount</span>
                  <span className="invoice__totals-value" style={{ color: '#22c55e' }}>- {fmtDec(discount)}</span>
                </div>
              )}
              <div className="invoice__totals-divider" />
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">Taxable Amount</span>
                <span className="invoice__totals-value">{fmtDec(taxable)}</span>
              </div>
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">CGST</span>
                <span className="invoice__totals-value">{fmtDec(cgst)}</span>
              </div>
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">SGST</span>
                <span className="invoice__totals-value">{fmtDec(sgst)}</span>
              </div>
              <div className="invoice__totals-divider" />
              <div className="invoice__grand-total">
                <span className="invoice__grand-total-label">TOTAL</span>
                <span className="invoice__grand-total-value">{fmtDec(total)}</span>
              </div>
              <div className="invoice__totals-row" style={{ marginTop: 8 }}>
                <span className="invoice__totals-label">Payment</span>
                <span className="invoice__totals-value">{txn.paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="invoice__footer">
            Thank you for shopping with us! · Goods once sold will not be taken back.<br />
            This is a computer generated invoice.
          </div>

          {/* ── Linked Returns ── */}
          {linkedReturns.length > 0 && (
            <div className="invoice__returns">
              <div className="invoice__returns-title">Linked Returns</div>
              {linkedReturns.map(r => (
                <div key={r.transaction_id} className="invoice__return-row">
                  <span className="invoice__return-inv">{r.invoiceNumber}</span>
                  <span className="invoice__return-items">
                    {(r.items || []).map(i => `${Math.abs(i.quantity)}× ${i.productName}`).join(', ')}
                  </span>
                  <span className="invoice__return-amt">−₹{Math.abs(parseFloat(r.totalAmount)).toLocaleString('en-IN')}</span>
                  <span className="invoice__return-method">{r.paymentMethod}</span>
                  <span className="invoice__return-date">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Return Button pinned at bottom of modal ── */}
        {txn.status !== 'CANCELLED' && txn.transaction_type !== 'RETURN' && (
          <div className="invoice-modal__return-bar">
            <button
              className="invoice-return-btn"
              onClick={onInitiateReturn}
              disabled={txn.status === 'RETURNED' && linkedReturns.length > 0 && (txn.items || []).every(i => i.quantity <= (i.returnedQty || 0))}
            >
              <Icon name="refresh" size={15} />
              {txn.status === 'RETURNED' ? 'Fully Returned' : 'Initiate Return / Refund'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Transactions Component ────────────────────────────────
export default function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate, setFilterDate]     = useState('today');
  const [selected, setSelected]         = useState(null);     // full txn for invoice modal
  const [detailLoading, setDetailLoading] = useState(false);
  const [shopInfo, setShopInfo]         = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [linkedReturns, setLinkedReturns]     = useState([]);
  
  const [showPeriodMenu, setShowPeriodMenu]   = useState(false);
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const periodRef = useRef(null);
  const paymentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      if (paymentRef.current && !paymentRef.current.contains(e.target)) setShowPaymentMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch shop info once for invoice header
  useEffect(() => {
    getShopProfile().then(res => {
      if (res?.success) setShopInfo(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchTransactions(); }, [filterDate, filterPayment]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterPayment !== 'all') params.paymentMethod = filterPayment.toUpperCase();

      if (filterDate === 'today') {
        const todayStr = getLocalDateStr();
        params.startDate = todayStr;
        params.endDate   = todayStr;
      } else if (filterDate === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = getLocalDateStr(y);
        params.startDate = yStr;
        params.endDate   = yStr;
      } else if (filterDate === 'week') {
        const w = new Date(); w.setDate(w.getDate() - 7);
        params.startDate = getLocalDateStr(w);
        params.endDate   = getLocalDateStr();
      }
      if (search) params.search = search;

      const res = await getTransactions(params);
      if (res.success) setTransactions(res.data);
    } catch (err) {
      console.error('Transactions fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (e.key === 'Enter') fetchTransactions();
  };

  // On row click → open original bill (InvoiceBillModal)
  const handleViewInvoice = async (id) => {
    try {
      setDetailLoading(true);
      setLinkedReturns([]);
      const [txnRes, retRes] = await Promise.all([
        getTransactionById(id),
        getReturnsByInvoice(id),
      ]);
      if (txnRes.success) setSelected(txnRes.data);
      if (retRes.success) setLinkedReturns(retRes.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalAmount       = transactions.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const totalTransactions = transactions.length;

  return (
    <div className="transactions">

      {/* Header stats */}
      <div className="transactions-header">
        <div className="transactions-stat-cards">
          <div className="transactions-stat-card">
            <span className="transactions-stat-card__label">Total Transactions</span>
            <span className="transactions-stat-card__value">{totalTransactions}</span>
          </div>
          <div className="transactions-stat-card">
            <span className="transactions-stat-card__label">Total Amount</span>
            <span className="transactions-stat-card__value">{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="transactions-filters">
        <div className="transactions-search">
          <Icon name="search" size={16} />
          <input
            className="transactions-search__input"
            placeholder="Search by invoice or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <div className="transactions-filter-group">
          <label className="transactions-filter-label">Period</label>
          <div className="transactions-dropdown-custom" ref={periodRef}>
            <div 
              className={`transactions-dropdown-trigger ${showPeriodMenu ? 'transactions-dropdown-trigger--active' : ''}`} 
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            >
              <span>{filterDate === 'yesterday' ? 'Yesterday' : filterDate === 'week' ? 'Last 7 Days' : filterDate === 'all' ? 'All Time' : 'Today'}</span>
              <Icon name="chevronDown" size={14} />
            </div>
            {showPeriodMenu && (
              <div className="transactions-dropdown-menu">
                {['today', 'yesterday', 'week', 'all'].map(v => (
                  <div 
                    key={v}
                    className={`transactions-dropdown-item ${filterDate === v ? 'active' : ''}`}
                    onClick={() => { setFilterDate(v); setShowPeriodMenu(false); }}
                  >
                    {v === 'today' ? 'Today' : v === 'yesterday' ? 'Yesterday' : v === 'week' ? 'Last 7 Days' : 'All Time'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="transactions-filter-group">
          <label className="transactions-filter-label">Payment</label>
          <div className="transactions-dropdown-custom" ref={paymentRef}>
            <div 
              className={`transactions-dropdown-trigger ${showPaymentMenu ? 'transactions-dropdown-trigger--active' : ''}`} 
              onClick={() => setShowPaymentMenu(!showPaymentMenu)}
            >
              <span>{filterPayment === 'all' ? 'All' : filterPayment === 'cash' ? 'Cash' : filterPayment === 'card' ? 'Card' : 'UPI'}</span>
              <Icon name="chevronDown" size={14} />
            </div>
            {showPaymentMenu && (
              <div className="transactions-dropdown-menu">
                {['all', 'cash', 'card', 'upi'].map(v => (
                  <div 
                    key={v}
                    className={`transactions-dropdown-item ${filterPayment === v ? 'active' : ''}`}
                    onClick={() => { setFilterPayment(v); setShowPaymentMenu(false); }}
                  >
                    {v === 'all' ? 'All' : v === 'cash' ? 'Cash' : v === 'card' ? 'Card' : 'UPI'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="transactions-table-wrapper">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="app-loading__spinner" />
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>{user?.userType !== 'supplier' ? 'User' : 'Cashier'}</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Amount</th>
                {user?.userType === 'supplier' && <th>Status</th>}
                <th>Time</th>
                <th style={{ width: 60 }}>Bill</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="transactions-empty">
                    <Icon name="search" size={32} />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : transactions.map(tx => (
                <tr
                  key={tx.transaction_id}
                  onClick={() => handleViewInvoice(tx.transaction_id)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view original bill"
                >
                  <td><span className="transactions-invoice-no">{tx.invoiceNumber}</span></td>
                  <td>
                    <span className="transactions-customer">
                      {tx.customerName ||
                        (tx.notes?.includes('Customer:')
                          ? tx.notes.split('Customer:')[1].split('|')[0].trim()
                          : 'Walk-in')}
                    </span>
                  </td>
                  <td>
                    <span className="transactions-cashier" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {tx.cashierName || 'Unknown'}
                    </span>
                  </td>
                  <td>{tx.itemCount || '—'}</td>
                  <td>
                    <span className={`transactions-payment-badge transactions-payment-badge--${tx.paymentMethod?.toLowerCase()}`}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td><span className="transactions-amount">{fmt(tx.totalAmount)}</span></td>
                  {user?.userType === 'supplier' && (
                    <td>
                      <span className={`suppliers-status-badge suppliers-status-badge--${tx.status === 'COMPLETED' ? 'active' : 'pending'}`} style={{ fontSize: '0.65rem' }}>
                        {tx.status}
                      </span>
                    </td>
                  )}
                  <td><span className="transactions-time">{timeAgo(tx.createdAt)}</span></td>
                  <td>
                    <div className="transactions-actions">
                      <button
                        className="transactions-action-btn"
                        title="View Original Bill"
                        onClick={(e) => { e.stopPropagation(); handleViewInvoice(tx.transaction_id); }}
                      >
                        <Icon name="billing" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Loading overlay */}
      {detailLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="app-loading__spinner" />
        </div>
      )}

      {/* Original Bill Modal */}
      {selected && !showReturnModal && (
        <InvoiceBillModal
          txn={selected}
          shopInfo={shopInfo}
          linkedReturns={linkedReturns}
          onClose={() => { setSelected(null); setLinkedReturns([]); }}
          onInitiateReturn={() => setShowReturnModal(true)}
        />
      )}

      {/* Return Modal */}
      {showReturnModal && selected && (
        <ReturnModal
          txn={selected}
          shopInfo={shopInfo}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            // Re-fetch the transaction & linked returns after a successful return
            getTransactionById(selected.transaction_id)
              .then(res => { if (res.success) setSelected(res.data); });
            getReturnsByInvoice(selected.transaction_id)
              .then(res => { if (res.success) setLinkedReturns(res.data); });
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}