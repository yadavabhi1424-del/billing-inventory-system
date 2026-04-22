// CategoryAnalytics.jsx — Bar + Pie chart using Recharts
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector
} from 'recharts';
import Icon from '../../components/Icon';
import { getCategoryAnalytics } from '../../services/api';

const fmt    = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtShort = (n) => {
  n = parseFloat(n || 0);
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
  return '₹' + n.toFixed(0);
};

const PALETTE = [
  '#6366f1','#8b5cf6','#06b6d4','#22c55e','#f59e0b',
  '#ef4444','#ec4899','#14b8a6','#f97316','#a855f7'
];

const TOP_N = 6; // show top N, rest become "Others"

// Custom active shape for pie
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, value, name } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--color-text-primary)" fontSize={13} fontWeight={700}>{name}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--color-text-muted)" fontSize={12}>{fmtShort(value)}</text>
    </g>
  );
};

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="sr-chart-tooltip">
      <div className="sr-chart-tooltip__label">{d.payload.name}</div>
      <div className="sr-chart-tooltip__value">{fmt(d.value)}</div>
      {d.payload.totalQty !== undefined && (
        <div className="sr-chart-tooltip__sub">{Number(d.payload.totalQty).toLocaleString()} units</div>
      )}
    </div>
  );
};

export default function CategoryAnalytics({ filters }) {
  const [view,       setView]       = useState('bar');  // bar | pie
  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [othersOpen, setOthersOpen] = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(0);

  useEffect(() => { fetchData(); }, [filters]);

  const buildParams = () => {
    if (filters.period === 'custom' && filters.startDate && filters.endDate)
      return { startDate: filters.startDate, endDate: filters.endDate };
    if (filters.period === 'month-pick' && filters.month)
      return { month: filters.month, year: filters.year || new Date().getFullYear() };
    return { period: filters.period };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCategoryAnalytics(buildParams());
      if (res.success) setData(res.data.salesByCategory || []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data: top N + Others
  const sorted  = [...data].sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));
  const topCats = sorted.slice(0, TOP_N);
  const rest    = sorted.slice(TOP_N);
  const othersVal = rest.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0);

  let chartData = topCats.map((c, i) => ({
    name:        c.categoryName,
    value:       parseFloat(c.totalRevenue || 0),
    totalQty:    parseInt(c.totalQty || 0),
    fill:        PALETTE[i % PALETTE.length],
  }));

  if (othersVal > 0) {
    chartData.push({ name: 'Others', value: othersVal, fill: '#64748b', isOthers: true });
  }

  // Bar chart Y-axis label formatter
  const yFmt = (v) => fmtShort(v);

  return (
    <div className="report-section sr-category">
      <div className="sr-section-header">
        <div className="sr-section-title-group">
          <h3 className="report-section__title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            Category Analytics
          </h3>
          <p className="sr-section-sub">Revenue distribution by product category</p>
        </div>
        <div className="sr-tab-toggle">
          <button className={`sr-toggle-btn${view === 'bar' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setView('bar')}>
            <Icon name="reports" size={13} /> Bar Chart
          </button>
          <button className={`sr-toggle-btn${view === 'pie' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setView('pie')}>
            ◕ Pie Chart
          </button>
        </div>
      </div>

      {loading ? (
        <div className="sr-loader"><div className="app-loading__spinner" /></div>
      ) : chartData.length === 0 ? (
        <div className="sr-empty"><Icon name="box" size={32} /><p>No category data for this period</p></div>
      ) : (
        <>
          <div className="sr-chart-container">
            {view === 'bar' ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tickFormatter={yFmt} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-overlay)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    activeIndex={activeIdx}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, i) => setActiveIdx(i)}
                    onClick={(d) => { if (d.isOthers) setOthersOpen(true); }}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} style={{ cursor: entry.isOthers ? 'pointer' : 'default' }} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(val) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Others expanded breakdown */}
          {othersOpen && rest.length > 0 && (
            <div className="sr-others-expand">
              <div className="sr-others-header">
                <span className="sr-others-title">Others — Full Breakdown</span>
                <button className="sr-icon-btn" onClick={() => setOthersOpen(false)}>
                  <Icon name="x" size={14} />
                </button>
              </div>
              <div className="sr-others-list">
                {rest.map((c, i) => (
                  <div key={i} className="sr-others-item">
                    <span className="sr-others-dot" style={{ background: PALETTE[(i + TOP_N) % PALETTE.length] }} />
                    <span className="sr-others-name">{c.categoryName}</span>
                    <span className="sr-others-val">{fmt(c.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && view === 'pie' && !othersOpen && (
            <p className="sr-others-hint">
              <Icon name="info" size={12} /> Click the <b>Others</b> slice to see full breakdown
            </p>
          )}
        </>
      )}
    </div>
  );
}
