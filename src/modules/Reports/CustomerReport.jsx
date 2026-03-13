import Icon from '../../components/Icon';

// Mock data
const TOP_CUSTOMERS = [
  { name: 'Sunita Devi', orders: 24, spent: 15420, lastVisit: '2 days ago' },
  { name: 'Rahul Sharma', orders: 18, spent: 12840, lastVisit: '1 day ago' },
  { name: 'Priya Gupta', orders: 15, spent: 9680, lastVisit: 'Today' },
  { name: 'Amit Kumar', orders: 12, spent: 8920, lastVisit: '3 days ago' },
  { name: 'Neha Singh', orders: 10, spent: 7450, lastVisit: '1 week ago' },
];

const CUSTOMER_STATS = {
  total: 268,
  new: 42,
  returning: 226,
  avgSpend: 280,
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function CustomerReport() {
  return (
    <div className="customer-report">
      
      <div className="report-header">
        <div>
          <h2 className="report-heading">Customer Analytics</h2>
          <p className="report-subheading">Customer behavior and purchase patterns</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' }}>
            <Icon name="customers" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Total Customers</span>
            <span className="report-stat-card__value">{CUSTOMER_STATS.total}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <Icon name="user" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">New Customers</span>
            <span className="report-stat-card__value">{CUSTOMER_STATS.new}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-violet-soft)', color: 'var(--color-violet)' }}>
            <Icon name="customers" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Returning Customers</span>
            <span className="report-stat-card__value">{CUSTOMER_STATS.returning}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-cyan-soft)', color: 'var(--color-cyan)' }}>
            <Icon name="billing" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Avg Customer Spend</span>
            <span className="report-stat-card__value">{fmt(CUSTOMER_STATS.avgSpend)}</span>
          </div>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="report-section">
        <h3 className="report-section__title">Top Customers</h3>
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th style={{ textAlign: 'right' }}>Orders</th>
                <th style={{ textAlign: 'right' }}>Total Spent</th>
                <th>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {TOP_CUSTOMERS.map((customer, i) => (
                <tr key={i}>
                  <td>
                    <div className="report-customer-name">{customer.name}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="report-qty">{customer.orders}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="report-amount">{fmt(customer.spent)}</span>
                  </td>
                  <td>
                    <span className="report-time">{customer.lastVisit}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="report-actions">
        <button className="report-export-btn">
          <Icon name="reports" size={16} />
          Export to PDF
        </button>
        <button className="report-export-btn report-export-btn--secondary">
          <Icon name="inventory" size={16} />
          Export to Excel
        </button>
      </div>
    </div>
  );
}