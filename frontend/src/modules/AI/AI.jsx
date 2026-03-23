import { useState, useEffect, useCallback } from 'react';
import './AI.css';
import {
  getAIRecommendations,
  getAIPredictAll,
  getAIPrediction,
  trainAIModels,
  getAIHealth,
} from '../../services/api';

const URGENCY_LABEL = {
  critical: '● Critical', high: '● High',
  medium:   '● Medium',   low:  '● Low', ok: '● OK',
};
const TREND_ICON = { rising: '↑', falling: '↓', stable: '→' };

function UrgencyBadge({ urgency }) {
  return <span className={`urgency-badge urgency-${urgency}`}>{URGENCY_LABEL[urgency] || urgency}</span>;
}
function TrendBadge({ trend }) {
  return <span className={`trend-${trend}`}>{TREND_ICON[trend]} {trend}</span>;
}

// ── Product Detail Modal ──────────────────────────────────────
function ProductDetailModal({ productId, productName, onClose }) {
  const [data,       setData]      = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [maximized,  setMaximized] = useState(false);

  useEffect(() => {
    getAIPrediction(productId)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [productId]);

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const preds  = data?.predictions || [];
  const maxVal = preds.length ? Math.max(...preds.map(p => p.predicted), 1) : 1;
  const maxUp  = preds.length ? Math.max(...preds.map(p => p.upper),     1) : 1;

  return (
    <div className="ai-modal-overlay" onClick={handleOverlay}>
      <div className={`ai-modal ${maximized ? 'maximized' : ''}`}>

        {/* Header */}
        <div className="ai-modal-header">
          <div>
            <div className="ai-modal-title">📦 {productName}</div>
            <div className="ai-modal-sub">7-day demand forecast · Prophet ML</div>
          </div>
          <div className="ai-modal-actions">
            <button className="ai-modal-btn" onClick={() => setMaximized(m => !m)}
              title={maximized ? 'Restore' : 'Maximize'}>
              {maximized ? '⊡' : '⊞'}
            </button>
            <button className="ai-modal-btn" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="ai-modal-body">
          {loading ? (
            <div className="ai-loading"><div className="ai-spinner"/><p>Loading forecast...</p></div>
          ) : !data ? (
            <div className="ai-empty"><div className="ai-empty-icon">❌</div><p>No forecast available. Train the model first.</p></div>
          ) : (
            <>
              {/* Stats */}
              <div className="ai-modal-stats">
                {[
                  { label: 'Total 7-day',   val: data.total_predicted.toFixed(0), color: '#a78bfa', border: '#7c3aed' },
                  { label: 'Daily avg',     val: `${data.daily_avg}/day`,          color: '#60a5fa', border: '#2563eb' },
                  { label: 'Forecast days', val: data.forecast_days,               color: '#4ade80', border: '#16a34a' },
                  { label: 'Confidence',    val: '80%',                            color: '#fb923c', border: '#ea580c' },
                ].map(s => (
                  <div className="ai-modal-stat" key={s.label} style={{ borderColor: s.border }}>
                    <div className="ai-modal-stat-val" style={{ color: s.color }}>{s.val}</div>
                    <div className="ai-modal-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="ai-chart-wrap">
                <div className="ai-chart-title">Daily Demand Forecast</div>
                <div className="ai-bars-container">
                  {preds.map((p, i) => {
                    const predH = Math.max(8, (p.predicted / maxUp) * 140);
                    const confTop = Math.max(4, (p.upper / maxUp) * 140);
                    const confBot = Math.max(2, (p.lower / maxUp) * 140);
                    const confH   = Math.max(4, confTop - confBot);
                    return (
                      <div className="ai-bar-group" key={i}>
                        <div className="ai-bar-tooltip">
                          <strong>{new Date(p.date).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</strong>
                          Predicted: {p.predicted} units<br/>
                          Range: {p.lower} – {p.upper}
                        </div>
                        <div className="ai-bar-outer" style={{ height: `${Math.max(8,(maxUp/maxUp)*140)}px` }}>
                          {/* Confidence bar */}
                          <div className="ai-bar-conf" style={{
                            height: `${confH}px`,
                            bottom: `${confBot}px`,
                          }}/>
                          {/* Prediction bar */}
                          <div className="ai-bar-inner" style={{ height: `${predH}px` }}/>
                        </div>
                        <span className="ai-bar-day-label">
                          {new Date(p.date).toLocaleDateString('en',{weekday:'short'}).slice(0,3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="ai-chart-legend">
                  <div className="ai-legend-item">
                    <div className="ai-legend-dot" style={{background:'linear-gradient(to top,#7c3aed,#a78bfa)'}}/>
                    Predicted demand
                  </div>
                  <div className="ai-legend-item">
                    <div className="ai-legend-dot" style={{background:'#4ade80',opacity:.5}}/>
                    Confidence range
                  </div>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="ai-chart-wrap">
                <div className="ai-chart-title">Daily Breakdown</div>
                <table className="ai-breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Predicted</th>
                      <th>Min – Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preds.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.date).toLocaleDateString('en',{month:'short',day:'numeric'})}</td>
                        <td style={{color:'#64748b'}}>{new Date(p.date).toLocaleDateString('en',{weekday:'long'})}</td>
                        <td><span className="ai-predicted-val">{p.predicted} units</span></td>
                        <td><span className="ai-conf-range">{p.lower} – {p.upper} units</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Restock Alerts ────────────────────────────────────────────
function RestockAlerts() {
  const [data,      setData]     = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [filter,    setFilter]   = useState('all');
  const [selected,  setSelected] = useState(null);

  useEffect(() => {
    getAIRecommendations()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ai-loading"><div className="ai-spinner"/><p>Analyzing stock levels...</p></div>;

  const filtered = filter === 'all' ? data : data.filter(d => d.urgency === filter);
  const count    = (u) => data.filter(d => d.urgency === u).length;
  const getDaysClass = (d) => d <= 3 ? 'days-crit' : d <= 7 ? 'days-high' : 'days-ok';

  return (
    <div>
      {selected && (
        <ProductDetailModal
          productId={selected.product_id}
          productName={selected.product_name}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="ai-stats-row">
        <div className="ai-stat-card red"><div className="ai-stat-val">{count('critical')}</div><div className="ai-stat-label">Critical</div></div>
        <div className="ai-stat-card orange"><div className="ai-stat-val">{count('high')}</div><div className="ai-stat-label">High urgency</div></div>
        <div className="ai-stat-card yellow"><div className="ai-stat-val">{count('medium')}</div><div className="ai-stat-label">Medium</div></div>
        <div className="ai-stat-card green"><div className="ai-stat-val">{count('ok') + count('low')}</div><div className="ai-stat-label">All good</div></div>
      </div>

      <div className="ai-filters">
        {['all','critical','high','medium','low','ok'].map(f => (
          <button key={f} className={`ai-filter-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      <p className="ai-click-hint">💡 Click any row to view detailed forecast</p>

      <div className="ai-table-card">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Current Stock</th><th>Days Left</th>
              <th>Daily Demand</th><th>Suggested Order</th><th>Trend</th><th>Urgency</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'#64748b'}}>No items found</td></tr>
            ) : filtered.map(item => (
              <tr key={item.product_id} className="ai-clickable-row" onClick={() => setSelected(item)}>
                <td><span className="ai-pname">{item.product_name}</span></td>
                <td>{item.current_stock} units</td>
                <td><span className={getDaysClass(item.days_of_stock)}>{item.days_of_stock} days</span></td>
                <td>{item.daily_avg}/day</td>
                <td><span className="qty-badge">{item.suggested_qty} units</span></td>
                <td><TrendBadge trend={item.trend}/></td>
                <td><UrgencyBadge urgency={item.urgency}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Demand Forecast ───────────────────────────────────────────
function DemandForecast() {
  const [data,     setData]    = useState([]);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected]= useState(null);

  useEffect(() => {
    getAIPredictAll()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ai-loading"><div className="ai-spinner"/><p>Loading forecasts...</p></div>;
  if (!data.length) return <div className="ai-empty"><div className="ai-empty-icon">📊</div><p>No forecast data. Train the model first.</p></div>;

  const totalDemand = data.reduce((s,d)=>s+d.total_predicted,0).toFixed(0);
  const avgDemand   = (data.reduce((s,d)=>s+d.daily_avg,0)/data.length).toFixed(1);

  return (
    <div>
      {selected && (
        <ProductDetailModal
          productId={selected.product_id}
          productName={selected.product_name}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="ai-stats-row">
        <div className="ai-stat-card purple"><div className="ai-stat-val">{data.length}</div><div className="ai-stat-label">Products forecast</div></div>
        <div className="ai-stat-card blue"><div className="ai-stat-val">{totalDemand}</div><div className="ai-stat-label">7-day total demand</div></div>
        <div className="ai-stat-card purple"><div className="ai-stat-val">{avgDemand}</div><div className="ai-stat-label">Avg daily demand</div></div>
        <div className="ai-stat-card blue"><div className="ai-stat-val">{data[0]?.forecast_days||7}</div><div className="ai-stat-label">Days ahead</div></div>
      </div>

      <p className="ai-click-hint">💡 Click any card to view detailed forecast</p>

      <div className="forecast-grid">
        {data.map(product => {
          const preds  = product.predictions || [];
          const maxVal = Math.max(...preds.map(p=>p.predicted),1);
          return (
            <div className="forecast-card ai-clickable-row" key={product.product_id}
              onClick={() => setSelected(product)}>
              <div className="forecast-card-header">
                <div>
                  <div className="forecast-name">{product.product_name}</div>
                  <div className="forecast-avg">~{product.daily_avg}/day avg</div>
                </div>
                <div>
                  <div className="forecast-total">{product.total_predicted.toFixed(0)}</div>
                  <div className="forecast-total-label">7-day total</div>
                </div>
              </div>
              <div className="forecast-bars">
                {preds.map((p,i) => (
                  <div className="forecast-bar-col" key={i}>
                    <div className="forecast-bar" style={{height:`${Math.max(8,(p.predicted/maxVal)*100)}%`}}/>
                    <span className="forecast-bar-lbl">
                      {new Date(p.date).toLocaleDateString('en',{weekday:'short'}).slice(0,1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trend Analysis ────────────────────────────────────────────
function TrendAnalysis() {
  const [data,     setData]    = useState([]);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected]= useState(null);

  useEffect(() => {
    getAIPredictAll()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const getTrend = (preds) => {
    if (!preds || preds.length < 4) return 'stable';
    const first = preds.slice(0,3).reduce((s,p)=>s+p.predicted,0)/3;
    const last  = preds.slice(-3).reduce((s,p)=>s+p.predicted,0)/3;
    if (last > first*1.1) return 'rising';
    if (last < first*0.9) return 'falling';
    return 'stable';
  };

  if (loading) return <div className="ai-loading"><div className="ai-spinner"/><p>Analyzing trends...</p></div>;

  const rising  = data.filter(d=>getTrend(d.predictions)==='rising');
  const falling = data.filter(d=>getTrend(d.predictions)==='falling');
  const stable  = data.filter(d=>getTrend(d.predictions)==='stable');

  const Section = ({ title, items, iconClass, arrow, arrowColor }) => (
    <div className="ai-section-card">
      <div className="ai-section-title">
        <span style={{color:arrowColor,fontSize:18}}>{arrow}</span>
        {title} <span style={{color:'#64748b',fontWeight:400}}>({items.length})</span>
      </div>
      {items.length === 0
        ? <p style={{color:'#64748b',fontSize:13}}>None in this category</p>
        : <div className="trend-grid">
            {items.map(item => (
              <div className="trend-item-card ai-clickable-row" key={item.product_id}
                onClick={() => setSelected(item)}>
                <div className={`trend-item-icon ${iconClass}`}>
                  <span style={{fontSize:16}}>{arrow}</span>
                </div>
                <div>
                  <div className="trend-item-name">{item.product_name}</div>
                  <div className="trend-item-meta">{item.daily_avg}/day · {item.total_predicted.toFixed(0)} units total</div>
                </div>
                <div className="trend-item-arrow" style={{color:arrowColor}}>{arrow}</div>
              </div>
            ))}
          </div>
      }
    </div>
  );

  return (
    <div>
      {selected && (
        <ProductDetailModal
          productId={selected.product_id}
          productName={selected.product_name}
          onClose={() => setSelected(null)}
        />
      )}
      <div className="ai-stats-row">
        <div className="ai-stat-card green"><div className="ai-stat-val">{rising.length}</div><div className="ai-stat-label">↑ Rising</div></div>
        <div className="ai-stat-card red"><div className="ai-stat-val">{falling.length}</div><div className="ai-stat-label">↓ Falling</div></div>
        <div className="ai-stat-card purple"><div className="ai-stat-val">{stable.length}</div><div className="ai-stat-label">→ Stable</div></div>
        <div className="ai-stat-card blue"><div className="ai-stat-val">{data.length}</div><div className="ai-stat-label">Total products</div></div>
      </div>
      <p className="ai-click-hint">💡 Click any product to view detailed forecast</p>
      <Section title="Rising Demand"  items={rising}  iconClass="trend-icon-up" arrow="↑" arrowColor="#4ade80"/>
      <Section title="Falling Demand" items={falling} iconClass="trend-icon-dn" arrow="↓" arrowColor="#f87171"/>
      <Section title="Stable Demand"  items={stable}  iconClass="trend-icon-st" arrow="→" arrowColor="#94a3b8"/>
    </div>
  );
}

// ── Model Info ────────────────────────────────────────────────
function ModelInfo() {
  const [health,   setHealth]  = useState(null);
  const [loading,  setLoading] = useState(true);
  const [training, setTraining]= useState(false);
  const [trainMsg, setTrainMsg]= useState('');

  const loadHealth = useCallback(() => {
    setLoading(true);
    getAIHealth()
      .then(r => setHealth(r))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const handleTrain = async () => {
    setTraining(true); setTrainMsg('');
    try {
      const r = await trainAIModels();
      setTrainMsg(`✅ Trained ${r.data?.trained}/${r.data?.total} products successfully!`);
      loadHealth();
    } catch(e) {
      setTrainMsg(`❌ Training failed: ${e.message}`);
    } finally { setTraining(false); }
  };

  if (loading) return <div className="ai-loading"><div className="ai-spinner"/><p>Checking model status...</p></div>;

  return (
    <div>
      <div className="model-grid">
        {[
          { icon:'🤖', label:'AI Service',     value: health ? '✅ Online' : '❌ Offline' },
          { icon:'📦', label:'Models Trained',  value: health?.models ?? 0 },
          { icon:'🧠', label:'Algorithm',       value: 'Prophet (FB)' },
          { icon:'📅', label:'Forecast Window', value: '7 Days' },
        ].map(item => (
          <div className="model-info-card" key={item.label}>
            <div className="model-info-icon">{item.icon}</div>
            <div>
              <div className="model-info-label">{item.label}</div>
              <div className="model-info-val">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-section-card">
        <div className="ai-section-title">🔁 Retrain Models</div>
        <p style={{fontSize:13,color:'#64748b',marginBottom:20,lineHeight:1.7}}>
          Retraining updates predictions using your latest sales data.
          Run this after adding new products or every few days for best accuracy.
        </p>
        <button className="ai-train-btn" onClick={handleTrain} disabled={training}>
          {training ? '⏳ Training...' : '🚀 Train Now'}
        </button>
        {trainMsg && <div className="ai-train-result">{trainMsg}</div>}
      </div>

      <div className="ai-section-card">
        <div className="ai-section-title">ℹ️ How It Works</div>
        <div style={{fontSize:13,color:'#94a3b8',lineHeight:2}}>
          <p>🔹 <strong style={{color:'#e2e8f0'}}>Data:</strong> Uses your real sales history from the database.</p>
          <p>🔹 <strong style={{color:'#e2e8f0'}}>Sample data:</strong> If real data is limited (&lt;14 days), synthetic data fills the gap.</p>
          <p>🔹 <strong style={{color:'#e2e8f0'}}>Algorithm:</strong> Facebook Prophet — detects weekly seasonality and trends.</p>
          <p>🔹 <strong style={{color:'#e2e8f0'}}>Auto-improve:</strong> As you record more sales, predictions become more accurate.</p>
          <p>🔹 <strong style={{color:'#e2e8f0'}}>Reorder logic:</strong> Days of stock = current stock ÷ daily average demand.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const TABS = [
  { id:'restock',  label:'Restock Alerts',  icon:'🔴' },
  { id:'forecast', label:'Demand Forecast', icon:'📊' },
  { id:'trends',   label:'Trend Analysis',  icon:'📈' },
  { id:'model',    label:'Model Info',      icon:'🤖' },
];

export default function AIPredictPage() {
  const [activeTab, setActiveTab] = useState('restock');
  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1>🤖 AI Predict <span className="ai-badge-live">● LIVE</span></h1>
        <p>Demand forecasting and restock recommendations powered by Prophet ML</p>
      </div>
      <div className="ai-tabs">
        {TABS.map(tab => (
          <button key={tab.id}
            className={`ai-tab ${activeTab===tab.id?'active':''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      {activeTab==='restock'  && <RestockAlerts/>}
      {activeTab==='forecast' && <DemandForecast/>}
      {activeTab==='trends'   && <TrendAnalysis/>}
      {activeTab==='model'    && <ModelInfo/>}
    </div>
  );
}