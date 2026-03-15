import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getTodaySummary, getSalesReport } from '../../services/api';
import './Overview.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function Overview() {
  const [stats,    setStats]    = useState(null);
  const [topProds, setTopProds] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, salesRes] = await Promise.all([
        getTodaySummary(),
        getSalesReport(),
      ]);
      if (summaryRes.success) setStats(summaryRes.data);
      if (salesRes.success)   setTopProds(salesRes.data.topProducts || []);
    } catch (err) {
      console.error('Overview fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  const paymentBreakdown = stats
    ? [
        { method: 'Cash', amount: stats.cashSales  || 0, color: 'var(--color-success)' },
        { method: 'Card', amount: stats.cardSales  || 0, color: 'var(--color-violet)'  },
        { method: 'UPI',  amount: stats.upiSales   || 0, color: 'var(--color-accent-primary)' },
      ]
    : [];

  const totalPayments = paymentBreakdown.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="overview">

      {/* Top Stats */}
      <div className="overview-stats">
        <div className="overview-stat-card" style={{ '--accent': 'var(--color-accent-primary)' }}>
          <div className="overview-stat-card__icon"><Icon name="reports" size={20} /></div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Today's Revenue</span>
            <span className="overview-stat-card__value">{fmt(stats?.totalSales || 0)}</span>
            <span className="overview-stat-card__trend">Total sales today</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-success)' }}>
          <div className="overview-stat-card__icon"><Icon name="billing" size={20} /></div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Total Tax</span>
            <span className="overview-stat-card__value">{fmt(stats?.totalTax || 0)}</span>
            <span className="overview-stat-card__trend">GST collected</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-violet)' }}>
          <div className="overview-stat-card__icon"><Icon name="inventory" size={20} /></div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Total Orders</span>
            <span className="overview-stat-card__value">{stats?.totalTransactions || 0}</span>
            <span className="overview-stat-card__trend">Transactions today</span>
          </div>
        </div>

        <div className="overview-stat-card" style={{ '--accent': 'var(--color-cyan)' }}>
          <div className="overview-stat-card__icon"><Icon name="billing" size={20} /></div>
          <div className="overview-stat-card__content">
            <span className="overview-stat-card__label">Total Discount</span>
            <span className="overview-stat-card__value">{fmt(stats?.totalDiscount || 0)}</span>
            <span className="overview-stat-card__trend">Discounts given</span>
          </div>
        </div>
      </div>

      {/* Two Column */}
      <div className="overview-grid">

        {/* Payment Breakdown */}
        <div className="overview-section">
          <div className="overview-section__header">
            <h3 className="overview-section__title">Payment Breakdown</h3>
            <span className="overview-section__subtitle">Today's transactions</span>
          </div>
          <div className="payment-breakdown">
            {totalPayments === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No transactions today yet
              </p>
            ) : paymentBreakdown.map(payment => {
              const percentage = ((payment.amount / totalPayments) * 100).toFixed(1);
              return (
                <div key={payment.method} className="payment-method-row">
                  <div className="payment-method-row__info">
                    <div className="payment-method-row__dot" style={{ background: payment.color }} />
                    <div>
                      <div className="payment-method-row__name">{payment.method}</div>
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
            <span className="overview-section__subtitle">This month</span>
          </div>
          <div className="top-products-list">
            {topProds.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No sales data yet
              </p>
            ) : topProds.map((product, index) => (
              <div key={product.productName} className="top-product-item">
                <div className="top-product-item__rank">#{index + 1}</div>
                <div className="top-product-item__info">
                  <div className="top-product-item__name">{product.productName}</div>
                  <div className="top-product-item__qty">{product.totalQty} sold</div>
                </div>
                <div className="top-product-item__right">
                  <div className="top-product-item__revenue">{fmt(product.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}