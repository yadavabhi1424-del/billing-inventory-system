import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getTransactions, getTransactionById } from '../../services/api';
import './Transactions.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hr ago`;
  return new Date(dateStr).toLocaleDateString('en-IN');
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate,    setFilterDate]    = useState('today');
  const [selected,      setSelected]      = useState(null);
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
        params.startDate = new Date().toISOString().split('T')[0];
        params.endDate   = new Date().toISOString().split('T')[0];
      } else if (filterDate === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        params.startDate = yStr;
        params.endDate   = yStr;
      } else if (filterDate === 'week') {
        const w = new Date();
        w.setDate(w.getDate() - 7);
        params.startDate = w.toISOString().split('T')[0];
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
                <th>Items</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Time</th>
                <th>Actions</th>
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
                <tr key={tx.transaction_id}>
                  <td>
                    <span className="transactions-invoice-no">{tx.invoiceNumber}</span>
                  </td>
                  <td>
                    <span className="transactions-customer">
                      {tx.customerName || 'Walk-in'}
                    </span>
                  </td>
                  <td>{tx.items?.length || '—'}</td>
                  <td>
                    <span className={`transactions-payment-badge transactions-payment-badge--${tx.paymentMethod?.toLowerCase()}`}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span className="transactions-amount">{fmt(tx.totalAmount)}</span>
                  </td>
                  <td>
                    <span className="transactions-time">{timeAgo(tx.createdAt)}</span>
                  </td>
                  <td>
                    <div className="transactions-actions">
                      <button
                        className="transactions-action-btn"
                        title="View Invoice"
                        onClick={() => handleViewDetail(tx.transaction_id)}
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
        <div className="invoice-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="invoice-modal" onClick={e => e.stopPropagation()}>
            <div className="invoice-modal__actions">
              <button className="invoice-action-btn" onClick={() => window.print()}>
                <Icon name="billing" size={15} /> Print
              </button>
              <button
                className="invoice-action-btn invoice-action-btn--close"
                onClick={() => setSelected(null)}
              >
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="invoice" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>{selected.invoiceNumber}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {selected.customerName || 'Walk-in'} · {new Date(selected.createdAt).toLocaleString('en-IN')}
              </p>
              <table className="invoice__table" style={{ marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items?.map((item, i) => (
                    <tr key={item.item_id}>
                      <td>{i + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.sellingPrice}</td>
                      <td>₹{item.totalAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                <div>Subtotal: {fmt(selected.subtotal)}</div>
                <div>Tax: {fmt(selected.taxAmount)}</div>
                <div>Discount: {fmt(selected.discountAmount)}</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  Total: {fmt(selected.totalAmount)}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  {selected.paymentMethod} · {selected.paymentStatus}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}