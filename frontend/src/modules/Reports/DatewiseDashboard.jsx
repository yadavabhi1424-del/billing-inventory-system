// DatewiseDashboard.jsx — Detailed date-wise KPIs + Peak Hour + Transactions + Export
import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import Icon from '../../components/Icon';
import { getDetailedSalesReport, getTransactionById } from '../../services/api';
import '../billing/Transactions.css';

const fmt      = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtShort = (n) => {
  n = parseFloat(n || 0);
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(0) + 'K';
  return '₹' + n.toFixed(0);
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
const fmtHour = (h) => {
  if (h === undefined) return '';
  const ap = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 || 12;
  return `${hr}${ap}`;
};

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const STATUS_COLOR = { COMPLETED: 'var(--color-success)', RETURNED: 'var(--color-danger)', CANCELLED: 'var(--color-text-muted)' };

// CSV export
const exportCSV = (transactions) => {
  if (!transactions.length) return;
  const headers = ['Invoice','Date','Time','Customer','Amount','Payment','Status','Discount','Tax'];
  const rows = transactions.map(t => [
    t.invoiceNumber, fmtDate(t.createdAt), fmtTime(t.createdAt),
    t.customerName || 'Walk-in', t.totalAmount, t.paymentMethod,
    t.status, t.discountAmount || 0, t.taxAmount || 0,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `sales_report_${getLocalDateStr()}.csv`;
  a.click();
};

// PDF export helper
const exportPDF = async (ref) => {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF }       = await import('jspdf');
    const canvas = await html2canvas(ref.current, { scale: 1.5, useCORS: true, backgroundColor: null });
    const img    = canvas.toDataURL('image/png');
    const pdf    = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 1.5, canvas.height / 1.5] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width / 1.5, canvas.height / 1.5);
    pdf.save(`sales_report_${getLocalDateStr()}.pdf`);
  } catch (e) {
    console.error('PDF export failed:', e);
  }
};

const PAYMENT_COLORS = { CASH: '#22c55e', UPI: '#6366f1', CARD: '#06b6d4', CREDIT: '#f59e0b', OTHER: '#94a3b8' };

const PeakTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="sr-chart-tooltip">
      <div className="sr-chart-tooltip__label">{fmtHour(payload[0]?.payload?.hour)}</div>
      <div className="sr-chart-tooltip__value">{payload[0]?.payload?.transactionCount} txns</div>
      <div className="sr-chart-tooltip__sub">{fmtShort(payload[0]?.value)}</div>
    </div>
  );
};

const PAGE_SIZE = 10;

