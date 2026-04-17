import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getTransactions, getTransactionById, getShopProfile } from '../../services/api';
import './Transactions.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

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

export default function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [filterDate, filterPayment]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filterPayment !== 'all') params.paymentMethod = filterPayment.toUpperCase();

      if (filterDate === 'today') {
        const todayStr = getLocalDateStr();
        params.startDate = todayStr;
        params.endDate = todayStr;
      } else if (filterDate === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = getLocalDateStr(y);
        params.startDate = yStr;
        params.endDate = yStr;
      } else if (filterDate === 'week') {
        const w = new Date();
        w.setDate(w.getDate() - 7);
        params.startDate = getLocalDateStr(w);
        params.endDate = getLocalDateStr(); // Explicit end date for range
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

  const handleViewDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await getTransactionById(id);
      if (res.success) setSelected(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = (txn) => {
    const customerName = txn.customerName || (txn.notes?.includes('Customer:') ? txn.notes.split('Customer:')[1].split('|')[0].trim() : 'Walk-in Customer');
    const itemRows = (txn.items || []).map(item => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₹${Number(item.sellingPrice).toLocaleString('en-IN')}</td>
        <td style="text-align:right">₹${Number(item.discountAmount || 0).toLocaleString('en-IN')}</td>
        <td style="text-align:right">₹${Number(item.taxAmount || 0).toLocaleString('en-IN')}</td>
        <td style="text-align:right;font-weight:600">₹${Number(item.totalAmount).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transaction ${txn.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 20mm; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
    .cards { display: flex; gap: 16px; margin-bottom: 24px; }
    .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; background: #f8fafc; }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .card-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 12px; }
    .card-label { color: #64748b; min-width: 60px; }
    .card-value { color: #0f172a; font-weight: 600; }
    .badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 700; background: #f8fafc; border-top: 2px solid #e2e8f0; }
    .summary { width: 260px; margin-left: auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; color: #475569; border-bottom: 1px solid #f1f5f9; }
    .summary-row span:last-child { font-weight: 600; color: #0f172a; }
    .summary-total { display: flex; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-top: 8px; font-weight: 700; font-size: 14px; }
    @media print { @page { margin: 10mm; size: A4; } }
  </style>
</head>
<body>
  <h2>Transaction Details — ${txn.invoiceNumber}</h2>
  <div class="cards">
    <div class="card">
      <div class="card-title">Transaction Info</div>
      <div class="card-row"><span class="card-label">ID:</span><span class="card-value">${txn.invoiceNumber}</span></div>
      <div class="card-row"><span class="card-label">Status:</span><span class="badge">${txn.status || 'COMPLETED'}</span></div>
      <div class="card-row"><span class="card-label">Date:</span><span class="card-value">${new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <div class="card-row"><span class="card-label">Time:</span><span class="card-value">${new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Customer Info</div>
      <div class="card-row"><span class="card-label">Name:</span><span class="card-value">${customerName}</span></div>
      <div class="card-row"><span class="card-label">Phone:</span><span class="card-value">${txn.customerPhone || 'N/A'}</span></div>
      <div class="card-row"><span class="card-label">Type:</span><span class="card-value">${txn.customerName ? 'Registered' : 'Walk-in'}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Performed By</div>
      <div class="card-row"><span class="card-label">User:</span><span class="card-value">${txn.cashierName || 'Unknown'}</span></div>
      <div class="card-row"><span class="card-label">Method:</span><span class="card-value">${txn.paymentMethod}</span></div>
      <div class="card-row"><span class="card-label">Status:</span><span class="card-value">${txn.paymentStatus}</span></div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th>
      <th style="text-align:right">Discount</th><th style="text-align:right">Tax</th><th style="text-align:right">Subtotal</th>
    </tr></thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="5" style="text-align:right">Total:</td>
        <td style="text-align:right">₹${Number(txn.totalAmount).toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>
  <div class="summary">
    <div class="summary-row"><span>Order Total:</span><span>₹${Number(txn.subtotal).toLocaleString('en-IN')}</span></div>
    <div class="summary-row"><span>Discount:</span><span>₹${Number(txn.discountAmount).toLocaleString('en-IN')}</span></div>
    <div class="summary-row"><span>Tax:</span><span>₹${Number(txn.taxAmount).toLocaleString('en-IN')}</span></div>
    <div class="summary-total"><span>Final Amount:</span><span>₹${Number(txn.totalAmount).toLocaleString('en-IN')}</span></div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const totalAmount = transactions.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
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
          <select
            className="transactions-filter-select"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div className="transactions-filter-group">
          <label className="transactions-filter-label">Payment</label>
          <select
            className="transactions-filter-select"
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value)}
          >
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
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
                <th style={{ width: 60 }}>Actions</th>
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
                <tr key={tx.transaction_id} onClick={() => handleViewDetail(tx.transaction_id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span className="transactions-invoice-no">{tx.invoiceNumber}</span>
                  </td>
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
                  <td>
                    <span className="transactions-amount">{fmt(tx.totalAmount)}</span>
                  </td>
                  {user?.userType === 'supplier' && (
                    <td>
                      <span className={`suppliers-status-badge suppliers-status-badge--${tx.status === 'COMPLETED' ? 'active' : 'pending'}`} style={{ fontSize: '0.65rem' }}>
                        {tx.status}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className="transactions-time">{timeAgo(tx.createdAt)}</span>
                  </td>
                  <td>
                    <div className="transactions-actions">
                      <button
                        className="transactions-action-btn"
                        title="View Invoice"
                        onClick={(e) => { e.stopPropagation(); handleViewDetail(tx.transaction_id); }}
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

      {/* Detail Modal */}
      {selected && (
        <div className="txn-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="txn-modal" onClick={e => e.stopPropagation()}>
            <div className="txn-modal__header">
              <h2>Transaction Details</h2>
              <button className="txn-modal__close" onClick={() => setSelected(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="txn-modal__body">
              {/* Top Cards */}
              <div className="txn-modal__info-cards">
                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Transaction Info</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">ID:</span>
                      <span className="txn-modal__card-value">{selected.invoiceNumber}</span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Status:</span>
                      <span className="txn-modal__status-badge">{selected.status || 'COMPLETED'}</span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Date:</span>
                      <span className="txn-modal__card-value">
                        {new Date(selected.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Time:</span>
                      <span className="txn-modal__card-value">
                        {new Date(selected.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Customer Info</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Name:</span>
                      <span className="txn-modal__card-value">{selected.customerName || (selected.notes?.includes('Customer:') ? selected.notes.split('Customer:')[1].split('|')[0].trim() : 'Walk-in Customer')}</span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Phone:</span>
                      <span className="txn-modal__card-value">{selected.customerPhone || 'N/A'}</span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Type:</span>
                      <span className="txn-modal__card-value">{selected.customerName ? 'Registered' : 'Walk-in'}</span>
                    </div>
                  </div>
                </div>

                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Performed By (User Info)</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">User:</span>
                      <span className="txn-modal__card-value">{selected.cashierName || 'Unknown'}</span>
                    </div>
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Role:</span>
                      <span className="txn-modal__card-value">Cashier</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="txn-modal__table-wrapper">
                <table className="txn-modal__table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'right' }}>Discount</th>
                      <th style={{ textAlign: 'right' }}>Tax</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items?.map((item, i) => (
                      <tr key={item.item_id}>
                        <td>{item.productName}</td>
                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.sellingPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.discountAmount || 0)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.taxAmount || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                    <tr className="txn-modal__table-total-row">
                      <td colSpan="5" style={{ textAlign: 'right' }}>Total:</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(selected.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary */}
              <div className="txn-modal__bottom">
                <div className="txn-modal__payment-card">
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12, color: '#1e293b' }}>Payment Details</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Method:</span>
                      <span className="txn-modal__card-value">{selected.paymentMethod}</span>
                    </div>
                    {selected.payments && selected.payments.length > 0 && selected.payments[0].reference && (
                      <div className="txn-modal__card-row">
                        <span className="txn-modal__card-label">Ref:</span>
                        <span className="txn-modal__card-value">{selected.payments[0].reference}</span>
                      </div>
                    )}
                    <div className="txn-modal__card-row">
                      <span className="txn-modal__card-label">Status:</span>
                      <span className="txn-modal__card-value">{selected.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="txn-modal__summary">
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: '#1e293b' }}>Summary</div>
                  <div className="txn-modal__summary-row">
                    <span>Order Total:</span>
                    <span className="txn-modal__summary-val">{fmt(selected.subtotal)}</span>
                  </div>
                  <div className="txn-modal__summary-row">
                    <span>Discount:</span>
                    <span className="txn-modal__summary-val">{fmt(selected.discountAmount)}</span>
                  </div>
                  <div className="txn-modal__summary-row">
                    <span>Tax:</span>
                    <span className="txn-modal__summary-val">{fmt(selected.taxAmount)}</span>
                  </div>
                  <div className="txn-modal__summary-total">
                    <span>Final Amount:</span>
                    <span>{fmt(selected.totalAmount)}</span>
                  </div>

                  <div className="txn-modal__actions">
                    <button className="txn-modal__btn txn-modal__btn--secondary" onClick={() => handlePrint(selected)}>
                      <Icon name="reports" size={16} /> Export PDF
                    </button>
                    <button className="txn-modal__btn txn-modal__btn--primary" onClick={() => handlePrint(selected)}>
                      <Icon name="billing" size={16} /> Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}