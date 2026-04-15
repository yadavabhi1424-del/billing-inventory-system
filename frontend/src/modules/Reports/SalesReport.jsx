import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getSalesReport, getProfitLossReport } from '../../services/api';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SalesReport() {
  const [period,  setPeriod]  = useState('month');
  const [data,    setData]    = useState(null);
  const [pl,      setPL]      = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { period };

      const [salesRes, plRes] = await Promise.all([
        getSalesReport(params),
        getProfitLossReport(params),
      ]);
      if (salesRes.success) setData(salesRes.data);
      if (plRes.success)    setPL(plRes.data);
    } catch (err) {
      console.error('Sales report error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const summary     = data?.summary     || {};
  const topProducts = data?.topProducts || [];
  const byPayment   = data?.byPaymentMethod || [];
  const totalPay    = byPayment.reduce((s, p) => s + parseFloat(p.total || 0), 0);

  return (
    <div className="sales-report">

      <div className="report-header">
        <div>
          <h2 className="report-heading">Sales Overview</h2>
          <p className="report-subheading">Revenue and performance metrics</p>
        </div>
        <div className="report-period-filter">
          {['today', 'week', 'month', 'overall'].map(p => (
            <button key={p}
              className={`report-period-btn ${period === p ? 'report-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Overall'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="app-loading__spinner" />
        </div>
      ) : (
        <>
          <div className="report-stats-grid">
            {[
              { label: 'Total Revenue',   value: fmt(summary.totalSales    || 0), icon: 'reports', bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
              { label: 'Total Orders',    value: summary.totalTransactions  || 0,  icon: 'billing', bg: 'var(--color-success-soft)', color: 'var(--color-success)'        },
              { label: 'Avg Order Value', value: fmt(summary.avgOrderValue  || 0), icon: 'billing', bg: 'var(--color-violet-soft)',  color: 'var(--color-violet)'         },
              { label: 'Gross Profit',    value: fmt(pl?.grossProfit        || 0), icon: 'reports', bg: 'var(--color-cyan-soft)',    color: 'var(--color-cyan)'           },
            ].map(s => (
              <div key={s.label} className="report-stat-card">
                <div className="report-stat-card__icon" style={{ background: s.bg, color: s.color }}>
                  <Icon name={s.icon} size={24} />
                </div>
                <div className="report-stat-card__content">
                  <span className="report-stat-card__label">{s.label}</span>
                  <span className="report-stat-card__value">{s.value}</span>
                </div>
              </div>
            ))}
          </div>

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
                    {topProducts.length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No sales data yet</td></tr>
                    ) : topProducts.map((p, i) => (
                      <tr key={i}>
                        <td><div className="report-product-name">{p.productName}</div></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{p.totalQty}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(p.totalRevenue)}</span></td>
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
                {byPayment.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No payment data yet</p>
                ) : byPayment.map(p => {
                  const pct = totalPay > 0 ? ((parseFloat(p.total) / totalPay) * 100).toFixed(1) : 0;
                  return (
                    <div key={p.paymentMethod} className="payment-breakdown-item">
                      <div className="payment-breakdown-item__info">
                        <span className="payment-breakdown-item__method">{p.paymentMethod}</span>
                        <span className="payment-breakdown-item__amount">{fmt(p.total)}</span>
                      </div>
                      <div className="payment-breakdown-item__bar">
                        <div className="payment-breakdown-item__bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="payment-breakdown-item__percentage">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}


    </div>
  );
}