export default function DatewiseDashboard({ filters }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [showPagination, setShowPagination] = useState(false);
  const [pdfBusy,     setPdfBusy]     = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);   // for detail modal
  const [detailLoad,  setDetailLoad]  = useState(false);
  const printRef = useRef(null);

  useEffect(() => { setPage(1); setShowPagination(false); fetchData(); }, [filters]);

  const buildParams = () => {
    if (filters.period === 'custom' && filters.startDate && filters.endDate)
      return { startDate: filters.startDate, endDate: filters.endDate };
    
    if (filters.period === 'today') {
      const today = getLocalDateStr();
      return { startDate: today, endDate: today };
    }
    
    if (filters.period === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateStr(y);
      return { startDate: yStr, endDate: yStr };
    }

    if (filters.period === 'week') {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      return { startDate: getLocalDateStr(w), endDate: getLocalDateStr() };
    }

    if (filters.period === 'month-pick' && filters.month)
      return { month: filters.month, year: filters.year || new Date().getFullYear() };
    
    return { period: filters.period };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getDetailedSalesReport(buildParams());
      if (res.success) setData(res.data);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const summary  = data?.summary        || {};
  const peak     = data?.peakHours      || [];
  const payment  = data?.byPaymentMethod || [];
  const txList   = data?.transactions   || [];
  const totalPay = payment.reduce((s, p) => s + parseFloat(p.total || 0), 0);

  const peakFilled = Array.from({ length: 24 }, (_, h) => {
    const found = peak.find(p => parseInt(p.hour) === h);
    return { hour: h, revenue: found ? parseFloat(found.revenue) : 0, transactionCount: found ? found.transactionCount : 0 };
  });
  const maxPeak = Math.max(...peakFilled.map(p => p.revenue), 1);

  const paged     = txList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(txList.length / PAGE_SIZE);

  const isProfit = parseFloat(summary.profit || 0) >= 0;

  const KPI_CARDS = [
    { label: 'Total Sales',      value: summary.totalTransactions || 0,   icon: 'billing',   bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
    { label: 'Items Sold',       value: Number(summary.totalItemsSold || 0).toLocaleString(), icon: 'box', bg: 'var(--color-cyan-soft)', color: 'var(--color-cyan)' },
    { label: 'Total Revenue',    value: fmt(summary.totalRevenue),         icon: 'reports',   bg: 'var(--color-success-soft)', color: 'var(--color-success)'        },
    { label: 'Total Cost',       value: fmt(summary.totalCost),            icon: 'inventory', bg: 'var(--color-violet-soft)', color: 'var(--color-violet)'         },
    { label: isProfit ? 'Profit' : 'Loss', value: fmt(Math.abs(summary.profit || 0)), icon: isProfit ? 'zigzagUp' : 'zigzagDown',
      bg: isProfit ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
      color: isProfit ? 'var(--color-success)' : 'var(--color-danger)'                                                        },
    { label: 'Discount Given',   value: fmt(summary.totalDiscount),        icon: 'minus',     bg: 'var(--color-warning-soft)', color: 'var(--color-warning)'        },
    { label: 'Tax Collected',    value: fmt(summary.totalTax),             icon: 'billing',   bg: 'var(--color-info-soft)',    color: 'var(--color-info)'           },
    { label: 'Returns (Count)',  value: `${summary.returnCount || 0} / ${fmt(summary.returnAmount)}`, icon: 'refresh', bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
    { label: 'Net Revenue',      value: fmt(summary.netRevenue),           icon: 'zigzagUp',  bg: 'var(--color-accent-soft)',  color: 'var(--color-accent-primary)' },
  ];

  const handlePdf = async () => {
    setPdfBusy(true);
    await exportPDF(printRef);
    setPdfBusy(false);
  };

  const handleViewDetail = async (txnId) => {
    if (!txnId) { alert("Error: Transaction ID is missing from this row."); return; }
    try {
      setDetailLoad(true);
      const res = await getTransactionById(txnId);
      if (res.success) setSelectedTxn(res.data);
      else alert("Failed to fetch details.");
    } catch (e) {
      console.error("Fetch detail error:", e.message);
      alert("Error fetching details: " + e.message);
    } finally {
      setDetailLoad(false);
    }
  };

  return (
    <div className="sr-datewise" ref={printRef}>
      {/* Header + export */}
      <div className="sr-dw-header">
        <div>
          <h3 className="report-section__title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 2 }}>Date-wise Report</h3>
          <p className="sr-section-sub">Detailed breakdown of all sales metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="report-export-btn report-export-btn--secondary" onClick={() => exportCSV(txList)}>
            <Icon name="download" size={15} /> CSV
          </button>
          <button className="report-export-btn" onClick={handlePdf} disabled={pdfBusy}>
            <Icon name="download" size={15} /> {pdfBusy ? 'Generating…' : 'PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="sr-loader" style={{ padding: '3rem' }}><div className="app-loading__spinner" /></div>
      ) : (
        <>
          {/* 9 KPI Cards */}
          <div className="sr-dw-cards">
            {KPI_CARDS.map(c => (
              <div key={c.label} className="report-stat-card sr-dw-card">
                <div className="report-stat-card__icon" style={{ background: c.bg, color: c.color, width: 44, height: 44 }}>
                  <Icon name={c.icon} size={18} />
                </div>
                <div className="report-stat-card__content">
                  <span className="report-stat-card__label">{c.label}</span>
                  <span className="report-stat-card__value" style={{ fontSize: '1.1rem' }}>{c.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="sr-dw-charts">
            {/* Peak Sales Hour */}
            <div className="report-section" style={{ flex: 2 }}>
              <h4 className="report-section__title">Peak Sales Hours</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={peakFilled} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="hour" tickFormatter={fmtHour}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} interval={2} />
                  <YAxis tickFormatter={fmtShort} width={48} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                  <Tooltip content={<PeakTooltip />} cursor={{ fill: 'var(--color-bg-overlay)' }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={20}>
                    {peakFilled.map((entry, i) => {
                      const intensity = entry.revenue / maxPeak;
                      return <Cell key={i} fill={`rgba(99,102,241,${0.2 + intensity * 0.8})`} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Breakdown */}
            <div className="report-section" style={{ flex: 1 }}>
              <h4 className="report-section__title">Payment Breakdown</h4>
              <div className="payment-breakdown-list">
                {payment.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No data</p>
                ) : payment.map(p => {
                  const pct = totalPay > 0 ? ((parseFloat(p.total) / totalPay) * 100).toFixed(1) : 0;
                  const col = PAYMENT_COLORS[p.paymentMethod] || '#94a3b8';
                  return (
                    <div key={p.paymentMethod} className="payment-breakdown-item">
                      <div className="payment-breakdown-item__info">
                        <span className="payment-breakdown-item__method">{p.paymentMethod}</span>
                        <span className="payment-breakdown-item__amount">{fmt(p.total)}</span>
                      </div>
                      <div className="payment-breakdown-item__bar">
                        <div className="payment-breakdown-item__bar-fill" style={{ width: `${pct}%`, background: col }} />
                      </div>
                      <span className="payment-breakdown-item__percentage">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="report-section">
            <div className="sr-section-header" style={{ marginBottom: 'var(--space-3)' }}>
              <h4 className="report-section__title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                Transactions ({txList.length})
              </h4>
            </div>
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Discount</th>
                    <th style={{ textAlign: 'right' }}>Tax</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No transactions</td></tr>
                  ) : paged.map((t, i) => (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer' }}
                      title="Click to view transaction details"
                      onClick={() => handleViewDetail(t.transaction_id || t.id)}
                    >
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-accent-primary)' }}>{t.invoiceNumber}</span></td>
                      <td><span className="report-time">{fmtDate(t.createdAt)}</span></td>
                      <td><span className="report-time">{fmtTime(t.createdAt)}</span></td>
                      <td><span className="report-product-name">{t.customerName || <span style={{ color: 'var(--color-text-muted)' }}>Walk-in</span>}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-amount">{fmt(t.totalAmount)}</span></td>
                      <td><span className="sr-pay-badge">{t.paymentMethod}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{fmt(t.discountAmount || 0)}</span></td>
                      <td style={{ textAlign: 'right' }}><span className="report-qty">{fmt(t.taxAmount || 0)}</span></td>
                      <td>
                        <span className="report-status-badge" style={{
                          background: STATUS_COLOR[t.status] + '22',
                          color: STATUS_COLOR[t.status]
                        }}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination / Expand */}
            {!showPagination && totalPages > 1 ? (
              <div className="sr-expand-row" style={{ marginTop: 'var(--space-4)' }}>
                <button className="sr-expand-btn" onClick={() => setShowPagination(true)}>
                  <Icon name="plus" size={14} /> Show More Transactions
                </button>
              </div>
            ) : showPagination && totalPages > 1 ? (
              <div className="sr-pagination">
                <button className="sr-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                <span className="sr-page-info">Page {page} of {totalPages}</span>
                <button className="sr-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Loading overlay */}
      {detailLoad && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="app-loading__spinner" />
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="txn-modal-backdrop" onClick={() => setSelectedTxn(null)}>
          <div className="txn-modal" onClick={e => e.stopPropagation()}>
            <div className="txn-modal__header">
              <h2>Transaction Details</h2>
              <button className="txn-modal__close" onClick={() => setSelectedTxn(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="txn-modal__body">
              <div className="txn-modal__info-cards">
                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Transaction Info</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">ID:</span><span className="txn-modal__card-value">{selectedTxn.invoiceNumber}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Status:</span><span className="txn-modal__status-badge">{selectedTxn.status || 'COMPLETED'}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Date:</span><span className="txn-modal__card-value">{new Date(selectedTxn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Time:</span><span className="txn-modal__card-value">{new Date(selectedTxn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
                  </div>
                </div>
                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Customer Info</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Name:</span><span className="txn-modal__card-value">{selectedTxn.customerName || 'Walk-in Customer'}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Phone:</span><span className="txn-modal__card-value">{selectedTxn.customerPhone || 'N/A'}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Type:</span><span className="txn-modal__card-value">{selectedTxn.customerName ? 'Registered' : 'Walk-in'}</span></div>
                  </div>
                </div>
                <div className="txn-modal__card">
                  <div className="txn-modal__card-title">Performed By</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">User:</span><span className="txn-modal__card-value">{selectedTxn.cashierName || 'Unknown'}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Role:</span><span className="txn-modal__card-value">Cashier</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Method:</span><span className="txn-modal__card-value">{selectedTxn.paymentMethod}</span></div>
                  </div>
                </div>
              </div>

              <div className="txn-modal__table-wrapper">
                <table className="txn-modal__table">
                  <thead><tr>
                    <th>Product Name</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Discount</th>
                    <th style={{ textAlign: 'right' }}>Tax</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr></thead>
                  <tbody>
                    {selectedTxn.items?.map((item, i) => (
                      <tr key={item.item_id || i}>
                        <td>{item.productName}</td>
                        <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.sellingPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.discountAmount || 0)}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.taxAmount || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(item.totalAmount)}</td>
                      </tr>
                    ))}
                    <tr className="txn-modal__table-total-row">
                      <td colSpan="5" style={{ textAlign: 'right' }}>Total:</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(selectedTxn.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="txn-modal__bottom">
                <div className="txn-modal__payment-card">
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 12 }}>Payment Details</div>
                  <div className="txn-modal__card-list">
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Method:</span><span className="txn-modal__card-value">{selectedTxn.paymentMethod}</span></div>
                    <div className="txn-modal__card-row"><span className="txn-modal__card-label">Status:</span><span className="txn-modal__card-value">{selectedTxn.paymentStatus}</span></div>
                  </div>
                </div>
                <div className="txn-modal__summary">
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Summary</div>
                  <div className="txn-modal__summary-row"><span>Order Total:</span><span className="txn-modal__summary-val">{fmt(selectedTxn.subtotal)}</span></div>
                  <div className="txn-modal__summary-row"><span>Discount:</span><span className="txn-modal__summary-val">{fmt(selectedTxn.discountAmount)}</span></div>
                  <div className="txn-modal__summary-row"><span>Tax:</span><span className="txn-modal__summary-val">{fmt(selectedTxn.taxAmount)}</span></div>
                  <div className="txn-modal__summary-total"><span>Final Amount:</span><span>{fmt(selectedTxn.totalAmount)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
