// SalesReport.jsx — Orchestrator for the full Reports & Analytics dashboard
import { useState } from 'react';
import './SalesReport.css';
import SalesFilterBar    from './SalesFilterBar';
import SalesPerformance  from './SalesPerformance';
import DatewiseDashboard from './DatewiseDashboard';
import CategoryAnalytics from './CategoryAnalytics';
import InventoryInsights from './InventoryInsights';
import CustomerInsights  from './CustomerInsights';
import ReturnsAnalysis   from './ReturnsAnalysis';
import Icon              from '../../components/Icon';

const SECTIONS = [
  { key: 'performance', label: 'Sales Performance', icon: 'reports'   },
  { key: 'datewise',    label: 'Date-wise Report',  icon: 'billing'   },
  { key: 'categories',  label: 'Category Analytics',icon: 'inventory' },
  { key: 'inventory',   label: 'Inventory Insights',icon: 'box'       },
  { key: 'customers',   label: 'Customer Insights',  icon: 'customers', supplierOnly: true },
  { key: 'returns',     label: 'Returns & Loss',    icon: 'refresh', supplierOnly: true },
];

export default function SalesReport({ user }) {
  const isSupplier = user?.userType === 'supplier';

  const [section, setSection] = useState('performance');
  const [filters, setFilters] = useState({
    period:    'month',
    startDate: '',
    endDate:   '',
    month:     '',
    year:      '',
  });

  const visibleSections = SECTIONS.filter(s => !s.supplierOnly || isSupplier);

  return (
    <div className="sales-report sr-dashboard">

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className="sr-global-filter">
        <SalesFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* ── Section Nav ────────────────────────────────────── */}
      <div className="sr-section-nav">
        {visibleSections.map(s => (
          <button
            key={s.key}
            className={`sr-nav-btn${section === s.key ? ' sr-nav-btn--active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            <Icon name={s.icon} size={15} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Section Content ────────────────────────────────── */}
      <div className="sr-section-content">
        {section === 'performance' && <SalesPerformance  filters={filters} />}
        {section === 'datewise'    && <DatewiseDashboard filters={filters} />}
        {section === 'categories'  && <CategoryAnalytics filters={filters} />}
        {section === 'inventory'   && <InventoryInsights />}
        {section === 'customers'   && isSupplier && <CustomerInsights filters={filters} />}
        {section === 'returns'     && isSupplier && <ReturnsAnalysis   filters={filters} />}
      </div>
    </div>
  );
}