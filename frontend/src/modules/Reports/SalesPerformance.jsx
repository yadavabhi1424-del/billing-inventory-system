// SalesPerformance.jsx — Top / Least Selling Items
import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { getSalesReport } from '../../services/api';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const RANK_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#22c55e','#f59e0b'];

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SalesPerformance({ filters }) {
  const [tab,     setTab]     = useState('top');     // top | least
  const [sortBy,  setSortBy]  = useState('revenue'); // revenue | qty
  const [limit,   setLimit]   = useState(5);
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [filters, tab, sortBy, limit]);

  const buildParams = () => {
    const p = { limit, sortBy, order: tab === 'top' ? 'top' : 'bottom' };
    
    if (filters.period === 'custom' && filters.startDate && filters.endDate) {
      p.startDate = filters.startDate; 
      p.endDate = filters.endDate;
    } else if (filters.period === 'today') {
      const today = getLocalDateStr();
      p.startDate = today; p.endDate = today;
    } else if (filters.period === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      p.startDate = yStr; p.endDate = yStr;
    } else if (filters.period === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      p.startDate = getLocalDateStr(w);
      p.endDate = getLocalDateStr();
    } else if (filters.period === 'month-pick' && filters.month) {
      p.month = filters.month; p.year = filters.year || new Date().getFullYear();
    } else if (filters.period !== 'month-pick' && filters.period !== 'custom') {
      p.period = filters.period;
    }
    return p;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getSalesReport(buildParams());
      if (res.success) setData(res.data.topProducts || []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const maxRevenue = Math.max(...data.map(d => parseFloat(d.totalRevenue || 0)), 1);
  const maxQty     = Math.max(...data.map(d => parseInt(d.totalQty || 0)), 1);

  return (
    <div className="report-section sr-performance">
      <div className="sr-section-header">
        <div className="sr-section-title-group">
          <h3 className="report-section__title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            Sales Performance
          </h3>
          <p className="sr-section-sub">Item-level ranking by {sortBy === 'revenue' ? 'revenue' : 'quantity'}</p>
        </div>

        <div className="sr-controls">
          {/* Tab toggle */}
          <div className="sr-tab-toggle">
            <button className={`sr-toggle-btn${tab === 'top' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setTab('top')}>
              <Icon name="zigzagUp" size={13} /> Top Selling
            </button>
            <button className={`sr-toggle-btn${tab === 'least' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setTab('least')}>
              <Icon name="zigzagDown" size={13} /> Least Selling
            </button>
          </div>

          {/* Sort */}
          <div className="sr-tab-toggle">
            <button className={`sr-toggle-btn${sortBy === 'revenue' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('revenue')}>Revenue</button>
            <button className={`sr-toggle-btn${sortBy === 'qty' ? ' sr-toggle-btn--active' : ''}`} onClick={() => setSortBy('qty')}>Quantity</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="sr-loader"><div className="app-loading__spinner" /></div>
      ) : data.length === 0 ? (
        <div className="sr-empty">
          <Icon name="box" size={32} />
          <p>No sales data for this period</p>
        </div>
      ) : (
        <>
          <div className="sr-perf-list">
            {data.map((item, i) => {
              const pctRev = ((parseFloat(item.totalRevenue || 0) / maxRevenue) * 100).toFixed(1);
              const pctQty = ((parseInt(item.totalQty || 0) / maxQty) * 100).toFixed(1);
              const col    = RANK_COLORS[i % RANK_COLORS.length];
              return (
                <div key={i} className="sr-perf-item">
                  <div className="sr-perf-rank" style={{ background: col + '22', color: col }}>
                    #{i + 1}
                  </div>
                  <div className="sr-perf-info">
                    <div className="sr-perf-name">{item.productName}</div>
                    <div className="sr-perf-bar-wrap">
                      <div className="sr-perf-bar" style={{ width: `${sortBy === 'qty' ? pctQty : pctRev}%`, background: col }} />
                    </div>
                  </div>
                  <div className="sr-perf-meta">
                    <span className="sr-perf-qty">{Number(item.totalQty).toLocaleString()} units</span>
                    <span className="sr-perf-rev">{fmt(item.totalRevenue)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sr-expand-row">
            {limit > 5 && (
              <button className="sr-expand-btn sr-expand-btn--secondary" onClick={() => setLimit(5)}>
                Show Less
              </button>
            )}
            {data.length >= limit && (
              <button className="sr-expand-btn" onClick={() => setLimit(prev => prev + 10)}>
                <Icon name="plus" size={14} /> Show More
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
