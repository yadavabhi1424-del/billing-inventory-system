// ============================================================
//  AI.jsx — AI Predict Module
//  StockSense Pro
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import './AI.css';
import {
  getAIRecommendations,
  getAIPredictAll,
  trainAIModels,
  getAIHealth,
} from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────
const URGENCY_LABEL = { critical:'🔴 Critical', high:'🟠 High', medium:'🟡 Medium', low:'🔵 Low', ok:'🟢 OK' };
const TREND_ICON    = { rising:'↑', falling:'↓', stable:'→' };

function UrgencyBadge({ urgency }) {
  return <span className={`urgency-badge urgency-${urgency}`}>{URGENCY_LABEL[urgency] || urgency}</span>;
}

function TrendBadge({ trend }) {
  return <span className={`trend-${trend}`}>{TREND_ICON[trend]} {trend}</span>;
}

// ── Tab: Restock Alerts ───────────────────────────────────────
function RestockAlerts() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    getAIRecommendations()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? data : data.filter(d => d.urgency === filter);
  const counts   = { critical: 0, high: 0, medium: 0, ok: 0 };
  data.forEach(d => { if (counts[d.urgency] !== undefined) counts[d.urgency]++; });

  if (loading) return <div className="ai-loading"><div className="ai-loading__spinner"/><p>Analyzing stock levels...</p></div>;

  return (
    <div>
      {/* Stats */}
      <div className="ai-stats">
        {[
          { label: 'Critical',  value: counts.critical,  color: '#dc2626' },
          { label: 'High',      value: counts.high,      color: '#ea580c' },
          { label: 'Medium',    value: data.filter(d=>d.urgency==='medium').length, color: '#ca8a04' },
          { label: 'All Good',  value: counts.ok,        color: '#16a34a' },
        ].map(s => (
          <div className="ai-stat" key={s.label}>
            <div className="ai-stat__value" style={{ color: s.color }}>{s.value}</div>
            <div className="ai-stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {['all','critical','high','medium','low','ok'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding:'6px 14px', borderRadius:20, border:'1px solid var(--border)',
              background: filter===f ? 'var(--accent)' : 'var(--bg-secondary)',
              color: filter===f ? 'white' : 'var(--text-primary)',
              cursor:'pointer', fontSize:13, fontWeight:500,
            }}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="ai-card">
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Days Left</th>
                <th>Daily Demand</th>
                <th>Suggested Order</th>
                <th>Trend</th>
                <th>Urgency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center',padding:40,color:'var(--text-secondary)'}}>No items found</td></tr>
              ) : filtered.map(item => (
                <tr key={item.product_id}>
                  <td><strong>{item.product_name}</strong></td>
                  <td>{item.current_stock} units</td>
                  <td>
                    <span style={{ color: item.days_of_stock <= 3 ? '#dc2626' : item.days_of_stock <= 7 ? '#ea580c' : 'inherit', fontWeight:600 }}>
                      {item.days_of_stock} days
                    </span>
                  </td>
                  <td>{item.daily_avg}/day</td>
                  <td><strong style={{color:'var(--accent)'}}>{item.suggested_qty} units</strong></td>
                  <td><TrendBadge trend={item.trend} /></td>
                  <td><UrgencyBadge urgency={item.urgency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Demand Forecast ──────────────────────────────────────
function DemandForecast() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAIPredictAll()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ai-loading"><div className="ai-loading__spinner"/><p>Loading forecasts...</p></div>;
  if (!data.length) return <div className="ai-empty"><div className="ai-empty__icon">📊</div><p>No forecast data. Train the model first.</p></div>;

  return (
    <div>
      <div className="ai-stats" style={{marginBottom:24}}>
        <div className="ai-stat">
          <div className="ai-stat__value">{data.length}</div>
          <div className="ai-stat__label">Products Forecasted</div>
        </div>
        <div className="ai-stat">
          <div className="ai-stat__value">{data.reduce((s,d)=>s+d.total_predicted,0).toFixed(0)}</div>
          <div className="ai-stat__label">Total 7-Day Demand</div>
        </div>
        <div className="ai-stat">
          <div className="ai-stat__value">{data.length ? (data.reduce((s,d)=>s+d.daily_avg,0)/data.length).toFixed(1) : 0}</div>
          <div className="ai-stat__label">Avg Daily Demand</div>
        </div>
        <div className="ai-stat">
          <div className="ai-stat__value">{data[0]?.forecast_days || 7}</div>
          <div className="ai-stat__label">Days Ahead</div>
        </div>
      </div>

      <div className="forecast-grid">
        {data.map(product => {
          const preds  = product.predictions || [];
          const maxVal = Math.max(...preds.map(p => p.predicted), 1);
          return (
            <div className="forecast-card" key={product.product_id}>
              <div className="forecast-card__header">
                <div>
                  <div className="forecast-card__name">{product.product_name}</div>
                  <div className="forecast-card__avg">~{product.daily_avg}/day avg</div>
                </div>
                <div>
                  <div className="forecast-card__total">{product.total_predicted.toFixed(0)}</div>
                  <div className="forecast-card__total-label">7-day total</div>
                </div>
              </div>

              {/* Mini bar chart */}
              <div className="forecast-bars">
                {preds.map((p, i) => (
                  <div className="forecast-bar-wrap" key={i}>
                    <div
                      className="forecast-bar"
                      style={{ height: `${Math.max(8,(p.predicted/maxVal)*100)}%` }}
                      title={`${p.date}: ${p.predicted}`}
                    />
                    <span className="forecast-bar-label">
                      {new Date(p.date).toLocaleDateString('en',{weekday:'short'}).slice(0,1)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Daily breakdown */}
              <div style={{marginTop:12,fontSize:12,color:'var(--text-secondary)'}}>
                {preds.map((p,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                    <span>{new Date(p.date).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</span>
                    <span style={{fontWeight:600,color:'var(--text-primary)'}}>{p.predicted} units</span>
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

// ── Tab: Trend Analysis ───────────────────────────────────────
function TrendAnalysis() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAIPredictAll()
      .then(r => setData(r.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="ai-loading"><div className="ai-loading__spinner"/><p>Analyzing trends...</p></div>;

  const getTrend = (preds) => {
    if (!preds || preds.length < 4) return 'stable';
    const first = preds.slice(0,3).reduce((s,p)=>s+p.predicted,0)/3;
    const last  = preds.slice(-3).reduce((s,p)=>s+p.predicted,0)/3;
    if (last > first * 1.1) return 'rising';
    if (last < first * 0.9) return 'falling';
    return 'stable';
  };

  const rising  = data.filter(d => getTrend(d.predictions) === 'rising');
  const falling = data.filter(d => getTrend(d.predictions) === 'falling');
  const stable  = data.filter(d => getTrend(d.predictions) === 'stable');

  const Section = ({ title, icon, items, trendClass }) => (
    <div className="ai-card">
      <div className="ai-card__title">{icon} {title} ({items.length})</div>
      {items.length === 0
        ? <p style={{color:'var(--text-secondary)',fontSize:14}}>None</p>
        : <div className="trend-grid">
            {items.map(item => (
              <div className="trend-card" key={item.product_id}>
                <div className="trend-card__icon">📦</div>
                <div>
                  <div className="trend-card__name">{item.product_name}</div>
                  <div className="trend-card__meta">{item.daily_avg}/day avg · {item.total_predicted.toFixed(0)} total</div>
                </div>
                <div className={`trend-card__badge ${trendClass}`}>
                  {trendClass === 'trend-rising' ? '↑' : trendClass === 'trend-falling' ? '↓' : '→'}
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );

  return (
    <div>
      <div className="ai-stats" style={{marginBottom:24}}>
        <div className="ai-stat"><div className="ai-stat__value" style={{color:'#16a34a'}}>{rising.length}</div><div className="ai-stat__label">↑ Rising</div></div>
        <div className="ai-stat"><div className="ai-stat__value" style={{color:'#dc2626'}}>{falling.length}</div><div className="ai-stat__label">↓ Falling</div></div>
        <div className="ai-stat"><div className="ai-stat__value" style={{color:'#6b7280'}}>{stable.length}</div><div className="ai-stat__label">→ Stable</div></div>
      </div>
      <Section title="Rising Demand"  icon="📈" items={rising}  trendClass="trend-rising"  />
      <Section title="Falling Demand" icon="📉" items={falling} trendClass="trend-falling" />
      <Section title="Stable Demand"  icon="➡️" items={stable}  trendClass="trend-stable"  />
    </div>
  );
}

// ── Tab: Model Info ───────────────────────────────────────────
function ModelInfo() {
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [training,  setTraining]  = useState(false);
  const [trainMsg,  setTrainMsg]  = useState('');

  const loadHealth = useCallback(() => {
    setLoading(true);
    getAIHealth()
      .then(r => setHealth(r))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const handleTrain = async () => {
    setTraining(true);
    setTrainMsg('');
    try {
      const r = await trainAIModels();
      setTrainMsg(`✅ Trained ${r.data?.trained}/${r.data?.total} products successfully!`);
      loadHealth();
    } catch (e) {
      setTrainMsg(`❌ Training failed: ${e.message}`);
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <div className="ai-loading"><div className="ai-loading__spinner"/><p>Checking model status...</p></div>;

  return (
    <div>
      <div className="model-info-grid">
        {[
          { icon:'🤖', label:'AI Service',    value: health ? '✅ Online' : '❌ Offline' },
          { icon:'📦', label:'Models Trained', value: health?.models ?? 0 },
          { icon:'🧠', label:'Algorithm',      value: 'Prophet (FB)' },
          { icon:'📅', label:'Forecast Window', value: '7 Days' },
        ].map(item => (
          <div className="model-info-card" key={item.label}>
            <div className="model-info-card__icon">{item.icon}</div>
            <div>
              <div className="model-info-card__label">{item.label}</div>
              <div className="model-info-card__value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-card">
        <div className="ai-card__title">🔁 Retrain Models</div>
        <p style={{fontSize:14,color:'var(--text-secondary)',marginBottom:20}}>
          Retraining updates predictions using your latest sales data. 
          Run this after adding new products or every few days for best accuracy.
        </p>
        <button className="ai-train-btn" onClick={handleTrain} disabled={training}>
          {training ? '⏳ Training...' : '🚀 Train Now'}
        </button>
        {trainMsg && (
          <div style={{marginTop:16,padding:'12px 16px',borderRadius:8,background:'var(--bg-secondary)',fontSize:14,fontWeight:500}}>
            {trainMsg}
          </div>
        )}
      </div>

      <div className="ai-card">
        <div className="ai-card__title">ℹ️ How It Works</div>
        <div style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.8}}>
          <p>🔹 <strong>Data:</strong> Uses your real sales history from the database.</p>
          <p>🔹 <strong>Sample data:</strong> If real data is limited (&lt;14 days), synthetic data fills the gap.</p>
          <p>🔹 <strong>Algorithm:</strong> Facebook Prophet — detects weekly seasonality and trends.</p>
          <p>🔹 <strong>Auto-improve:</strong> As you record more sales, predictions become more accurate.</p>
          <p>🔹 <strong>Reorder logic:</strong> Days of stock = current stock ÷ daily average demand.</p>
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
        <div className="ai-header__left">
          <h1>🤖 AI Predict</h1>
          <p>Demand forecasting and restock recommendations powered by Prophet ML</p>
        </div>
      </div>

      <div className="ai-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'restock'  && <RestockAlerts />}
      {activeTab === 'forecast' && <DemandForecast />}
      {activeTab === 'trends'   && <TrendAnalysis />}
      {activeTab === 'model'    && <ModelInfo />}
    </div>
  );
}