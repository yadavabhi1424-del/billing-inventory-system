// SalesFilterBar.jsx — Global filter bar for Sales Report
import { useState } from 'react';
import Icon from '../../components/Icon';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function SalesFilterBar({ filters, onChange }) {
  const { period, startDate, endDate, month, year } = filters;
  const [showCustom, setShowCustom] = useState(period === 'custom');
  const [showMonth,  setShowMonth]  = useState(period === 'month-pick');
  const [showYear,   setShowYear]   = useState(period === 'year-pick');

  const setPeriod = (p) => {
    setShowCustom(p === 'custom');
    setShowMonth(p === 'month-pick');
    setShowYear(p === 'year-pick');
    onChange({ period: p, startDate: '', endDate: '', month: '', year: '' });
  };

  const PILLS = [
    { key: 'today',      label: 'Today' },
    { key: 'week',       label: 'This Week' },
    { key: 'month',      label: 'This Month' },
    { key: 'year',       label: 'This Year' },
    { key: 'month-pick', label: 'Pick Month' },
    { key: 'custom',     label: 'Custom Range' },
    { key: 'overall',    label: 'Overall' },
  ];

  return (
    <div className="sr-filter-bar">
      <div className="sr-filter-pills">
        {PILLS.map(p => (
          <button
            key={p.key}
            className={`report-period-btn${period === p.key ? ' report-period-btn--active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="sr-filter-extras">
          <div className="sr-date-range">
            <Icon name="filter" size={14} />
            <input
              type="date"
              className="sr-date-input"
              value={startDate}
              max={endDate || undefined}
              onChange={e => onChange({ ...filters, startDate: e.target.value })}
            />
            <span className="sr-date-sep">→</span>
            <input
              type="date"
              className="sr-date-input"
              value={endDate}
              min={startDate || undefined}
              onChange={e => onChange({ ...filters, endDate: e.target.value })}
            />
          </div>
        </div>
      )}

      {showMonth && (
        <div className="sr-filter-extras">
          <select
            className="sr-select"
            value={month}
            onChange={e => onChange({ ...filters, month: e.target.value })}
          >
            <option value="">-- Month --</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="sr-select"
            value={year}
            onChange={e => onChange({ ...filters, year: e.target.value })}
          >
            <option value="">-- Year --</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {showYear && (
        <div className="sr-filter-extras">
          <select
            className="sr-select"
            value={year}
            onChange={e => onChange({ ...filters, year: e.target.value })}
          >
            <option value="">-- Year --</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
