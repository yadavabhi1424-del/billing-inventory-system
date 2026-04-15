import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getSupplierReport } from '../../services/api';
import SupplierHistoryModal from './SupplierHistoryModal';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SupplierReport() {
  const [suppliers, setSuppliers] = useState([]);
  const [period,    setPeriod]    = useState('month');
  const [loading,   setLoading]   = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    setLoading(true);
    getSupplierReport({ period })
      .then(res => { if (res.success) setSuppliers(res.data); })
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false));
  }, [period]);

  const totalPurchased = suppliers.reduce((s, sup) => s + parseFloat(sup.totalPurchased || 0), 0);
  const activeCount    = suppliers.filter(s => s.isActive).length;
  const totalProducts  = suppliers.reduce((s, sup) => s + parseInt(sup.productCount || 0), 0);

  return (
    <div className="supplier-report">

      <div className="report-header">
        <div>
          <h2 className="report-heading">Supplier Overview</h2>
          <p className="report-subheading">Supplier relationships and purchase history</p>
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
              { label: 'Total Suppliers',    value: suppliers.length, icon: 'manufacturers', bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
              { label: 'Active Suppliers',   value: activeCount,      icon: 'check',         bg: 'var(--color-success-soft)', color: 'var(--color-success)'        },
              { label: 'Products Supplied',  value: totalProducts,    icon: 'box',           bg: 'var(--color-violet-soft)',  color: 'var(--color-violet)'         },
              { label: 'Total Purchased',    value: fmt(totalPurchased), icon: 'reports',    bg: 'var(--color-cyan-soft)',    color: 'var(--color-cyan)'           },
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

          <div className="report-section">
            <h3 className="report-section__title">Supplier List</h3>
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Supplier Name</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'right' }}>Products</th>
                    <th style={{ textAlign: 'right' }}>Total Orders</th>
                    <th style={{ textAlign: 'right' }}>Total Purchased</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No suppliers yet</td></tr>
                  ) : suppliers.map((s, i) => (
                    <tr key={i} onClick={() => setSelectedSupplier(s)} style={{ cursor: 'pointer' }}>
                      <td><div className="report-supplier-name">{s.name}</div></td>
                      <td><span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{s.phone || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{s.productCount}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{s.totalOrders}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(s.totalPurchased)}</span></td>
                      <td>
                        <span className={`report-status-badge report-status-badge--${s.isActive ? 'active' : 'inactive'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}



      {selectedSupplier && (
        <SupplierHistoryModal 
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
        />
      )}
    </div>
  );
}