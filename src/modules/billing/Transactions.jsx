import { useState } from 'react';
import Icon from '../../components/Icon';
import './Transactions.css';

// Mock transaction data (replace with API later)
const MOCK_TRANSACTIONS = [
  { id: 'INV-20260220-3421', customer: 'Sunita Devi', amount: 643, payment: 'UPI', items: 4, time: '2 min ago', date: '2026-02-20' },
  { id: 'INV-20260220-3420', customer: 'Walk-in', amount: 248, payment: 'Cash', items: 2, time: '18 min ago', date: '2026-02-20' },
  { id: 'INV-20260220-3419', customer: 'Rahul Sharma', amount: 1124, payment: 'Card', items: 6, time: '34 min ago', date: '2026-02-20' },
  { id: 'INV-20260220-3418', customer: 'Walk-in', amount: 320, payment: 'Cash', items: 1, time: '51 min ago', date: '2026-02-20' },
  { id: 'INV-20260220-3417', customer: 'Priya Gupta', amount: 568, payment: 'UPI', items: 3, time: '1 hr ago', date: '2026-02-20' },
  { id: 'INV-20260219-3416', customer: 'Amit Kumar', amount: 892, payment: 'Card', items: 5, time: 'Yesterday', date: '2026-02-19' },
  { id: 'INV-20260219-3415', customer: 'Walk-in', amount: 156, payment: 'Cash', items: 2, time: 'Yesterday', date: '2026-02-19' },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDate, setFilterDate] = useState('today');

  // Filter transactions
  const filtered = MOCK_TRANSACTIONS.filter(tx => {
    const matchSearch = tx.id.toLowerCase().includes(search.toLowerCase()) ||
                       tx.customer.toLowerCase().includes(search.toLowerCase());
    const matchPayment = filterPayment === 'all' || tx.payment.toLowerCase() === filterPayment;
    const matchDate = filterDate === 'all' || 
                     (filterDate === 'today' && tx.date === '2026-02-20') ||
                     (filterDate === 'yesterday' && tx.date === '2026-02-19');
    return matchSearch && matchPayment && matchDate;
  });

  // Calculate totals
  const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
  const totalTransactions = filtered.length;

  return (
    <div className="transactions">
      
      {/* Header with stats */}
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
        {/* Search */}
        <div className="transactions-search">
          <Icon name="search" size={16} />
          <input
            className="transactions-search__input"
            placeholder="Search by invoice or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Date filter */}
        <div className="transactions-filter-group">
          <label className="transactions-filter-label">Period</label>
          <select 
            className="transactions-filter-select"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Payment filter */}
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="transactions-empty">
                  <Icon name="search" size={32} />
                  <p>No transactions found</p>
                </td>
              </tr>
            ) : (
              filtered.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className="transactions-invoice-no">{tx.id}</span>
                  </td>
                  <td>
                    <span className="transactions-customer">{tx.customer}</span>
                  </td>
                  <td>{tx.items}</td>
                  <td>
                    <span className={`transactions-payment-badge transactions-payment-badge--${tx.payment.toLowerCase()}`}>
                      {tx.payment}
                    </span>
                  </td>
                  <td>
                    <span className="transactions-amount">{fmt(tx.amount)}</span>
                  </td>
                  <td>
                    <span className="transactions-time">{tx.time}</span>
                  </td>
                  <td>
                    <div className="transactions-actions">
                      <button className="transactions-action-btn" title="View Invoice">
                        <Icon name="billing" size={14} />
                      </button>
                      <button className="transactions-action-btn" title="Print">
                        <Icon name="reports" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}