import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getCustomerReport } from '../../services/api';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function CustomerReport({ user }) {
  const isSupplier = user?.userType === 'supplier';
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerReport()
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const summary      = data?.summary      || {};
  const topCustomers = data?.topCustomers || [];

  return (
    <div className="customer-report">

      <div className="report-header">
        <div>
          <h2 className="report-heading">{isSupplier ? 'B2B Customer Analytics' : 'Customer Analytics'}</h2>
          <p className="report-subheading">{isSupplier ? 'Wholesale shop performance and purchase patterns' : 'Customer behavior and purchase patterns'}</p>
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
              { label: isSupplier ? 'Total Shops' : 'Total Customers',     value: summary.totalCustomers || 0, icon: 'customers', bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
              { label: isSupplier ? 'New Shops' : 'New This Month',       value: summary.newCustomers   || 0, icon: 'customers', bg: 'var(--color-success-soft)', color: 'var(--color-success)'        },
              { label: 'Top Customer Orders',  value: topCustomers[0]?.totalOrders || 0, icon: 'billing', bg: 'var(--color-violet-soft)', color: 'var(--color-violet)'    },
              { label: 'Top Customer Spent',   value: fmt(topCustomers[0]?.totalSpent || 0), icon: 'billing', bg: 'var(--color-cyan-soft)', color: 'var(--color-cyan)'    },
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
            <h3 className="report-section__title">Top Customers</h3>
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{isSupplier ? 'Shop Name' : 'Customer Name'}</th>
                    <th>Phone</th>
                    <th style={{ textAlign: 'right' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Total Spent</th>
                    <th style={{ textAlign: 'right' }}>{isSupplier ? 'Shop ID' : 'Loyalty Points'}</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No customer data yet</td></tr>
                  ) : topCustomers.map((c, i) => (
                    <tr key={i}>
                      <td><div className="report-customer-name">{c.name}</div></td>
                      <td><span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{c.phone || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{c.totalOrders}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(c.totalSpent)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{isSupplier ? (c.shopId || '—') : c.loyaltyPoints}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


    </div>
  );
}