// ============================================================
//  Payment.jsx — POS Module (Generate Bills)
//  StockSense Pro — Connected to Backend
// ============================================================

import { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import { getProducts, createTransaction, getShopProfile, getMe, getB2BOrderById, updateB2BOrderStatus, getTransactions } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { STORE_INFO } from './paymentData';
import './Payment.css';

// ── Helpers ──────────────────────────────────────────────────
const fmt   = (n) => '₹' + Number(n).toFixed(2);
const today = () => new Date().toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

// ── GST Breakdown ────────────────────────────────────────────
function getGSTBreakdown(taxableAmount, rate) {
  const total = (taxableAmount * rate) / 100;
  return { cgst: total / 2, sgst: total / 2 };
}

// ══════════════════════════════════════════════════════════
//  INVOICE MODAL
// ══════════════════════════════════════════════════════════
function InvoiceModal({ invoice, onClose, shopInfo }) {
  return (
    <div className="invoice-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="invoice-modal">

        {/* Actions */}
        <div className="invoice-modal__actions">
          <button className="invoice-action-btn" onClick={() => window.print()}>
            <Icon name="billing" size={15} /> Print Bill
          </button>
          <button className="invoice-action-btn invoice-action-btn--close" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Invoice */}
        <div className="invoice">
          <div className="invoice__header">
            <div>
              <div className="invoice__store-name">{shopInfo?.name}</div>
              <div className="invoice__store-details">
                {shopInfo?.address}<br />
                {shopInfo?.phone && <>Ph: {shopInfo.phone} · </>}{shopInfo?.email}<br />
                {shopInfo?.gstin && <>GSTIN: {shopInfo.gstin}</>}
              </div>
            </div>
            <div className="invoice__meta">
              <div className="invoice__number">TAX INVOICE</div>
              <div className="invoice__number" style={{ fontSize: '0.9rem', marginTop: 4 }}>{invoice.no}</div>
              <div className="invoice__date">{invoice.date}</div>
            </div>
          </div>

          <div className="invoice__customer-section">
            <div className="invoice__customer-label">Bill To</div>
            <div className="invoice__customer-name">{invoice.customer.name}</div>
            {invoice.customer.phone && (
              <div className="invoice__customer-phone">{invoice.customer.phone}</div>
            )}
          </div>

          <table className="invoice__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>GST%</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={item.product_id}>
                  <td>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{item.sku}</div>
                  </td>
                  <td>{item.taxRate || item.tax_rate || 0}%</td>
                  <td style={{ textAlign: 'right' }}>{parseInt(item.qty) || 1}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.sellingPrice)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {fmt(item.sellingPrice * (parseInt(item.qty) || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="invoice__totals">
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">Subtotal</span>
                <span className="invoice__totals-value">{fmt(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="invoice__totals-row">
                  <span className="invoice__totals-label">Discount</span>
                  <span className="invoice__totals-value" style={{ color: '#22c55e' }}>
                    - {fmt(invoice.discount)}
                  </span>
                </div>
              )}
              <div className="invoice__totals-divider" />
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">Taxable Amount</span>
                <span className="invoice__totals-value">{fmt(invoice.taxable)}</span>
              </div>
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">CGST</span>
                <span className="invoice__totals-value">{fmt(invoice.cgst)}</span>
              </div>
              <div className="invoice__totals-row">
                <span className="invoice__totals-label">SGST</span>
                <span className="invoice__totals-value">{fmt(invoice.sgst)}</span>
              </div>
              <div className="invoice__totals-divider" />
              <div className="invoice__grand-total">
                <span className="invoice__grand-total-label">TOTAL</span>
                <span className="invoice__grand-total-value">{fmt(invoice.total)}</span>
              </div>
              <div className="invoice__totals-row" style={{ marginTop: 8 }}>
                <span className="invoice__totals-label">Payment</span>
                <span className="invoice__totals-value">{invoice.paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="invoice__footer">
            Thank you for shopping with us! · Goods once sold will not be taken back.<br />
            This is a computer generated invoice.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scan Toast ────────────────────────────────────────────────
function ScanToast({ product, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="scan-toast">
      <Icon name="check" size={16} />
      <span>Added: {product.name}</span>
    </div>
  );
}

const ITEMS_PER_PAGE = 16;

// ══════════════════════════════════════════════════════════
//  MAIN PAYMENT / POS COMPONENT
// ══════════════════════════════════════════════════════════
export default function Payment({ user }) {
  const [products,      setProducts]      = useState([]);
  const [sortedProducts, setSortedProducts] = useState([]);
  const [page,          setPage]          = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [search,        setSearch]        = useState('');
  const [cart,          setCart]          = useState([]);
  const [discountType,  setDiscountType]  = useState('%');
  const [discountVal,   setDiscountVal]   = useState('');
  const [payMethod,     setPayMethod]     = useState('cash');
  const [invoice,       setInvoice]       = useState(null);
  const [scanToast,     setScanToast]     = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [invoiceNo,     setInvoiceNo]     = useState('INV-...');
  const [shopInfo,      setShopInfo]      = useState(STORE_INFO);
  const [b2bOrderId,    setB2BOrderId]    = useState(null);
  const [b2bOriginalItems, setB2bOriginalItems] = useState([]);

  const searchInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Handle incoming B2B Order ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oid = params.get('order_id');
    if (oid) {
      setB2BOrderId(oid);
      fetchB2BOrder(oid);
    }
  }, [location]);

  // ── Hydrate B2B cart tax rates from local products ─────────
  useEffect(() => {
    if (b2bOrderId && products.length > 0 && cart.length > 0) {
      const hasZeroTax = cart.some(item => Number(item.taxRate || 0) === 0);
      if (hasZeroTax) {
        setCart(prev => prev.map(item => {
          if (Number(item.taxRate || 0) === 0) {
            const local = products.find(p => 
              (p.product_id && item.product_id && p.product_id === item.product_id) || 
              (p.sku && item.sku && p.sku === item.sku)
            );
            if (local && local.taxRate) return { ...item, taxRate: local.taxRate };
          }
          return item;
        }));
      }
    }
  }, [products, b2bOrderId, cart.length]);

  const fetchB2BOrder = async (id) => {
    try {
      const res = await getB2BOrderById(id);
      if (res.success && res.data) {
        const order = res.data;
        setCustomerName(order.shop_name);
        setCustomerPhone(order.shop_phone || '');
        
        // Map B2B items to POS cart structure
        const mappedItems = order.items.map(item => ({
          product_id:   item.product_id, 
          name:         item.name,
          sku:          item.sku,
          sellingPrice: Number(item.price),
          qty:          item.qty,
          taxRate:      Number(item.taxRate || 0) || Number(item.tax_rate || 0) || 0,
        }));
        setCart(mappedItems);
        setB2bOriginalItems(order.items);
      }
    } catch (err) {
      console.error("Failed to load B2B order", err);
    }
  };

  // ── Load popular products on mount ─────────────────────────
  useEffect(() => {
    loadProducts();
    loadShopProfile();
  }, []);

  const loadShopProfile = async () => {
    try {
      const [profileRes, meRes] = await Promise.all([getShopProfile(), getMe()]);
      console.log('[Payment] shopProfile response:', profileRes);
      const p = profileRes?.data || {};
      const u = meRes?.data || {};
      setShopInfo({
        name:    p.shop_name || STORE_INFO.name,
        address: p.address   || STORE_INFO.address,
        gstin:   p.gstin     || STORE_INFO.gstin,
        phone:   u.phone     || STORE_INFO.phone,
        email:   u.email     || STORE_INFO.email,
      });
    } catch (err) {
      console.error('[Payment] shopProfile error:', err.message);
    }
  };

  const loadProducts = async () => {
    try {
      // Fetch all active products
      const res = await getProducts({ limit: 500, isActive: 'true' });
      if (!res.success) return;
      const allProducts = res.data;
      setProducts(allProducts);

      // Fetch recent transactions to determine sort order
      try {
        const txRes = await getTransactions({ limit: 50 });
        if (txRes.success && txRes.data?.length > 0) {
          // Build ordered list of product_ids from most recent transactions
          const seen = new Set();
          const recentIds = [];
          for (const tx of txRes.data) {
            if (Array.isArray(tx.items)) {
              for (const item of tx.items) {
                const pid = item.product_id || item.productId;
                if (pid && !seen.has(pid)) {
                  seen.add(pid);
                  recentIds.push(pid);
                }
              }
            }
          }
          // Sort: recently transacted first, then rest alphabetically
          const sorted = [...allProducts].sort((a, b) => {
            const ai = recentIds.indexOf(a.product_id);
            const bi = recentIds.indexOf(b.product_id);
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1;
            if (bi >= 0) return 1;
            return a.name.localeCompare(b.name);
          });
          setSortedProducts(sorted);
        } else {
          setSortedProducts(allProducts);
        }
      } catch {
        setSortedProducts(allProducts);
      }
    } catch (err) {
      console.error('Products load error:', err.message);
    }
  };

  // ── Search products (debounced) ─────────────────────────────
  useEffect(() => {
    if (search.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await getProducts({ search: search.trim(), limit: 8 });
        if (res.success) setSearchResults(res.data);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Auto-focus search ───────────────────────────────────────
  useEffect(() => {
    const handleFocus = (e) => {
      const billPanel = document.querySelector('.bill-panel');
      if (searchInputRef.current && !invoice && !billPanel?.contains(e.target)) {
        searchInputRef.current.focus();
      }
    };
    document.addEventListener('click', handleFocus);
    return () => document.removeEventListener('click', handleFocus);
  }, [invoice]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') { e.preventDefault(); handleNewBill(); }
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0 && customerName.trim()) handleGenerateBill();
      }
      if (e.key === 'Escape' && invoice) handleNewBill();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerName, invoice]);

  // ── Barcode scanner (Enter key) ─────────────────────────────
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      const exact = searchResults.find(
        p => p.sku.toLowerCase() === search.trim().toLowerCase()
      );
      if (exact) {
        addToCart(exact, true);
      } else if (searchResults.length > 0) {
        addToCart(searchResults[0], true);
      }
    }
  };

  // ── Cart operations ─────────────────────────────────────────
  const addToCart = (product, showToast = false) => {
    setCart(prev => {
      const exists = prev.find(i => i.product_id === product.product_id);
      if (exists) {
        return prev.map(i =>
          i.product_id === product.product_id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setSearch('');
    setSearchResults([]);
    if (showToast) setScanToast(product);
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(i => {
           if (i.product_id === id) {
             const currentQty = parseInt(i.qty) || 0;
             return { ...i, qty: Math.max(0, currentQty + delta) };
           }
           return i;
        })
        .filter(i => i.qty > 0)
    );
  };

  const handleManualQty = (id, val) => {
    const newQty = val === '' ? '' : parseInt(val, 10);
    if (val !== '' && isNaN(newQty)) return;
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, qty: newQty } : i));
  };

  const handleQtyBlur = (id) => {
    setCart(prev =>
      prev
        .map(i => i.product_id === id && (i.qty === '' || i.qty <= 0) ? { ...i, qty: 0 } : i)
        .filter(i => i.qty > 0)
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.product_id !== id));

  const applyQuickDiscount = (percent) => {
    setDiscountType('%');
    setDiscountVal(String(percent));
  };

  // ── Calculations ────────────────────────────────────────────
  const subtotal    = cart.reduce((sum, i) => sum + i.sellingPrice * (parseInt(i.qty) || 0), 0);
  const discountAmt = discountVal
    ? discountType === '%'
      ? (subtotal * parseFloat(discountVal)) / 100
      : parseFloat(discountVal)
    : 0;
  const taxable = Math.max(subtotal - discountAmt, 0);

  const gstGroups = cart.reduce((acc, item) => {
    // Priority: local hydrated taxRate > master tax_rate > 0
    const rateValue = Number(item.taxRate) || Number(item.tax_rate) || 0;
    const key = rateValue.toString();
    if (!acc[key]) acc[key] = 0;
    acc[key] += Number(item.sellingPrice || 0) * (parseInt(item.qty) || 0);
    return acc;
  }, {});

  let totalCGST = 0, totalSGST = 0;
  Object.entries(gstGroups).forEach(([rate, amount]) => {
    const taxableForGroup = amount * (taxable / subtotal || 0);
    const { cgst, sgst } = getGSTBreakdown(taxableForGroup, Number(rate));
    totalCGST += cgst;
    totalSGST += sgst;
  });

  const grandTotal = taxable + totalCGST + totalSGST;

  // ── Generate Bill ───────────────────────────────────────────
  const handleGenerateBill = async () => {
    if (!customerName.trim()) return alert('Please enter customer name');
    if (cart.length === 0)    return alert('Please add items to the bill');
    
    if (customerPhone && customerPhone.length !== 10) {
      return alert('Phone number must be exactly 10 digits.');
    }

    // [CAUTION] B2B Quantity Validation
    if (b2bOrderId && b2bOriginalItems.length > 0) {
      const mismatches = [];
      b2bOriginalItems.forEach(orig => {
        const inCart = cart.find(c => c.product_id === orig.product_id);
        const cartQty = inCart ? (parseInt(inCart.qty) || 0) : 0;
        if (cartQty !== orig.qty) {
          mismatches.push(`• ${orig.name}: Requested ${orig.qty}, Billing ${cartQty}`);
        }
      });

      if (mismatches.length > 0) {
        const confirmMsg = `CAUTION: Billing quantities differ from the B2B Order request:\n\n${mismatches.join('\n')}\n\nDo you want to proceed with this bill anyway?`;
        if (!window.confirm(confirmMsg)) return;
      }
    }

    try {
      setSubmitting(true);

      const transactionData = {
        customerId:    null,
        paymentMethod: payMethod.toUpperCase(),
        discountType:  discountType === '%' ? 'PERCENT' : 'FIXED',
        discountValue: parseFloat(discountVal) || 0,
        amountPaid:    grandTotal,
        notes:         `Customer: ${customerName}${customerPhone ? ' | Ph: ' + customerPhone : ''}`,
        items: cart.map(item => ({
          productId:    item.product_id,
          quantity:     parseInt(item.qty) || 1,
          sellingPrice: item.sellingPrice,
        })),
      };

      const res = await createTransaction(transactionData);

      if (res.success) {
        // If this was a B2B order fulfillment, mark it as BILLED and sync updated quantities
        if (b2bOrderId) {
          try {
            const updated_items = cart.map(item => ({
              product_id: item.product_id,
              qty: parseInt(item.qty) || 0, // Allow 0 for explicitly zeroed out items
            }));
            
            // Allow explicit rejection of missing items
            for (const orig of b2bOriginalItems) {
              if (!cart.find(c => c.product_id === orig.product_id)) {
                updated_items.push({ product_id: orig.product_id, qty: 0 });
              }
            }
            
            await updateB2BOrderStatus(b2bOrderId, 'BILLED', null, updated_items);
          } catch (err) {
            console.error("Failed to update B2B order status:", err);
          }
        }

        setInvoiceNo(res.data.invoiceNumber);
        const invoiceData = {
          no:            res.data.invoiceNumber,
          date:          today(),
          customer:      { name: customerName, phone: customerPhone },
          items:         cart,
          subtotal,
          discount:      discountAmt,
          taxable,
          cgst:          totalCGST,
          sgst:          totalSGST,
          total:         res.data.totalAmount,
          paymentMethod: payMethod.toUpperCase(),
        };
        setInvoice(invoiceData);
      }
    } catch (err) {
      alert('Error generating bill: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── New Bill ────────────────────────────────────────────────
  const handleNewBill = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountVal('');
    setInvoice(null);
    setPayMethod('cash');
    setInvoiceNo('INV-...');
    setB2BOrderId(null);
    setB2bOriginalItems([]);
    // Clear URL params
    navigate('/billing', { replace: true });
  };

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="payment-pos">

      {/* Header */}
      <div className="pos-header">
        <h1>New Bill</h1>
        <div className="pos-header__right">
          <span className="pos-invoice-no">{invoiceNo}</span>
          <div className="pos-shortcuts">
            <span className="pos-shortcut">F2</span> New
            <span className="pos-shortcut">F12</span> Generate
          </div>
          <button className="pos-new-btn" onClick={handleNewBill}>
            <Icon name="billing" size={15} /> Clear
          </button>
        </div>
      </div>

      <div className="pos-grid">

        {/* ── LEFT: Products ─────────────────────────── */}
        <div className="pos-products">

          {/* Search */}
          <div className="pos-search">
            <span className="pos-search__icon"><Icon name="search" size={16} /></span>
            <input
              ref={searchInputRef}
              className="pos-search__input"
              placeholder="Search by name or scan barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <span className="pos-search__barcode-icon" title="Barcode scanner ready">
              <Icon name="box" size={16} />
            </span>

            {searchResults.length > 0 && (
              <div className="pos-search__results">
                {searchResults.map(p => (
                  <div key={p.product_id} className="pos-search__result-item" onClick={() => addToCart(p)}>
                    <div>
                      <div className="pos-search__result-name">{p.name}</div>
                      <div className="pos-search__result-sku">{p.sku} · Stock: {p.stock}</div>
                    </div>
                    <div className="pos-search__result-price">₹{p.sellingPrice}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product cards with pagination */}
          {(() => {
            const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
            const pageItems  = sortedProducts.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            return (
              <>
                <div className="pos-products__grid">
                  {sortedProducts.length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                      No products found. Add products in Inventory first.
                    </div>
                  ) : pageItems.map(p => (
                    <div
                      key={p.product_id}
                      className="product-card"
                      onClick={() => p.stock > 0 && addToCart(p)}
                      style={{ opacity: p.stock === 0 ? 0.5 : 1, cursor: p.stock === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      <span
                        className={`product-card__badge product-card__badge--${
                          p.stock === 0 ? 'danger' : p.stock <= p.minStockLevel ? 'warning' : 'success'
                        }`}
                        title={p.stock === 0 ? 'Out of Stock' : p.stock <= p.minStockLevel ? 'Low Stock' : 'In Stock'}
                        style={{ padding: '0.25rem 0.5rem', minWidth: 'unset', fontSize: '0.8rem' }}
                      >
                        {p.stock === 0 ? '✕' : p.stock <= p.minStockLevel ? '⚠' : '✓'}
                      </span>
                      <div className="product-card__name">{p.name}</div>
                      <div className="product-card__sku">{p.sku}</div>
                      <div className="product-card__price">₹{p.sellingPrice}</div>
                    </div>
                  ))}
                </div>

                {/* Pagination bar */}
                {totalPages > 1 && (
                  <div className="pos-pagination">
                    <button
                      className="pos-page-btn"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >‹ Prev</button>

                    <div className="pos-page-numbers">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          className={`pos-page-dot ${page === i ? 'is-active' : ''}`}
                          onClick={() => setPage(i)}
                        >{i + 1}</button>
                      ))}
                    </div>

                    <button
                      className="pos-page-btn"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >Next ›</button>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* ── RIGHT: Bill Panel ──────────────────────── */}
        <div className="bill-panel">

          <div className="bill-panel__header">
            <span className="bill-panel__title">Bill Summary</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{invoiceNo}</span>
          </div>

          {/* Customer */}
          <div className="bill-customer">
            <div className="bill-customer__field">
              <div className="bill-customer__header">
                <label className="bill-customer__label">Customer *</label>
                <button 
                  className="bill-customer__quick-fill"
                  onClick={() => setCustomerName('Walk-in')}
                  title="Quick fill Walk-in"
                >
                  <Icon name="check" size={10} /> Walk-in
                </button>
              </div>
              <input
                className="bill-customer__input"
                placeholder="Walk-in / Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div className="bill-customer__field">
              <label className="bill-customer__label">Phone (optional)</label>
              <input
                className="bill-customer__input"
                placeholder="10-digit number"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="bill-items">
            {cart.length === 0 ? (
              <div className="bill-empty">Add products from left</div>
            ) : cart.map(item => (
              <div key={item.product_id} className="bill-item">
                <div className="bill-item__info">
                  <div className="bill-item__name">{item.name}</div>
                  <div className="bill-item__price">₹{item.sellingPrice} × {item.qty}</div>
                </div>
                <div className="bill-item__qty">
                  <button className="bill-item__qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                  <input
                    className="bill-item__qty-input"
                    value={item.qty}
                    onChange={(e) => handleManualQty(item.product_id, e.target.value)}
                    onBlur={() => handleQtyBlur(item.product_id)}
                    style={{
                      width: '40px', textAlign: 'center', background: 'transparent',
                      border: '1px solid var(--border-color)', color: 'inherit',
                      borderRadius: '4px', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                  <button className="bill-item__qty-btn" onClick={() => updateQty(item.product_id, +1)}>+</button>
                </div>
                <span className="bill-item__total">{fmt(item.sellingPrice * (parseInt(item.qty) || 0))}</span>
                <button className="bill-item__remove" onClick={() => removeItem(item.product_id)}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bill-totals">
            <div className="bill-totals__row">
              <span className="bill-totals__label">Subtotal ({cart.length} items)</span>
              <span className="bill-totals__value">{fmt(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="bill-totals__row">
              <span className="bill-totals__label">Discount</span>
              <div className="bill-discount">
                <div className="bill-discount__type">
                  {['%', '₹'].map(t => (
                    <button
                      key={t}
                      className={`bill-discount__type-btn ${discountType === t ? 'bill-discount__type-btn--active' : ''}`}
                      onClick={() => setDiscountType(t)}
                    >{t}</button>
                  ))}
                </div>
                <input
                  className="bill-discount__input"
                  placeholder="0"
                  value={discountVal}
                  onChange={e => setDiscountVal(e.target.value)}
                />
              </div>
            </div>

            {/* Quick discount buttons */}
            <div className="quick-discount-btns">
              {[5, 10, 15, 20].map(pct => (
                <button key={pct} className="quick-discount-btn" onClick={() => applyQuickDiscount(pct)}>
                  {pct}%
                </button>
              ))}
            </div>

            {discountAmt > 0 && (
              <div className="bill-totals__row">
                <span className="bill-totals__label">Discount Amount</span>
                <span className="bill-totals__value" style={{ color: 'var(--color-success)' }}>
                  - {fmt(discountAmt)}
                </span>
              </div>
            )}

            <div className="bill-totals__row">
              <span className="bill-totals__label">Taxable Amount</span>
              <span className="bill-totals__value">{fmt(taxable)}</span>
            </div>
            <div className="bill-totals__row">
              <span className="bill-totals__label">CGST</span>
              <span className="bill-totals__value">{fmt(totalCGST)}</span>
            </div>
            <div className="bill-totals__row">
              <span className="bill-totals__label">SGST</span>
              <span className="bill-totals__value">{fmt(totalSGST)}</span>
            </div>
          </div>

          {/* Grand total */}
          <div className="bill-grand-total">
            <span className="bill-grand-total__label">Total</span>
            <span className="bill-grand-total__value">{fmt(grandTotal)}</span>
          </div>

          {/* Payment method */}
          <div>
            <div style={{
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-2)'
            }}>
              Payment Method
            </div>
            <div className="bill-payment">
              {['Cash', 'Card', 'UPI'].map(m => (
                <button
                  key={m}
                  className={`bill-payment__btn ${payMethod === m.toLowerCase() ? 'bill-payment__btn--active' : ''}`}
                  onClick={() => setPayMethod(m.toLowerCase())}
                >{m}</button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="bill-generate-btn"
            onClick={handleGenerateBill}
            disabled={cart.length === 0 || submitting}
          >
            <Icon name="check" size={16} />
            {submitting ? 'Processing...' : `Generate Bill - ${fmt(grandTotal)}`}
          </button>

        </div>
      </div>

      {/* Scan toast */}
      {scanToast && <ScanToast product={scanToast} onClose={() => setScanToast(null)} />}

      {/* Invoice modal */}
      {invoice && <InvoiceModal invoice={invoice} onClose={handleNewBill} shopInfo={shopInfo} />}

    </div>
  );
}