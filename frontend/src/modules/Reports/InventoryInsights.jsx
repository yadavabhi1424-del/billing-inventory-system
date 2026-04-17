// InventoryInsights.jsx — Low Stock, Out of Stock, Expired, Fast Moving
import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getInventoryReport } from '../../services/api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const TABS = [
  { key: 'low',     label: 'Low Stock',    icon: 'alert'   },
  { key: 'out',     label: 'Out of Stock', icon: 'x'       },
  { key: 'expired', label: 'Expired',      icon: 'trash'   },
  { key: 'fast',    label: 'Fast Moving',  icon: 'zigzagUp'},
];

export default function InventoryInsights() {
  const [activeTab, setActiveTab] = useState('low');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getInventoryReport()
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="report-section"><div className="sr-loader"><div className="app-loading__spinner" /></div></div>
  );

  const { totals = {}, lowStockItems = [], outOfStockItems = [], expiredItems = [], fastMoving = [] } = data || {};

  const stockValue = parseFloat(totals.totalCostValue || 0);
  const retailValue = parseFloat(totals.totalRetailValue || 0);

  const SUMMARY_CARDS = [
    { label: 'Total Products',    value: totals.totalProducts || 0,        bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)', icon: 'box'     },
    { label: 'Stock Value (Cost)',value: fmt(stockValue),                   bg: 'var(--color-cyan-soft)',    color: 'var(--color-cyan)',           icon: 'reports' },
    { label: 'Retail Value',      value: fmt(retailValue),                  bg: 'var(--color-success-soft)', color: 'var(--color-success)',        icon: 'billing' },
    { label: 'Low Stock Items',   value: totals.lowStockCount || 0,         bg: 'var(--color-warning-soft)', color: 'var(--color-warning)',        icon: 'alert'   },
    { label: 'Out of Stock',      value: totals.outOfStockCount || 0,       bg: 'var(--color-danger-soft)',  color: 'var(--color-danger)',         icon: 'x'       },
    { label: 'Expired Items',     value: expiredItems.length,               bg: 'var(--color-violet-soft)',  color: 'var(--color-violet)',         icon: 'trash'   },
  ];

  const currentList = {
    low:     lowStockItems,
    out:     outOfStockItems,
    expired: expiredItems,
    fast:    fastMoving,
  }[activeTab];

  return (
    <div className="sr-inventory">
      {/* KPI cards */}
      <div className="sr-inv-cards">
        {SUMMARY_CARDS.map(c => (
          <div key={c.label} className="report-stat-card">
            <div className="report-stat-card__icon" style={{ background: c.bg, color: c.color }}>
              <Icon name={c.icon} size={20} />
            </div>
            <div className="report-stat-card__content">
              <span className="report-stat-card__label">{c.label}</span>
              <span className="report-stat-card__value" style={{ fontSize: '1.3rem' }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="report-section">
        <div className="sr-inv-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`sr-inv-tab${activeTab === t.key ? ' sr-inv-tab--active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <Icon name={t.icon} size={13} /> {t.label}
              <span className="sr-inv-tab-count">
                {{ low: lowStockItems.length, out: outOfStockItems.length, expired: expiredItems.length, fast: fastMoving.length }[t.key]}
              </span>
            </button>
          ))}
        </div>

        {currentList.length === 0 ? (
          <div className="sr-empty" style={{ padding: '2rem' }}>
            <Icon name="check" size={28} />
            <p>No items in this category</p>
          </div>
        ) : (
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  {activeTab !== 'expired' && <th style={{ textAlign: 'right' }}>Stock</th>}
                  {activeTab === 'low'  && <th style={{ textAlign: 'right' }}>Min Level</th>}
                  {activeTab === 'expired' && <th style={{ textAlign: 'right' }}>Expiry Date</th>}
                  {activeTab === 'expired' && <th style={{ textAlign: 'right' }}>Days Expired</th>}
                  {activeTab === 'fast' && <th style={{ textAlign: 'right' }}>Sold (30d)</th>}
                  {activeTab === 'fast' && <th style={{ textAlign: 'right' }}>Revenue (30d)</th>}
                  <th style={{ textAlign: 'right' }}>Cost Price</th>
                  {(activeTab === 'low' || activeTab === 'out') && <th>Supplier</th>}
                </tr>
              </thead>
              <tbody>
                {currentList.map((item, i) => (
                  <tr key={i}>
                    <td><span className="report-product-name">{item.name}</span></td>
                    <td><span className="report-time">{item.sku}</span></td>
                    {activeTab !== 'expired' && (
                      <td style={{ textAlign: 'right' }}>
                        <span className={`sr-stock-badge ${
                          activeTab === 'out' ? 'sr-stock-badge--out' :
                          activeTab === 'fast' ? 'sr-stock-badge--fast' : 'sr-stock-badge--low'
                        }`}>{item.stock}</span>
                      </td>
                    )}
                    {activeTab === 'low' && (
                      <td style={{ textAlign: 'right' }}>
                        <span className="report-qty">{item.minStockLevel}</span>
                      </td>
                    )}
                    {activeTab === 'expired' && (
                      <>
                        <td style={{ textAlign: 'right' }}>
                          <span className="report-time">{item.expiryDate?.split('T')[0] || '—'}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="sr-stock-badge sr-stock-badge--out">{item.daysExpired}d ago</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'fast' && (
                      <>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{item.soldQty}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(item.revenue)}</span></td>
                      </>
                    )}
                    <td style={{ textAlign: 'right' }}>
                      <span className="report-amount">{fmt(item.costPrice)}</span>
                    </td>
                    {(activeTab === 'low' || activeTab === 'out') && (
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.supplierName || '—'}</span></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
