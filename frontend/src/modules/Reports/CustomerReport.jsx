// CustomerReport.jsx — Comprehensive Customer Analytics Dashboard
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import Icon from '../../components/Icon';
import SalesFilterBar from './SalesFilterBar';
import { getCustomerReport, getCustomerDrilldown } from '../../services/api';
import './CustomerReport.css';

const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtN = (n) => Number(n || 0).toFixed(1);
const ago  = (d) => {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309', '#6366f1', '#10b981'];

const TABS = [
  { key: 'overview',  label: 'Overview',       icon: 'reports'   },
  { key: 'top',       label: 'Top Customers',  icon: 'customers' },
  { key: 'behavior',  label: 'Behavior',        icon: 'billing'   },
  { key: 'inactive',  label: 'Inactive / Lost', icon: 'refresh'   },
  { key: 'clv',       label: 'CLV Segments',   icon: 'box'       },
  { key: 'activity',  label: 'Activity Trend',  icon: 'reports'   },
];

// ── Custom recharts tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sr-chart-tooltip">
      <div className="sr-chart-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="sr-chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? fmt(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

// ── Drill-down modal ──────────────────────────────────────────────────────────
function DrilldownModal({ customerId, onClose }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerDrilldown(customerId)
      .then(res => { if (res.success) setD(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customerId]);

  const c = d?.customer || {};
  const orders = d?.orders || [];

  return (
    <div className="cr-modal-overlay" onClick={onClose}>
      <div className="cr-modal" onClick={e => e.stopPropagation()}>
        <div className="cr-modal-header">
          <div className="cr-modal-title-group">
            <div className="cr-modal-avatar">
              {(c.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="cr-modal-name">{c.name || customerId}</h3>
              <p className="cr-modal-sub">{c.phone || ''} {c.email ? `· ${c.email}` : ''}</p>
            </div>
          </div>
          <button className="cr-modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="sr-loader"><div className="app-loading__spinner" /></div>
        ) : (
          <>
            <div className="cr-modal-stats">
              {[
                { label: 'Total Spent',     value: fmt(c.totalSpent) },
                { label: 'Total Orders',    value: c.totalOrders || 0 },
                { label: 'Avg Order Value', value: fmt(c.avgOrderValue) },
                { label: 'First Purchase',  value: fmtDate(c.firstPurchaseDate) },
                { label: 'Last Purchase',   value: fmtDate(c.lastPurchaseDate) },
                { label: 'Loyalty Pts',     value: c.loyaltyPoints ?? '—' },
              ].map(s => (
                <div key={s.label} className="cr-modal-stat">
                  <div className="cr-modal-stat__val">{s.value}</div>
                  <div className="cr-modal-stat__lbl">{s.label}</div>
                </div>
              ))}
            </div>

            {c.notes && (
              <div className="cr-modal-notes">
                <span className="cr-modal-notes__label">Notes</span>
                <p>{c.notes}</p>
              </div>
            )}

            <h4 className="cr-modal-section-title">Purchase History</h4>
            <div className="cr-modal-orders">
              {orders.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No purchases found.</p>
              ) : orders.map((o, i) => {
                let items = [];
                try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch {}
                return (
                  <div key={i} className="cr-modal-order">
                    <div className="cr-modal-order-head">
                      <span className="cr-modal-order-inv">{o.invoiceNumber || o.order_number || o.order_id?.slice(0,8)}</span>
                      <span className={`cr-modal-order-status cr-status--${(o.status||'').toLowerCase()}`}>{o.status}</span>
                      <span className="cr-modal-order-date">{fmtDate(o.createdAt)}</span>
                      <span className="cr-modal-order-amt">{fmt(o.totalAmount || o.total_amount)}</span>
                    </div>
                    {items.length > 0 && (
                      <div className="cr-modal-order-items">
                        {items.map((it, j) => (
                          <span key={j} className="cr-modal-order-item">
                            {it.name} × {it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CustomerReport({ user }) {
  const isSupplier = user?.userType === 'supplier';

  const [tab,      setTab]      = useState('overview');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [sortBy,   setSortBy]   = useState('spent');
  const [limit,    setLimit]    = useState(10);
  const [inactive, setInactive] = useState('30');
  const [clvSeg,   setClvSeg]   = useState('high');
  const [drill,    setDrill]    = useState(null); // customerId for drilldown

  const [filters, setFilters] = useState({
    period:    'month',
    startDate: '',
    endDate:   ''
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    getCustomerReport({ sortBy, limit, period: filters.period, startDate: filters.startDate, endDate: filters.endDate })
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false));
  }, [sortBy, limit, filters.period, filters.startDate, filters.endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ov  = data?.overview       || {};
  const top = data?.topCustomers   || [];
  const beh = data?.behavior       || {};
  const inc = data?.inactiveCustomers?.buckets || {};
  const clv = data?.clvSegments    || {};
  const act = data?.monthlyActivity || [];
  const maxSpent = Math.max(...top.map(c => parseFloat(c.totalSpent || 0)), 1);

  const inactiveBucket = inc[inactive] || [];

  // Month label formatter
  const fmtMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return new Date(y, mo - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
  };

  if (loading && !data) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  return (
    <div className="customer-report cr-root">
      {/* ── Global Filter Bar ──────────────────────────────── */}
      <div className="sr-global-filter">
        <SalesFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="cr-header">
        <div>
          <h2 className="report-heading">
            {isSupplier ? 'B2B Customer Analytics' : 'Customer Analytics'}
          </h2>
          <p className="report-subheading">
            {isSupplier
              ? 'Wholesale shop performance, CLV segments & activity trends'
              : 'Customer behavior, lifetime value & activity trends'}
          </p>
        </div>
        <div className="sr-controls">
          <div className="sr-tab-toggle">
            <button className={`sr-toggle-btn${sortBy === 'spent'  ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('spent')}>By Value</button>
            <button className={`sr-toggle-btn${sortBy === 'orders' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('orders')}>By Orders</button>
          </div>
          <button className="sr-expand-btn" onClick={fetchData} disabled={loading} style={{ padding: '6px 14px', fontSize: '0.78rem', opacity: loading ? 0.6 : 1 }}>
            <Icon name="refresh" size={13} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Tab nav ────────────────────────────────────────── */}
      <div className="cr-tab-nav">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`cr-tab-btn${tab === t.key ? ' cr-tab-btn--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────── */}
      <div className="cr-content">

        {/* ── 1. Overview ───────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="cr-overview">
            <div className="cr-ov-grid">
              {[
                { label: 'Total Customers',   value: ov.totalCustomers   || 0, icon: 'customers', accent: 'var(--color-accent-primary)', soft: 'var(--color-accent-soft)' },
                { label: 'New Today',         value: ov.newToday         || 0, icon: 'plus',      accent: 'var(--color-success)',        soft: 'var(--color-success-soft)' },
                { label: 'New This Month',    value: ov.newThisMonth     || 0, icon: 'plus',      accent: '#06b6d4',                     soft: '#ecfeff' },
                { label: 'New This Year',     value: ov.newThisYear      || 0, icon: 'plus',      accent: '#8b5cf6',                     soft: '#ede9fe' },
                { label: 'Active',            value: ov.activeCustomers  || 0, icon: 'customers', accent: 'var(--color-success)',        soft: 'var(--color-success-soft)' },
                { label: 'Inactive',          value: ov.inactiveCustomers|| 0, icon: 'customers', accent: 'var(--color-warning)',        soft: 'var(--color-warning-soft)' },
                { label: 'Repeat Customers',  value: ov.repeatCustomers  || 0, icon: 'refresh',   accent: '#f59e0b',                     soft: '#fffbeb' },
                { label: 'One-time Buyers',   value: ov.oneTimeCustomers || 0, icon: 'billing',   accent: '#ef4444',                     soft: '#fef2f2' },
              ].map(s => (
                <div key={s.label} className="cr-ov-card">
                  <div className="cr-ov-card__icon" style={{ background: s.soft, color: s.accent }}>
                    <Icon name={s.icon} size={20} />
                  </div>
                  <div className="cr-ov-card__body">
                    <div className="cr-ov-card__val">{s.value}</div>
                    <div className="cr-ov-card__lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Repeat vs One-time visual */}
            <div className="cr-ov-split-card">
              <h4 className="cr-section-title">Repeat vs One-time Breakdown</h4>
              <div className="cr-ov-split">
                {[
                  { label: 'Repeat', val: ov.repeatCustomers || 0, color: '#10b981' },
                  { label: 'One-time', val: ov.oneTimeCustomers || 0, color: '#f59e0b' },
                  { label: 'Inactive', val: ov.inactiveCustomers || 0, color: '#ef4444' },
                ].map(seg => {
                  const pct = ov.totalCustomers > 0
                    ? ((seg.val / ov.totalCustomers) * 100).toFixed(1)
                    : 0;
                  return (
                    <div key={seg.label} className="cr-ov-seg">
                      <div className="cr-ov-seg__header">
                        <span className="cr-ov-seg__dot" style={{ background: seg.color }}></span>
                        <span className="cr-ov-seg__label">{seg.label}</span>
                        <span className="cr-ov-seg__val">{seg.val} <small>({pct}%)</small></span>
                      </div>
                      <div className="cr-ov-seg__bar-wrap">
                        <div className="cr-ov-seg__bar" style={{ width: `${pct}%`, background: seg.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Top Customers ──────────────────────────────────────────── */}
        {tab === 'top' && (
          <div className="cr-top">
            <div className="cr-top-summary">
              <div className="sr-mini-card">
                <Icon name="customers" size={18} style={{ color: 'var(--color-accent-primary)' }} />
                <div><div className="sr-mini-card__val">{top.length}</div><div className="sr-mini-card__lbl">Shown</div></div>
              </div>
              <div className="sr-mini-card">
                <Icon name="billing" size={18} style={{ color: '#10b981' }} />
                <div><div className="sr-mini-card__val">{fmt(top[0]?.totalSpent)}</div><div className="sr-mini-card__lbl">Top Spent</div></div>
              </div>
              <div className="sr-mini-card">
                <Icon name="reports" size={18} style={{ color: '#f59e0b' }} />
                <div><div className="sr-mini-card__val">{top[0]?.totalOrders || 0}</div><div className="sr-mini-card__lbl">Top Orders</div></div>
              </div>
            </div>

            <div className="sr-perf-list">
              {top.length === 0 ? (
                <div className="sr-empty"><Icon name="customers" size={28}/><p>No customer data yet</p></div>
              ) : top.map((c, i) => {
                const pct = ((parseFloat(c.totalSpent||0) / maxSpent) * 100).toFixed(1);
                const col = RANK_COLORS[i] || 'var(--color-accent-primary)';
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
                return (
                  <div
                    key={i}
                    className="sr-perf-item cr-perf-item--clickable"
                    onClick={() => setDrill(c.customer_id)}
                  >
                    <div className="sr-perf-rank" style={{ color: col, background: 'var(--color-bg-overlay)', fontSize: i < 3 ? '1.1rem' : '0.85rem' }}>
                      {medal}
                    </div>
                    <div className="sr-perf-info">
                      <div className="sr-perf-name">
                        {c.name}
                        {c.phone && <span className="cr-perf-phone"> · {c.phone}</span>}
                      </div>
                      <div className="sr-perf-bar-wrap">
                        <div className="sr-perf-bar" style={{ width: `${pct}%`, background: col }} />
                      </div>
                    </div>
                    <div className="sr-perf-meta">
                      <span className="sr-perf-rev">{fmt(c.totalSpent)}</span>
                      <span className="sr-perf-qty">{c.totalOrders} orders · {ago(c.lastPurchaseDate)}</span>
                    </div>
                    <div className="cr-perf-arrow"><Icon name="chevronRight" size={14} /></div>
                  </div>
                );
              })}
            </div>

            <div className="sr-expand-row">
              {limit > 10 && (
                <button className="sr-expand-btn sr-expand-btn--secondary" onClick={() => setLimit(10)}>Show Less</button>
              )}
              {top.length >= limit && (
                <button className="sr-expand-btn" onClick={() => setLimit(p => p + 10)}>
                  <Icon name="plus" size={14} /> Show More
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 3. Behavior ───────────────────────────────────────────────── */}
        {tab === 'behavior' && (
          <div className="cr-behavior">
            <div className="cr-beh-cards">
              {[
                { label: 'Avg Purchase Frequency', value: `${fmtN(beh.avgFrequency)} orders/customer`, icon: 'refresh', color: '#6366f1' },
                { label: 'Avg Order Value',        value: fmt(beh.avgOrderValue),                     icon: 'billing', color: '#10b981' },
                { label: 'Top Customer Spent',     value: fmt(top[0]?.totalSpent),                    icon: 'customers', color: '#f59e0b' },
                { label: 'Top Customer Orders',    value: `${top[0]?.totalOrders || 0} orders`,       icon: 'reports', color: '#06b6d4' },
              ].map(s => (
                <div key={s.label} className="cr-beh-card">
                  <div className="cr-beh-card__icon" style={{ color: s.color }}>
                    <Icon name={s.icon} size={22} />
                  </div>
                  <div className="cr-beh-card__val">{s.value}</div>
                  <div className="cr-beh-card__lbl">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="cr-beh-chart-card">
              <h4 className="cr-section-title">Top 10 Customers — Order Value Comparison</h4>
              {top.length === 0 ? (
                <div className="sr-empty"><Icon name="reports" size={24}/><p>No data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={top.slice(0,10).map(c => ({ name: (c.name||'').split(' ')[0], spent: parseFloat(c.totalSpent||0), orders: parseInt(c.totalOrders||0) }))} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="spent" name="Revenue" fill="var(--color-accent-primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ── 4. Inactive / Lost ────────────────────────────────────────── */}
        {tab === 'inactive' && (
          <div className="cr-inactive">
            <div className="cr-inactive-summary">
              {[
                { key: '30', label: '30–60 Days', count: (inc['30']||[]).length, color: '#f59e0b' },
                { key: '60', label: '60–90 Days', count: (inc['60']||[]).length, color: '#f97316' },
                { key: '90', label: '90+ Days',   count: (inc['90']||[]).length, color: '#ef4444' },
              ].map(b => (
                <button
                  key={b.key}
                  className={`cr-inactive-bucket${inactive === b.key ? ' cr-inactive-bucket--active' : ''}`}
                  style={{ '--bucket-color': b.color }}
                  onClick={() => setInactive(b.key)}
                >
                  <div className="cr-inactive-bucket__count" style={{ color: b.color }}>{b.count}</div>
                  <div className="cr-inactive-bucket__label">{b.label} inactive</div>
                </button>
              ))}
            </div>

            <div className="cr-inactive-hint">
              <Icon name="refresh" size={14} />
              <span>Customers who haven't purchased in {inactive === '30' ? '30–60' : inactive === '60' ? '60–90' : '90+'} days. Consider re-engagement campaigns.</span>
            </div>

            {inactiveBucket.length === 0 ? (
              <div className="sr-empty" style={{ marginTop: '2rem' }}>
                <Icon name="customers" size={28} />
                <p>No inactive customers in this range 🎉</p>
              </div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'right' }}>Last Purchase</th>
                      <th style={{ textAlign: 'right' }}>Days Silent</th>
                      <th style={{ textAlign: 'right' }}>Total Spent</th>
                      <th style={{ textAlign: 'right' }}>Orders</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveBucket.map((c, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setDrill(c.customer_id)}>
                        <td><div className="report-customer-name">{c.name}</div></td>
                        <td><span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>{c.phone || '—'}</span></td>
                        <td style={{ textAlign: 'right' }}><span style={{ fontSize: '0.83rem' }}>{fmtDate(c.lastPurchaseDate)}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`cr-days-badge cr-days-badge--${inactive}`}>
                            {c.daysSince || c.daysSinceOrder || '?'}d
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(c.totalSpent)}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{c.totalOrders}</span></td>
                        <td style={{ textAlign: 'right' }}><Icon name="chevronRight" size={14} style={{ color: 'var(--color-text-muted)' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 5. CLV Segments ───────────────────────────────────────────── */}
        {tab === 'clv' && (
          <div className="cr-clv">
            <div className="cr-clv-seg-nav">
              {[
                { key: 'high',   label: 'High Value',   count: clv.high?.length   || 0, color: '#10b981' },
                { key: 'medium', label: 'Medium Value', count: clv.medium?.length || 0, color: '#f59e0b' },
                { key: 'low',    label: 'Low Value',    count: clv.low?.length    || 0, color: '#94a3b8' },
              ].map(s => (
                <button
                  key={s.key}
                  className={`cr-clv-seg-btn${clvSeg === s.key ? ' cr-clv-seg-btn--active' : ''}`}
                  style={{ '--seg-color': s.color }}
                  onClick={() => setClvSeg(s.key)}
                >
                  <span className="cr-clv-seg-dot" style={{ background: s.color }}></span>
                  <span className="cr-clv-seg-label">{s.label}</span>
                  <span className="cr-clv-seg-count">{s.count}</span>
                </button>
              ))}
            </div>

            <div className="cr-clv-desc">
              {clvSeg === 'high'   && <p>🏆 <strong>High-value customers</strong> — top 34% by revenue. Protect & reward these relationships.</p>}
              {clvSeg === 'medium' && <p>📈 <strong>Medium-value customers</strong> — middle 33%. Nurture with targeted offers to move them up.</p>}
              {clvSeg === 'low'    && <p>💡 <strong>Low-value customers</strong> — bottom 33%. Focus on first repeat purchase to increase retention.</p>}
            </div>

            {(clv[clvSeg] || []).length === 0 ? (
              <div className="sr-empty"><Icon name="customers" size={28}/><p>No customers in this segment</p></div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th style={{ textAlign: 'right' }}>Total Spent</th>
                      <th style={{ textAlign: 'right' }}>Orders</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(clv[clvSeg] || []).map((c, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setDrill(c.customer_id)}>
                        <td><span style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>#{i+1}</span></td>
                        <td><div className="report-customer-name">{c.name}</div></td>
                        <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(c.totalSpent)}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{c.totalOrders}</span></td>
                        <td style={{ textAlign: 'right' }}><Icon name="chevronRight" size={14} style={{ color: 'var(--color-text-muted)' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 6. Activity Trend ─────────────────────────────────────────── */}
        {tab === 'activity' && (
          <div className="cr-activity">
            <h4 className="cr-section-title">Monthly Customer &amp; Order Activity (Last 12 Months)</h4>
            {act.length === 0 ? (
              <div className="sr-empty"><Icon name="reports" size={28}/><p>No activity data yet</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={act.map(m => ({ ...m, month: fmtMonth(m.month), revenue: parseFloat(m.revenue||0) }))} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Line yAxisId="left"  type="monotone" dataKey="newCustomers" name="New Customers" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="orders"       name="Orders"        stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue"      name="Revenue"       stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div className="cr-activity-table">
              <h4 className="cr-section-title" style={{ marginTop: '2rem' }}>Month-by-Month Breakdown</h4>
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'right' }}>New Customers</th>
                      <th style={{ textAlign: 'right' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {act.map((m, i) => (
                      <tr key={i}>
                        <td><strong>{fmtMonth(m.month)}</strong></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{m.newCustomers}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{m.orders}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(m.revenue)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Drill-down modal ──────────────────────────────── */}
      {drill && <DrilldownModal customerId={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}