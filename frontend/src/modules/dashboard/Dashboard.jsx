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
import {QUICK_ACTIONS} from './DashboardData';
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
//  STAT CARD COMPONENT
// ══════════════════════════════════════════════════════════
function StatCard({ label, value, icon, trend, accent, accentSoft, trendLabel }) {
  const isUp = trend >= 0;
  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': accent, '--stat-accent-soft': accentSoft }}
    >
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        <div className="stat-card__icon">
          <Icon name={icon} size={16} />
        </div>
      </div>
      <div className="stat-card__value">{value}</div>
      {trend !== undefined && (
        <div className="stat-card__footer">
          <span className={`stat-card__trend stat-card__trend--${isUp ? 'up' : 'down'}`}>
            <Icon name={isUp ? 'chevronUp' : 'chevronDown'} size={12} />
            {Math.abs(trend)}%
          </span>
          <span className="stat-card__trend-label">{trendLabel || 'vs last period'}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function Dashboard({ user }) {
  const [period,   setPeriod]   = useState('week');
  const [data,     setData]          = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading,  setLoading]       = useState(true);
  const [error,    setError]          = useState('');
  const [chartView, setChartView] = useState('weekly'); // 'weekly' or 'monthly'
  const [drilldown, setDrilldown] = useState(null);
  const [maximized, setMaximized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, stockRes] = await Promise.all([
        getDashboard({ period }),
        getLowStockProducts()
      ]);
      if (dashRes.success) setData(dashRes.data);
      if (stockRes.success) setLowStockItems(stockRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBarClick = async (item) => {
    if (chartView !== 'monthly') return;
    try {
      const res = await getDashboard({ drillDownMonth: item.date });
      if (res.success) {
        setDrilldown({
          label: new Date(item.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          data: res.data.charts.weekDrilldown
        });
      }
    } catch (err) {
      console.error("Drilldown failed:", err);
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
  const chartData = chartView === 'weekly' ? (data?.charts?.last7Days || []) : (data?.charts?.last12Months || []);

  // ── Stat Cards Configuration ──────────────────────────────────
  const isSupplier = user?.userType === 'supplier';
  
  const statCards = isSupplier ? [
    { label: 'Total Revenue',          value: fmt(stats.revenue || 0),          icon: 'reports',    accent: 'var(--color-accent-primary)', accentSoft: 'var(--color-accent-soft)', trend: stats.salesGrowth },
    { label: 'Total Sales (Completed Orders)', value: stats.transactions || 0,   icon: 'billing',    accent: 'var(--color-warning)',        accentSoft: 'var(--color-warning-soft)'  },
    { label: 'Net Profit',             value: fmt(stats.netProfit || 0),        icon: 'payment',    accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
    { label: 'Sales Growth',           value: (stats.salesGrowth || 0) + '%',    icon: 'ai',         accent: 'var(--color-violet)',         accentSoft: 'var(--color-violet-soft)'   },
    { label: 'TBD (Setting up...)',    value: '--',                             icon: 'inventory',  accent: 'var(--color-cyan)',           accentSoft: 'var(--color-cyan-soft)'     },
    { label: 'TBD (Setting up...)',    value: '--',                             icon: 'reports',    accent: 'var(--color-indigo)',         accentSoft: 'var(--color-indigo-soft)'   },
    { label: 'Total Products',         value: stats.totalProducts || 0,          icon: 'inventory',  accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
    { label: 'Low Stock Items',        value: stats.lowStockCount || 0,          icon: 'alert',      accent: 'var(--color-danger)',         accentSoft: 'var(--color-danger-soft)'   },
  ] : [
    { label: 'Total Revenue',          value: fmt(stats.revenue || 0),          icon: 'reports',    accent: 'var(--color-accent-primary)', accentSoft: 'var(--color-accent-soft)', trend: stats.salesGrowth },
    { label: 'Total Sales',            value: stats.transactions || 0,          icon: 'billing',    accent: 'var(--color-warning)',        accentSoft: 'var(--color-warning-soft)'  },
    { label: 'Net Profit',             value: fmt(stats.netProfit || 0),        icon: 'payment',    accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
    { label: 'Sales Growth',           value: (stats.salesGrowth || 0) + '%',    icon: 'ai',         accent: 'var(--color-violet)',         accentSoft: 'var(--color-violet-soft)'   },
    { label: 'Items Purchased',         value: stats.itemsPurchased || 0,        icon: 'inventory',  accent: 'var(--color-cyan)',           accentSoft: 'var(--color-cyan-soft)'     },
    { label: 'Procurement Spend',      value: fmt(stats.procurementSpend || 0),  icon: 'reports',    accent: 'var(--color-indigo)',         accentSoft: 'var(--color-indigo-soft)'   },
    { label: 'Total Products',         value: stats.totalProducts || 0,          icon: 'inventory',  accent: 'var(--color-success)',        accentSoft: 'var(--color-success-soft)'  },
    { label: 'Low Stock Items',        value: stats.lowStockCount || 0,          icon: 'alert',      accent: 'var(--color-danger)',         accentSoft: 'var(--color-danger-soft)'   },
  ];

  return (
    <div className="dashboard">

      {/* ── Header ───────────────────────────────────── */}
      <div className="dashboard-header">
        <div className="dashboard-header__left">
          <h1>{isSupplier ? 'Supplier Dashboard' : 'Shop Dashboard'}</h1>
          <p>Welcome back, {user?.name}! Here's what's happening.</p>
        </div>
        <div className="date-filter">
          {['today', 'week', 'month', 'overall'].map((p) => (
            <button
              key={p}
              className={`date-filter__btn ${period === p ? 'date-filter__btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Overall'}
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
            {isSupplier ? 'Supplier Analytics' : 'Sales Overview'}
          </span>
        </div>
        <div className="stats-grid">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* ── Revenue Chart Panel ───────────────────────── */}
      <div className="dashboard-two-col">
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-header__left">
              <span className="dashboard-section__title">
                <span className="dashboard-section__title-dot" style={{ background: 'var(--color-violet)' }} />
                {chartView === 'weekly' ? 'Last 7 Days Revenue' : 'Last 12 Months Revenue'}
              </span>
            </div>
            <div className="chart-toggle">
              <button
                className={`chart-toggle__btn ${chartView === 'weekly' ? 'chart-toggle__btn--active' : ''}`}
                onClick={() => setChartView('weekly')}
              >7 Days</button>
              <button
                className={`chart-toggle__btn ${chartView === 'monthly' ? 'chart-toggle__btn--active' : ''}`}
                onClick={() => setChartView('monthly')}
              >12 Months</button>
            </div>
          </div>

          <div className="bar-chart-wrapper">
            <div className="bar-chart">
              {chartData.map((item) => {
                const maxVal = Math.max(...chartData.map(d => d.sales || 0), 1);
                const barHeight = ((item.sales || 0) / maxVal) * 100;
                const label = chartView === 'weekly'
                  ? new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short' })
                  : new Date(item.date).toLocaleDateString('en-IN', { month: 'short' });

                return (
                  <div
                    key={item.date}
                    className={`bar-chart__bar-group ${chartView === 'monthly' ? 'bar-chart__bar-group--clickable' : ''}`}
                    onClick={() => handleBarClick(item)}
                  >
                    <div className="bar-chart__bars">
                      {item.growth !== 0 && (
                        <div className={`bar-chart__growth-tag bar-chart__growth-tag--${item.growth > 0 ? 'up' : 'down'}`}>
                          <Icon name={item.growth > 0 ? 'zigzagUp' : 'zigzagDown'} size={14} />
                          <span>{Math.abs(item.growth)}%</span>
                        </div>
                      )}
                      <div
                        className="bar-chart__bar bar-chart__bar--revenue"
                        style={{ height: `${barHeight}%` }}
                        title={`${label}: ${fmt(item.sales || 0)}`}
                      />
                    </div>
                    <span className="bar-chart__label">{label}</span>
                  </div>
                );
              })}
            </div>
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
            {lowStockItems.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>✅ All stocks are healthy</p>
            ) : (
              <div className="low-stock__list">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div key={item.product_id} className="low-stock__item">
                    <div style={{ flex: 1 }}>
                      <div className="low-stock__name">{item.name}</div>
                      <div className="low-stock__sku">{item.sku} · {item.categoryName}</div>
                    </div>
                    <div className="low-stock__bar-wrap">
                      <div className="low-stock__bar-bg">
                        <div
                          className="low-stock__bar-fill"
                          style={{ width: `${Math.min((item.stock / (item.minStockLevel || 10)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="low-stock__count">{item.stock} left</span>
                  </div>
                ))}
                {lowStockItems.length > 4 && (
                  <button className="low-stock__view-all" onClick={() => navigate('/inventory')}>
                    View all {lowStockItems.length} items
                  </button>
                )}
              </div>
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

      {/* ── Drilldown Modal ───────────────────────────── */}
      {drilldown && (
        <div className={`drilldown-modal ${maximized ? 'drilldown-modal--maximized' : ''}`}>
          <div className="drilldown-modal__overlay" onClick={() => setDrilldown(null)} />
          <div className="drilldown-modal__content">
            <div className="drilldown-modal__header">
              <div>
                <h2>Weekly Revenue Breakdown</h2>
                <p>{drilldown.label}</p>
              </div>
              <div className="drilldown-modal__actions">
                <button
                  className="drilldown-modal__btn"
                  onClick={() => setMaximized(!maximized)}
                  title={maximized ? "Minimize" : "Maximize"}
                >
                  <Icon name={maximized ? 'minus' : 'plus'} size={18} />
                </button>
                <button className="drilldown-modal__btn drilldown-modal__btn--close" onClick={() => setDrilldown(null)}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>

            <div className="drilldown-modal__chart">
              <div className="bar-chart" style={{ height: maximized ? '400px' : '200px' }}>
                {drilldown.data.map((item) => {
                  const maxVal = Math.max(...drilldown.data.map(d => d.sales || 0), 1);
                  return (
                    <div key={item.week} className="bar-chart__bar-group">
                      <div className="bar-chart__bars">
                        <div
                          className="bar-chart__bar bar-chart__bar--revenue"
                          style={{ height: `${((item.sales || 0) / maxVal) * 100}%` }}
                          title={`${item.week}: ${fmt(item.sales || 0)}`}
                        />
                      </div>
                      <span className="bar-chart__label">{item.week}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}