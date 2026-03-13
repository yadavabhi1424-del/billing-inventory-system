import { useState } from 'react';
import Icon from '../../components/Icon';
import './Overview.css';

// Mock data (replace with API later)
const TODAY_STATS = {
  revenue: 12480,
  cost: 8736,
  profit: 3744,
  orders: 48,
  customers: 41,
  avgOrder: 260,
};

const PAYMENT_BREAKDOWN = [
  { method: 'Cash', amount: 4890, count: 18, color: 'var(--color-success)' },
  { method: 'Card', amount: 4320, count: 15, color: 'var(--color-violet)' },
  { method: 'UPI', amount: 3270, count: 15, color: 'var(--color-accent-primary)' },
];

const TOP_PRODUCTS = [
  { name: 'Basmati Rice (5kg)', qty: 24, revenue: 7680, trend: +12 },
  { name: 'Tata Salt (1kg)', qty: 18, revenue: 504, trend: +8 },
  { name: 'Sunflower Oil (1L)', qty: 15, revenue: 2700, trend: -3 },
  { name: 'Amul Butter (500g)', qty: 12, revenue: 3120, trend: +5 },
  { name: 'Whole Wheat Flour (2kg)', qty: 11, revenue: 1045, trend: +15 },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function Overview() {
  const totalPayments = PAYMENT_BREAKDOWN.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="overview">
      
      {/* Top Stats Cards */}
      <div className="overview-stats">
        <div className="overview-stat-card" style={{ '--accent': 'var(--color-accent-primary)' }}>
          <div className="overview-stat-card__icon">
            <Icon name="reports" size={20} />
          </div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Today's Revenue</span>
            <span className="overview-stat-card__value">{fmt(TODAY_STATS.revenue)}</span>
            <span className="overview-stat-card__trend">+8.4% vs yesterday</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-success)' }}>
          <div className="overview-stat-card__icon">
            <Icon name="billing" size={20} />
          </div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Gross Profit</span>
            <span className="overview-stat-card__value">{fmt(TODAY_STATS.profit)}</span>
            <span className="overview-stat-card__trend">+14.2% vs yesterday</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-violet)' }}>
          <div className="overview-stat-card__icon">
            <Icon name="inventory" size={20} />
          </div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Total Orders</span>
            <span className="overview-stat-card__value">{TODAY_STATS.orders}</span>
            <span className="overview-stat-card__trend">{TODAY_STATS.customers} customers</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-cyan)' }}>
          <div className="overview-stat-card__icon">
            <Icon name="billing" size={20} />
          </div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Avg Order Value</span>
            <span className="overview-stat-card__value">{fmt(TODAY_STATS.avgOrder)}</span>
            <span className="overview-stat-card__trend">Per transaction</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="overview-grid">
        
        {/* Payment Breakdown */}
        <div className="overview-section">
          <div className="overview-section__header">
            <h3 className="overview-section__title">Payment Breakdown</h3>
            <span className="overview-section__subtitle">Today's transactions</span>
          </div>

          <div className="payment-breakdown">
            {PAYMENT_BREAKDOWN.map(payment => {
              const percentage = ((payment.amount / totalPayments) * 100).toFixed(1);
              return (
                <div key={payment.method} className="payment-method-row">
                  <div className="payment-method-row__info">
                    <div className="payment-method-row__dot" style={{ background: payment.color }} />
                    <div>
                      <div className="payment-method-row__name">{payment.method}</div>
                      <div className="payment-method-row__count">{payment.count} transactions</div>
                    </div>
                  </div>
                  <div className="payment-method-row__right">
                    <div className="payment-method-row__amount">{fmt(payment.amount)}</div>
                    <div className="payment-method-row__percent">{percentage}%</div>
                  </div>
                  <div className="payment-method-row__bar">
                    <div 
                      className="payment-method-row__bar-fill" 
                      style={{ width: `${percentage}%`, background: payment.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
<div className="overview-section">
  <div className="overview-section__header">
    <h3 className="overview-section__title">Top Selling Products</h3>
    <span className="overview-section__subtitle">Best performers today</span>
  </div>

  <div className="top-products-list">
    {TOP_PRODUCTS.map((product, index) => (
      <div key={product.name} className="top-product-item">
        <div className="top-product-item__rank">#{index + 1}</div>
        <div className="top-product-item__info">
          <div className="top-product-item__name">{product.name}</div>
          <div className="top-product-item__qty">{product.qty} sold</div>
        </div>
        <div className="top-product-item__right">
          <div className="top-product-item__revenue">{fmt(product.revenue)}</div>
          <div className={`top-product-item__trend ${product.trend >= 0 ? 'top-product-item__trend--up' : 'top-product-item__trend--down'}`}>
            {product.trend >= 0 ? '↑' : '↓'} {Math.abs(product.trend)}%
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
      </div>
    </div>
  );
}