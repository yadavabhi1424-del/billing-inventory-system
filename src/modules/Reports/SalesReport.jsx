import { useState } from 'react';
import Icon from '../../components/Icon';

// Mock data
const SALES_DATA = {
  today: { revenue: 12480, orders: 48, avgOrder: 260, profit: 3744 },
  week: { revenue: 87350, orders: 312, avgOrder: 280, profit: 27752 },
  month: { revenue: 342800, orders: 1248, avgOrder: 275, profit: 111310 },
};

const TOP_PRODUCTS = [
  { name: 'Basmati Rice (5kg)', qty: 142, revenue: 45440 },
  { name: 'Sunflower Oil (1L)', qty: 98, revenue: 17640 },
  { name: 'Tata Salt (1kg)', qty: 210, revenue: 5880 },
  { name: 'Amul Butter (500g)', qty: 87, revenue: 22620 },
  { name: 'Wheat Flour (2kg)', qty: 156, revenue: 14820 },
];

const PAYMENT_BREAKDOWN = [
  { method: 'Cash', amount: 48200, percentage: 42 },
  { method: 'Card', amount: 32500, percentage: 28 },
  { method: 'UPI', amount: 34650, percentage: 30 },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SalesReport() {
  const [period, setPeriod] = useState('month');
  const data = SALES_DATA[period];

  return (
    <div className="sales-report">
      
      {/* Header with Period Filter */}
      <div className="report-header">
        <div>
          <h2 className="report-heading">Sales Overview</h2>
          <p className="report-subheading">Revenue and performance metrics</p>
        </div>
        
        <div className="report-period-filter">
          {['today', 'week', 'month'].map(p => (
            <button
              key={p}
              className={`report-period-btn ${period === p ? 'report-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' }}>
            <Icon name="reports" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Total Revenue</span>
            <span className="report-stat-card__value">{fmt(data.revenue)}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <Icon name="billing" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Total Orders</span>
            <span className="report-stat-card__value">{data.orders}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-violet-soft)', color: 'var(--color-violet)' }}>
            <Icon name="billing" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Avg Order Value</span>
            <span className="report-stat-card__value">{fmt(data.avgOrder)}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-cyan-soft)', color: 'var(--color-cyan)' }}>
            <Icon name="reports" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Gross Profit</span>
            <span className="report-stat-card__value">{fmt(data.profit)}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="report-grid">
        
        {/* Top Products */}
        <div className="report-section">
          <h3 className="report-section__title">Top Selling Products</h3>
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.map((product, i) => (
                  <tr key={i}>
                    <td>
                      <div className="report-product-name">{product.name}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="report-qty">{product.qty}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="report-amount">{fmt(product.revenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="report-section">
          <h3 className="report-section__title">Payment Method Breakdown</h3>
          <div className="payment-breakdown-list">
            {PAYMENT_BREAKDOWN.map(payment => (
              <div key={payment.method} className="payment-breakdown-item">
                <div className="payment-breakdown-item__info">
                  <span className="payment-breakdown-item__method">{payment.method}</span>
                  <span className="payment-breakdown-item__amount">{fmt(payment.amount)}</span>
                </div>
                <div className="payment-breakdown-item__bar">
                  <div 
                    className="payment-breakdown-item__bar-fill"
                    style={{ width: `${payment.percentage}%` }}
                  />
                </div>
                <span className="payment-breakdown-item__percentage">{payment.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="report-actions">
        <button className="report-export-btn">
          <Icon name="reports" size={16} />
          Export to PDF
        </button>
        <button className="report-export-btn report-export-btn--secondary">
          <Icon name="inventory" size={16} />
          Export to Excel
        </button>
      </div>
    </div>
  );
}