// ============================================================
//  Dashboard.jsx — Main Dashboard Module
//  StockSense Pro
//
//  Sections (each is its own component — easy to add/remove):
//  1. Header + Date Filter
//  2. Quick Actions
//  3. Stat Cards (Sales Overview)
//  4. Today's Overview
//  5. Revenue Bar Chart + Top Products
//  6. AI Stock Prediction
//  7. Low Stock Alerts + Recent Transactions
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { getDashboard, getLowStockProducts } from '../../services/api';
import {QUICK_ACTIONS} from './dashboardData';
import './Dashboard.css';

// ── Helpers ─────────────────────────────────────────────────
const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');
const pct = (n) => (n > 0 ? '+' : '') + n + '%';

// Calculate % change vs previous bar for chart
function getChange(data, index) {
  if (index === 0) return null;
  const prev = data[index - 1].revenue;
  const curr = data[index].revenue;
  const change = Math.round(((curr - prev) / prev) * 100);
  return change;
}

// ══════════════════════════════════════════════════════════
//  1. STAT CARDS — Sales Overview
// ══════════════════════════════════════════════════════════
function StatCards({ period }) {
  const d = STATS_DATA[period];

  // Each card: label, value, icon, trend, accent color
  // To add a new card → add an object to this array
  const cards = [
    {
      label:   'Total Revenue',
      value:   fmt(d.revenue),
      icon:    'reports',
      trend:   +8.4,
      accent:  'var(--color-accent-primary)',
      accentSoft: 'var(--color-accent-soft)',
    },
    {
      label:   'Total Cost',
      value:   fmt(d.cost),
      icon:    'payment',
      trend:   +3.1,
      accent:  'var(--color-warning)',
      accentSoft: 'var(--color-warning-soft)',
    },
    {
      label:   'Gross Profit',
      value:   fmt(d.profit),
      icon:    'billing',
      trend:   +14.2,
      accent:  'var(--color-success)',
      accentSoft: 'var(--color-success-soft)',
    },
    {
      label:   'Gross Margin',
      value:   d.grossMargin + '%',
      icon:    'ai',
      trend:   +1.8,
      accent:  'var(--color-violet)',
      accentSoft: 'var(--color-violet-soft)',
    },
    {
      label:   'Total Orders',
      value:   d.orders,
      icon:    'inventory',
      trend:   +6.7,
      accent:  'var(--color-cyan)',
      accentSoft: 'var(--color-cyan-soft)',
    },
    {
      label:   'Avg. Order Value',
      value:   fmt(d.avgOrderValue),
      icon:    'billing',
      trend:   -2.3,
      accent:  'var(--color-accent-primary)',
      accentSoft: 'var(--color-accent-soft)',
    },
    {
      label:   'Total Customers',
      value:   d.customers,
      icon:    'customers',
      trend:   +11.5,
      accent:  'var(--color-success)',
      accentSoft: 'var(--color-success-soft)',
    },
    {
      label:   'Returns / Refunds',
      value:   d.returns,
      icon:    'alert',
      trend:   -18.0,
      accent:  'var(--color-danger)',
      accentSoft: 'var(--color-danger-soft)',
    },
  ];

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" />
          Sales Overview
        </span>
      </div>
      <div className="stats-grid">
        {cards.map((card) => (
          <div
            key={card.label}
            className="stat-card"
            style={{ '--stat-accent': card.accent, '--stat-accent-soft': card.accentSoft }}
          >
            <div className="stat-card__header">
              <span className="stat-card__label">{card.label}</span>
              <div className="stat-card__icon">
                <Icon name={card.icon} size={16} />
              </div>
            </div>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__footer">
              <span className={`stat-card__trend stat-card__trend--${card.trend >= 0 ? 'up' : 'down'}`}>
                <Icon name={card.trend >= 0 ? 'chevronDown' : 'chevronDown'} size={12} />
                {Math.abs(card.trend)}%
              </span>
              <span className="stat-card__trend-label">vs last period</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  2. TODAY'S OVERVIEW
// ══════════════════════════════════════════════════════════
function TodayOverview() {
  const d = STATS_DATA.today;

  // To add/remove cards → edit this array
  const cards = [
    { label: "Today's Revenue",    value: fmt(d.revenue),       sub: 'Gross sales' },
    { label: "Today's Cost",       value: fmt(d.cost),          sub: 'Procurement' },
    { label: "Today's Profit",     value: fmt(d.profit),        sub: `Margin ${d.grossMargin}%` },
    { label: 'Orders Today',       value: d.orders,             sub: 'Transactions' },
    { label: 'Customers Today',    value: d.customers,          sub: `Avg ${fmt(d.avgOrderValue)} / order` },
  ];

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" style={{ background: 'var(--color-success)' }} />
          Today's Overview
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Live · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="today-grid">
        {cards.map((card) => (
          <div key={card.label} className="today-card">
            <span className="today-card__label">{card.label}</span>
            <span className="today-card__value">{card.value}</span>
            <span className="today-card__sub">{card.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  3. REVENUE CHART + TOP PRODUCTS
// ══════════════════════════════════════════════════════════
function RevenueChart() {
  const [view, setView] = useState('weekly');
  const data = CHART_DATA[view];
  const maxVal = Math.max(...data.map(d => d.revenue));

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" style={{ background: 'var(--color-violet)' }} />
          Revenue Analytics
        </span>
      </div>
      <div className="dashboard-two-col">

        {/* Bar chart */}
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-header__info">
              <h3>Revenue vs Cost vs Profit</h3>
              <p>{view === 'weekly' ? 'Last 7 days' : 'Last 4 weeks'}</p>
            </div>
            <div className="chart-toggle">
              <button
                className={`chart-toggle__btn ${view === 'weekly' ? 'chart-toggle__btn--active' : ''}`}
                onClick={() => setView('weekly')}
              >Weekly</button>
              <button
                className={`chart-toggle__btn ${view === 'monthly' ? 'chart-toggle__btn--active' : ''}`}
                onClick={() => setView('monthly')}
              >Monthly</button>
            </div>
          </div>

          <div className="bar-chart">
            {data.map((item, i) => {
              const change = getChange(data, i);
              return (
                <div key={item.label} className="bar-chart__bar-group">
                  <div className="bar-chart__bars">
                    <div className="bar-chart__bar bar-chart__bar--revenue"
                      style={{ height: `${(item.revenue / maxVal) * 100}%` }}
                      title={`Revenue: ${fmt(item.revenue)}`}
                    />
                    <div className="bar-chart__bar bar-chart__bar--cost"
                      style={{ height: `${(item.cost / maxVal) * 100}%` }}
                      title={`Cost: ${fmt(item.cost)}`}
                    />
                    <div className="bar-chart__bar bar-chart__bar--profit"
                      style={{ height: `${(item.profit / maxVal) * 100}%` }}
                      title={`Profit: ${fmt(item.profit)}`}
                    />
                  </div>
                  <span className="bar-chart__label">{item.label}</span>
                  {change !== null && (
                    <span className={`bar-chart__percentage bar-chart__percentage--${change >= 0 ? 'up' : 'down'}`}>
                      {pct(change)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="chart-legend">
            <div className="chart-legend__item"><span className="chart-legend__dot chart-legend__dot--revenue" />Revenue</div>
            <div className="chart-legend__item"><span className="chart-legend__dot chart-legend__dot--cost" />Cost</div>
            <div className="chart-legend__item"><span className="chart-legend__dot chart-legend__dot--profit" />Profit</div>
          </div>
        </div>

        {/* Top products */}
        <div className="top-products">
          <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-3)' }}>
            <span className="dashboard-section__title">
              <span className="dashboard-section__title-dot" style={{ background: 'var(--color-cyan)' }} />
              Top Products
            </span>
          </div>
          {TOP_PRODUCTS.map((p, i) => (
            <div key={p.name} className="top-products__item">
              <span className="top-products__rank">#{i + 1}</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div className="top-products__name">{p.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.sales} sold</div>
              </div>
              <span className="top-products__revenue">{fmt(p.revenue)}</span>
              <span className={`top-products__trend top-products__trend--${p.trend >= 0 ? 'up' : 'down'}`}>
                {pct(p.trend)}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  4. AI STOCK PREDICTION
// ══════════════════════════════════════════════════════════
function AIStockPrediction() {
  const buy    = AI_PREDICTIONS.filter(p => p.restock);
  const reduce = AI_PREDICTIONS.filter(p => !p.restock);

  return (
    <div className="dashboard-section">
      <div className="dashboard-section__header">
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" style={{ background: 'var(--color-violet)' }} />
          AI Stock Prediction
        </span>
        <span className="ai-badge">
          <Icon name="ai" size={11} />
          Based on weekly data
        </span>
      </div>

      <div className="ai-section">
        <div className="ai-section__header">
          <div className="ai-section__title">
            <div>
              <h3>Demand Forecast</h3>
              <p>Predicted demand changes for next 7 days based on past sales patterns</p>
            </div>
          </div>
        </div>

        <div className="ai-grid">
          {/* Buy More column */}
          <div>
            <div className="ai-col__label ai-col__label--buy">
              <Icon name="chevronDown" size={12} style={{ transform: 'rotate(180deg)' }} />
              Restock These — Demand Rising
            </div>
            {buy.map((item) => (
              <div key={item.name} className="ai-item ai-item--buy">
                <div className="ai-item__info">
                  <div className="ai-item__name">{item.name}</div>
                  <div className="ai-item__reason">{item.reason}</div>
                </div>
                <div className="ai-item__stats">
                  <span className="ai-item__change">+{item.demandChange}%</span>
                  <span className="ai-item__confidence">{item.confidence}% confident</span>
                </div>
              </div>
            ))}
          </div>

          {/* Reduce Stock column */}
          <div>
            <div className="ai-col__label ai-col__label--reduce">
              <Icon name="chevronDown" size={12} />
              Hold / Reduce — Demand Falling
            </div>
            {reduce.map((item) => (
              <div key={item.name} className="ai-item ai-item--reduce">
                <div className="ai-item__info">
                  <div className="ai-item__name">{item.name}</div>
                  <div className="ai-item__reason">{item.reason}</div>
                </div>
                <div className="ai-item__stats">
                  <span className="ai-item__change">{item.demandChange}%</span>
                  <span className="ai-item__confidence">{item.confidence}% confident</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  5. LOW STOCK ALERTS
// ══════════════════════════════════════════════════════════
function LowStockAlerts() {
  return (
    <div className="low-stock">
      <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" style={{ background: 'var(--color-danger)' }} />
          Low Stock Alerts
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>
          {LOW_STOCK.length} items critical
        </span>
      </div>
      {LOW_STOCK.map((item) => (
        <div key={item.sku} className="low-stock__item">
          <div style={{ flex: 1 }}>
            <div className="low-stock__name">{item.name}</div>
            <div className="low-stock__sku">{item.sku} · {item.category}</div>
          </div>
          <div className="low-stock__bar-wrap">
            <div className="low-stock__bar-bg">
              <div
                className="low-stock__bar-fill"
                style={{ width: `${Math.min((item.stock / item.minStock) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className="low-stock__count">{item.stock} left</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  6. RECENT TRANSACTIONS
// ══════════════════════════════════════════════════════════
function RecentTransactions() {
  return (
    <div className="recent-tx">
      <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="dashboard-section__title">
          <span className="dashboard-section__title-dot" style={{ background: 'var(--color-accent-primary)' }} />
          Recent Transactions
        </span>
      </div>
      {RECENT_TRANSACTIONS.map((tx) => (
        <div key={tx.id} className="recent-tx__item">
          <div style={{ flex: 1 }}>
            <div className="recent-tx__customer">{tx.customer}</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span className="recent-tx__id">{tx.id}</span>
              <span className="recent-tx__time">· {tx.time}</span>
            </div>
          </div>
          <div className="recent-tx__right">
            <div className="recent-tx__amount">{fmt(tx.amount)}</div>
            <span className={`recent-tx__payment recent-tx__payment--${tx.payment.toLowerCase()}`}>
              {tx.payment}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function Dashboard({ user }) {
  const [period,   setPeriod]   = useState('week');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboard();
      if (res.success) setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', color: 'var(--color-danger)' }}>
      ❌ {error}
    </div>
  );

  const stats = data?.stats || {};
  const recentTransactions = data?.recentTransactions || [];
  const topProducts = data?.charts?.topProducts || [];
  const last7Days = data?.charts?.last7Days || [];

  return (
    <div className="dashboard">

      {/* ── Header ───────────────────────────────────── */}
      <div className="dashboard-header">
        <div className="dashboard-header__left">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.name}! Here's what's happening.</p>
        </div>
        <div className="date-filter">
          {['today', 'week', 'month'].map((p) => (
            <button
              key={p}
              className={`date-filter__btn ${period === p ? 'date-filter__btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────── */}
      <div className="quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            className="quick-action-btn"
            onClick={() => navigate(action.path)}
          >
            <Icon name={action.icon} size={15} />
            {action.label}
          </button>
        ))}
      </div>

      {/* ── Stat Cards ────────────────────────────────── */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <span className="dashboard-section__title">
            <span className="dashboard-section__title-dot" />
            Sales Overview
          </span>
        </div>
        <div className="stats-grid">
          {[
            { label: "Today's Sales",     value: fmt(stats.todaySales || 0),       icon: 'reports',    accent: 'var(--color-accent-primary)', accentSoft: 'var(--color-accent-soft)'   },
            { label: 'Transactions',      value: stats.todayTransactions || 0,      icon: 'billing',    accent: 'var(--color-warning)',        accentSoft: 'var(--color-warning-soft)'  },
            { label: 'Month Sales',       value: fmt(stats.monthSales || 0),        icon: 'payment',    accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
            { label: 'Sales Growth',      value: (stats.salesGrowth || 0) + '%',    icon: 'ai',         accent: 'var(--color-violet)',         accentSoft: 'var(--color-violet-soft)'   },
            { label: 'Total Products',    value: stats.totalProducts || 0,          icon: 'inventory',  accent: 'var(--color-cyan)',           accentSoft: 'var(--color-cyan-soft)'     },
            { label: 'Low Stock Items',   value: stats.lowStockCount || 0,          icon: 'alert',      accent: 'var(--color-danger)',         accentSoft: 'var(--color-danger-soft)'   },
            { label: 'Total Customers',   value: stats.totalCustomers || 0,         icon: 'customers',  accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
            { label: 'Pending Approvals', value: stats.pendingApprovals || 0,       icon: 'users',      accent: 'var(--color-warning)',        accentSoft: 'var(--color-warning-soft)'  },
          ].map((card) => (
            <div
              key={card.label}
              className="stat-card"
              style={{ '--stat-accent': card.accent, '--stat-accent-soft': card.accentSoft }}
            >
              <div className="stat-card__header">
                <span className="stat-card__label">{card.label}</span>
                <div className="stat-card__icon">
                  <Icon name={card.icon} size={16} />
                </div>
              </div>
              <div className="stat-card__value">{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue Chart (last 7 days) ───────────────── */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <span className="dashboard-section__title">
            <span className="dashboard-section__title-dot" style={{ background: 'var(--color-violet)' }} />
            Last 7 Days Revenue
          </span>
        </div>
        <div className="dashboard-two-col">
          <div className="chart-container">
            <div className="bar-chart">
              {last7Days.map((item) => {
                const maxVal = Math.max(...last7Days.map(d => d.sales || 0), 1);
                return (
                  <div key={item.date} className="bar-chart__bar-group">
                    <div className="bar-chart__bars">
                      <div
                        className="bar-chart__bar bar-chart__bar--revenue"
                        style={{ height: `${((item.sales || 0) / maxVal) * 100}%` }}
                        title={`Sales: ${fmt(item.sales || 0)}`}
                      />
                    </div>
                    <span className="bar-chart__label">
                      {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="top-products">
            <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-3)' }}>
              <span className="dashboard-section__title">
                <span className="dashboard-section__title-dot" style={{ background: 'var(--color-cyan)' }} />
                Top Products This Month
              </span>
            </div>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No sales data yet</p>
            ) : topProducts.map((p, i) => (
              <div key={p.productName} className="top-products__item">
                <span className="top-products__rank">#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div className="top-products__name">{p.productName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.totalQty} sold</div>
                </div>
                <span className="top-products__revenue">{fmt(p.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Low Stock + Recent Transactions ───────────── */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <span className="dashboard-section__title">
            <span className="dashboard-section__title-dot" style={{ background: 'var(--color-danger)' }} />
            Alerts & Activity
          </span>
        </div>
        <div className="dashboard-two-col--equal dashboard-two-col">

          {/* Low Stock */}
          <div className="low-stock">
            <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="dashboard-section__title">
                <span className="dashboard-section__title-dot" style={{ background: 'var(--color-danger)' }} />
                Low Stock Alerts
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                {stats.lowStockCount || 0} items
              </span>
            </div>
            {stats.lowStockCount === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>✅ All stocks are healthy</p>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                {stats.lowStockCount} products need restocking
              </p>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="recent-tx">
            <div className="dashboard-section__header" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="dashboard-section__title">
                <span className="dashboard-section__title-dot" style={{ background: 'var(--color-accent-primary)' }} />
                Recent Transactions
              </span>
            </div>
            {recentTransactions.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No transactions yet</p>
            ) : recentTransactions.map((tx) => (
              <div key={tx.transaction_id} className="recent-tx__item">
                <div style={{ flex: 1 }}>
                  <div className="recent-tx__customer">{tx.customerName || 'Walk-in Customer'}</div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <span className="recent-tx__id">{tx.invoiceNumber}</span>
                    <span className="recent-tx__time">
                      · {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="recent-tx__right">
                  <div className="recent-tx__amount">{fmt(tx.totalAmount)}</div>
                  <span className={`recent-tx__payment recent-tx__payment--${tx.paymentMethod?.toLowerCase()}`}>
                    {tx.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}