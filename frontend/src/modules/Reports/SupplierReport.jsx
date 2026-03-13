import Icon from '../../components/Icon';

// Mock data
const SUPPLIERS = [
  { name: 'ABC Foods', products: 24, lastOrder: '2 days ago', totalPurchased: 125400, status: 'active' },
  { name: 'Tata Consumer', products: 12, lastOrder: '1 week ago', totalPurchased: 89200, status: 'active' },
  { name: 'Fortune Foods', products: 8, lastOrder: '3 days ago', totalPurchased: 56800, status: 'active' },
  { name: 'Amul', products: 15, lastOrder: '5 days ago', totalPurchased: 98400, status: 'active' },
  { name: 'MDH Spices', products: 18, lastOrder: '1 day ago', totalPurchased: 42600, status: 'active' },
  { name: 'Haldiram', products: 10, lastOrder: '2 weeks ago', totalPurchased: 34200, status: 'inactive' },
];

const SUPPLIER_STATS = {
  total: 28,
  active: 24,
  products: 110,
  totalPurchased: 446600,
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

export default function SupplierReport() {
  return (
    <div className="supplier-report">
      
      <div className="report-header">
        <div>
          <h2 className="report-heading">Supplier Overview</h2>
          <p className="report-subheading">Supplier relationships and purchase history</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="report-stats-grid">
        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' }}>
            <Icon name="manufacturers" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Total Suppliers</span>
            <span className="report-stat-card__value">{SUPPLIER_STATS.total}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <Icon name="check" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Active Suppliers</span>
            <span className="report-stat-card__value">{SUPPLIER_STATS.active}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-violet-soft)', color: 'var(--color-violet)' }}>
            <Icon name="box" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Products Supplied</span>
            <span className="report-stat-card__value">{SUPPLIER_STATS.products}</span>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-card__icon" style={{ background: 'var(--color-cyan-soft)', color: 'var(--color-cyan)' }}>
            <Icon name="reports" size={24} />
          </div>
          <div className="report-stat-card__content">
            <span className="report-stat-card__label">Total Purchased</span>
            <span className="report-stat-card__value">{fmt(SUPPLIER_STATS.totalPurchased)}</span>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="report-section">
        <h3 className="report-section__title">Supplier List</h3>
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th style={{ textAlign: 'right' }}>Products</th>
                <th style={{ textAlign: 'right' }}>Total Purchased</th>
                <th>Last Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {SUPPLIERS.map((supplier, i) => (
                <tr key={i}>
                  <td>
                    <div className="report-supplier-name">{supplier.name}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="report-qty">{supplier.products}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="report-amount">{fmt(supplier.totalPurchased)}</span>
                  </td>
                  <td>
                    <span className="report-time">{supplier.lastOrder}</span>
                  </td>
                  <td>
                    <span className={`report-status-badge report-status-badge--${supplier.status}`}>
                      {supplier.status}
                    </span>
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