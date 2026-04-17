// ReturnsAnalysis.jsx — Returns & Loss reporting
import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getReturnsAnalysis } from '../../services/api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReturnsAnalysis({ filters }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [filters]);

  const buildParams = () => {
    if (filters.period === 'custom' && filters.startDate && filters.endDate)
      return { startDate: filters.startDate, endDate: filters.endDate };
    
    if (filters.period === 'today') {
      const today = getLocalDateStr();
      return { startDate: today, endDate: today };
    }
    
    if (filters.period === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      return { startDate: yStr, endDate: yStr };
    }

    if (filters.period === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      return { startDate: getLocalDateStr(w), endDate: getLocalDateStr() };
    }

    if (filters.period === 'month-pick' && filters.month)
      return { month: filters.month, year: filters.year || new Date().getFullYear() };
    
    return { period: filters.period };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getReturnsAnalysis(buildParams());
      if (res.success) setData(res.data);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const summary      = data?.summary      || {};
  const mostReturned = data?.mostReturned || [];
  const stockLoss    = data?.stockLoss    || [];
  const totalDmgLoss = stockLoss.reduce((s, r) => s + parseFloat(r.lostValue || 0), 0);

  const STATS = [
    { label: 'Returns Count',    value: summary.returnCount  || 0,           icon: 'refresh', bg: 'var(--color-warning-soft)',  color: 'var(--color-warning)'  },
    { label: 'Return Amount',    value: fmt(summary.returnAmount || 0),       icon: 'billing', bg: 'var(--color-danger-soft)',   color: 'var(--color-danger)'   },
    { label: 'Return Rate',      value: `${summary.returnRate || 0}%`,        icon: 'reports', bg: 'var(--color-violet-soft)',   color: 'var(--color-violet)'   },
    { label: 'Damage/Loss',      value: fmt(summary.stockLossValue || 0),     icon: 'trash',   bg: 'var(--color-accent-soft)',   color: 'var(--color-accent-primary)' },
  ];

  return (
    <div className="sr-returns">
      {/* KPI cards */}
      <div className="report-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 'var(--space-5)' }}>
        {STATS.map(s => (
          <div key={s.label} className="report-stat-card">
            <div className="report-stat-card__icon" style={{ background: s.bg, color: s.color }}>
              <Icon name={s.icon} size={20} />
            </div>
            <div className="report-stat-card__content">
              <span className="report-stat-card__label">{s.label}</span>
              <span className="report-stat-card__value" style={{ fontSize: '1.3rem' }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="sr-loader"><div className="app-loading__spinner" /></div>
      ) : (
        <div className="report-grid">
          {/* Most returned products */}
          <div className="report-section">
            <h3 className="report-section__title">Most Returned Products</h3>
            {mostReturned.length === 0 ? (
              <div className="sr-empty" style={{ padding: '2rem' }}>
                <Icon name="check" size={24} /><p>No returns recorded</p>
              </div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Returns</th>
                      <th style={{ textAlign: 'right' }}>Returned Qty</th>
                      <th style={{ textAlign: 'right' }}>Revenue Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostReturned.map((p, i) => (
                      <tr key={i}>
                        <td><span className="report-product-name">{p.productName}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{p.returnCount}</span></td>
                        <td style={{ textAlign: 'right' }}><span className="report-qty">{p.returnedQty}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="report-amount" style={{ color: 'var(--color-danger)' }}>
                            {fmt(p.lostRevenue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Damage / loss breakdown */}
          <div className="report-section">
            <h3 className="report-section__title">Stock Damage & Loss</h3>
            {stockLoss.length === 0 ? (
              <div className="sr-empty" style={{ padding: '2rem' }}>
                <Icon name="check" size={24} /><p>No damage records found</p>
              </div>
            ) : (
              <>
                <div className="sr-loss-total">
                  <span className="sr-loss-total__label">Total Loss</span>
                  <span className="sr-loss-total__val">{fmt(totalDmgLoss)}</span>
                </div>
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Records</th>
                        <th style={{ textAlign: 'right' }}>Lost Qty</th>
                        <th style={{ textAlign: 'right' }}>Value Lost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLoss.map((r, i) => (
                        <tr key={i}>
                          <td><span className="sr-stock-badge sr-stock-badge--out">{r.type}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="report-qty">{r.count}</span></td>
                          <td style={{ textAlign: 'right' }}><span className="report-qty">{r.lostQty}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="report-amount" style={{ color: 'var(--color-danger)' }}>
                              {fmt(r.lostValue)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
