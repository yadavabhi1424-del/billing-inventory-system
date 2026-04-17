// CustomerInsights.jsx — Supplier-only top customers section
import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getCustomerReport } from '../../services/api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function CustomerInsights({ filters }) {
  const [sortBy,  setSortBy]  = useState('spent');  // spent | orders
  const [limit,   setLimit]   = useState(5);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [filters, sortBy, limit]);

  const buildParams = () => {
    const p = { limit, sortBy };
    if (filters.period === 'custom' && filters.startDate && filters.endDate) {
      p.startDate = filters.startDate; p.endDate = filters.endDate;
    } else if (filters.period === 'month-pick' && filters.month) {
      p.month = filters.month; p.year = filters.year || new Date().getFullYear();
    } else if (filters.period !== 'month-pick' && filters.period !== 'custom') {
      p.period = filters.period;
    }
    return p;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCustomerReport(buildParams());
      if (res.success) setData(res.data);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const customers = data?.topCustomers || [];
  const maxSpent = Math.max(...customers.map(c => parseFloat(c.totalSpent || 0)), 1);

  const RANK_COLORS = ['#f59e0b','#94a3b8','#b45309'];

  return (
    <div className="report-section sr-customers">
      <div className="sr-section-header">
        <div className="sr-section-title-group">
          <h3 className="report-section__title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            Customer Insights
          </h3>
          <p className="sr-section-sub">Top B2B shop customers by purchase value</p>
        </div>
        <div className="sr-controls">
          <div className="sr-tab-toggle">
            <button className={`sr-toggle-btn${sortBy === 'spent' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('spent')}>
              By Value
            </button>
            <button className={`sr-toggle-btn${sortBy === 'orders' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('orders')}>
              By Orders
            </button>
          </div>
        </div>
      </div>

      {/* Summary mini-cards */}
      <div className="sr-cust-summary">
        <div className="sr-mini-card">
          <Icon name="customers" size={18} style={{ color: 'var(--color-accent-primary)' }} />
          <div>
            <div className="sr-mini-card__val">{summary.totalCustomers || 0}</div>
            <div className="sr-mini-card__lbl">Total Shops</div>
          </div>
        </div>
        <div className="sr-mini-card">
          <Icon name="plus" size={18} />
          <div>
            <div className="sr-mini-card__val">{summary.newCustomers || 0}</div>
            <div className="sr-mini-card__lbl">New This Period</div>
          </div>
        </div>
        <div className="sr-mini-card">
          <Icon name="billing" size={18} />
          <div>
            <div className="sr-mini-card__val">{fmt(customers[0]?.totalSpent || 0)}</div>
            <div className="sr-mini-card__lbl">Top Customer Value</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="sr-loader"><div className="app-loading__spinner" /></div>
      ) : customers.length === 0 ? (
        <div className="sr-empty"><Icon name="customers" size={28} /><p>No customer data found</p></div>
      ) : (
        <>
          <div className="sr-perf-list">
            {customers.map((c, i) => {
              const pct = ((parseFloat(c.totalSpent || 0) / maxSpent) * 100).toFixed(1);
              const col = RANK_COLORS[i] || 'var(--color-accent-primary)';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              return (
                <div key={i} className="sr-perf-item">
                  <div className="sr-perf-rank" style={{ background: 'var(--color-bg-overlay)', color: col, fontSize: i < 3 ? '1.1rem' : '0.85rem', minWidth: 40 }}>
                    {medal}
                  </div>
                  <div className="sr-perf-info">
                    <div className="sr-perf-name">{c.name}</div>
                    <div className="sr-perf-bar-wrap">
                      <div className="sr-perf-bar" style={{ width: `${pct}%`, background: col }} />
                    </div>
                  </div>
                  <div className="sr-perf-meta">
                    <span className="sr-perf-qty">{c.totalOrders} orders</span>
                    <span className="sr-perf-rev">{fmt(c.totalSpent)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sr-expand-row">
            {limit > 5 && (
              <button className="sr-expand-btn sr-expand-btn--secondary" onClick={() => setLimit(5)}>Show Less</button>
            )}
            {customers.length >= limit && (
              <button className="sr-expand-btn" onClick={() => setLimit(p => p + 10)}>
                <Icon name="plus" size={14} /> Show More
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
