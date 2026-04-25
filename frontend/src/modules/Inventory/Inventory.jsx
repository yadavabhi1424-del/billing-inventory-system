// ============================================================
//  Inventory.jsx — Connected to Backend
//  StockSense Pro
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import {
  getProducts, createProduct, updateProduct,
  deleteProduct, getCategories, getSuppliers, createCategory, getNextSkuSeq,
  markB2BItemSynced, createSupplier
} from '../../services/api';
import './Inventory.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

const getStatus = (stock, min) =>
  stock === 0 ? 'out' : stock <= min ? 'low' : 'good';

// ══════════════════════════════════════════════════════════
//  PRODUCT FORM MODAL
// ══════════════════════════════════════════════════════════
function ProductFormModal({ 
  title, 
  product = null, 
  prefillData = null, 
  reviewQueueLength = 0,
  categories = [], 
  suppliers = [], 
  onClose, 
  onSave, 
  onSkip,
  onCategoriesUpdate,
  onSuppliersUpdate
}) {
  const isEdit = !!product;
  const user = JSON.parse(localStorage.getItem('stocksense_user') || '{}');
  const isSupplier = user?.userType === 'supplier';

  // When opened from a purchase order (prefillData present):
  //   - Edit mode: costPrice = order price (what was paid), stock = current + received qty
  //   - Add  mode: name / costPrice / stock / supplierId seeded from order
  const fromOrder = !!prefillData;
  const [form, setForm] = useState({
    name:          product?.name          || prefillData?.name      || '',
    sku:           product?.sku           || '',
    sellingPrice:  product?.sellingPrice  || '',
    costPrice:     fromOrder && prefillData?.costPrice
                     ? prefillData.costPrice
                     : (product?.costPrice || ''),
    stock:         isEdit && fromOrder
                     ? (Number(product?.stock || 0) + Number(prefillData?.quantity || 0))
                     : (product?.stock ?? prefillData?.quantity ?? ''),
    unit:          product?.unit          || 'pcs',
    taxRate:       product?.taxRate       || '0',
    minStockLevel: product?.minStockLevel || '',
    categoryId:    product?.category_id  || '',
    supplierId:    product?.supplier_id  || prefillData?.supplierId || '',
    barcode:       product?.barcode      || '',
    expiryDate:    product?.expiryDate?.split('T')[0] || '',
    is_public:     product?.is_public === 1 || product?.is_public === true || false,
    image: null,
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [predictedSku, setPredictedSku] = useState('Generating...');
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (!isEdit) {
      getNextSkuSeq().then(res => {
        if (res.success) {
          const seq = res.nextSeq || 1;
          const prefix = localStorage.getItem('ss_skuPrefix') || 'SKU';
          setPredictedSku(`${prefix}-${String(seq).padStart(3, '0')}`);
        }
      }).catch(err => {
        console.error('Failed to predict SKU:', err);
        setPredictedSku('Auto-generated upon save');
      });
    }
  }, [isEdit]);

  // Searchable select state
  const [catSearch, setCatSearch] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [supSearch, setSupSearch] = useState('');
  const [supOpen, setSupOpen] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [creatingSup, setCreatingSup] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [gstOpen, setGstOpen] = useState(false);
  const catRef = useRef(null);
  const supRef = useRef(null);
  const unitRef = useRef(null);
  const gstRef = useRef(null);

  // Debounced search values
  const [catDebounced, setCatDebounced] = useState('');
  const [supDebounced, setSupDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setCatDebounced(catSearch), 200); return () => clearTimeout(t); }, [catSearch]);
  useEffect(() => { const t = setTimeout(() => setSupDebounced(supSearch), 200); return () => clearTimeout(t); }, [supSearch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
      if (supRef.current && !supRef.current.contains(e.target)) setSupOpen(false);
      if (unitRef.current && !unitRef.current.contains(e.target)) setUnitOpen(false);
      if (gstRef.current && !gstRef.current.contains(e.target)) setGstOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredCats = categories.filter(c =>
    c.name.toLowerCase().includes(catDebounced.toLowerCase())
  );
  const filteredSups = suppliers.filter(s =>
    s.name.toLowerCase().includes(supDebounced.toLowerCase())
  );
  const selectedCat = categories.find(c => String(c.category_id) === String(form.categoryId));
  const selectedSup = suppliers.find(s => String(s.supplier_id) === String(form.supplierId));

  const handleCreateCategory = async () => {
    if (creatingCat) return;
    const name = catSearch.trim();
    if (!name) return;
    const clean = name.toLowerCase();
    if (categories.some(c => c.name.trim().toLowerCase() === clean)) return;
    setCreatingCat(true);
    try {
      const res = await createCategory({ name });
      if (!res.success) {
        alert('Failed to create category');
        return;
      }
      const newCat = res.data;
      onCategoriesUpdate(prev => [...prev, newCat]);
      set('categoryId', newCat.category_id);
      setCatSearch('');
      setCatOpen(false);
    } catch (err) {
      alert('Failed to create category: ' + err.message);
    } finally {
      setCreatingCat(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (creatingSup) return;
    const name = supSearch.trim();
    if (!name) return;
    const clean = name.toLowerCase();
    if (suppliers.some(s => s.name.trim().toLowerCase() === clean)) return;
    setCreatingSup(true);
    try {
      const res = await createSupplier({ 
        name, 
        phone: '0000000000',
        address: 'Manual Entry'
      });
      if (!res.success) {
        alert('Failed to create supplier');
        return;
      }
      const newSup = res.data;
      onSuppliersUpdate(prev => [...prev, newSup]);
      set('supplierId', newSup.supplier_id);
      setSupSearch('');
      setSupOpen(false);
    } catch (err) {
      alert('Failed to create supplier: ' + err.message);
    } finally {
      setCreatingSup(false);
    }
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image must be less than 2MB' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    set('image', file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.sellingPrice || form.sellingPrice <= 0) e.sellingPrice = 'Price must be greater than 0';
    if (form.stock === '' || form.stock < 0) e.stock = 'Stock cannot be negative';
    if (!form.minStockLevel && form.minStockLevel !== 0) e.minStockLevel = 'Min stock is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const cp = parseFloat(form.costPrice) || 0;
  const sp = parseFloat(form.sellingPrice) || 0;
  const hasLoss = cp > 0 && sp > 0 && sp < cp;
  const lossAmount = cp - sp;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (hasLoss) {
      if (!window.confirm(`Warning: Selling price (₹${sp}) is less than Cost price (₹${cp}). This results in a loss of ₹${lossAmount.toFixed(2)} per item.\n\nAre you sure you want to save?`)) {
        return;
      }
    }

    try {
      setSaving(true);
      // Use FormData for image upload
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== '') {
          if (k === 'is_public') {
            data.append(k, !!v); // boolean true/false
          } else {
            data.append(k, v);
          }
        }
      });
      if (!isEdit) {
        data.append('skuPrefix', localStorage.getItem('ss_skuPrefix') || 'SKU');
      }
      await onSave(data, form.image);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="product-form-modal-backdrop" onClick={onClose}>
      <div className="product-form-modal" onClick={e => e.stopPropagation()}>

        <div className="product-form-modal__header">
          <h3>{title}</h3>
          <button className="product-form-modal__close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {fromOrder && (
          <div className="prefill-notice">
            <Icon name="box" size={14} />
            <span>
              {isEdit
                ? `Fields pre-filled from purchase order — cost price & stock updated with received quantity (+${prefillData?.quantity}).`
                : 'Fields pre-filled from purchase order. Review and complete remaining details before saving.'}
            </span>
          </div>
        )}

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form__content">

            {/* Image Upload */}
            <div className="product-form__image-section">
              <label className="product-form__label">Product Image</label>
              <div className="product-form__image-upload">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                />
                <div
                  className="product-form__image-label"
                  onClick={() => imageInputRef.current && imageInputRef.current.click()}
                  style={{ cursor: 'pointer' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="product-form__image-preview" />
                  ) : (
                    <div className="product-form__image-placeholder">
                      <Icon name="box" size={32} />
                      <span>Click to upload image</span>
                      <span className="product-form__image-hint">Max 2MB (JPG, PNG)</span>
                    </div>
                  )}
                </div>
              </div>
              {errors.image && <span className="product-form__error">{errors.image}</span>}
            </div>

            <div className="product-form__grid">

              {/* Name */}
              <div className="product-form__field product-form__field--full">
                <label className="product-form__label">Product Name *</label>
                <input type="text" className={`product-form__input ${errors.name ? 'product-form__input--error' : ''}`}
                  placeholder="e.g." value={form.name}
                  onChange={e => set('name', e.target.value)} />
                {errors.name && <span className="product-form__error">{errors.name}</span>}
              </div>

              {/* SKU */}
              {isEdit ? (
                <div className="product-form__field">
                  <label className="product-form__label">SKU</label>
                  <input type="text" className="product-form__input"
                    value={form.sku} readOnly disabled style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted)' }} />
                  <span className="product-form__hint">SKU cannot be changed</span>
                </div>
              ) : (
                <div className="product-form__field">
                  <label className="product-form__label">SKU</label>
                  <input type="text" className="product-form__input"
                    value={predictedSku} readOnly disabled style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted)', fontStyle: 'italic' }} />
                  <span className="product-form__hint">Prefix can be changed in Settings &gt; Inventory</span>
                </div>
              )}

              {/* Barcode */}
              <div className="product-form__field">
                <label className="product-form__label">Barcode</label>
                <input type="text" className="product-form__input"
                  placeholder="Optional" value={form.barcode}
                  onChange={e => set('barcode', e.target.value)} />
              </div>

              {/* Category */}
              <div className={`product-form__field product-form__searchable-select ${catOpen ? 'is-open' : ''}`} ref={catRef}>
                <label className="product-form__label">Category *</label>
                <div
                  className={`product-form__input product-form__select-trigger ${errors.categoryId ? 'product-form__input--error' : ''}`}
                  onClick={() => { setCatOpen(o => !o); setCatSearch(''); }}
                >
                  <span className={selectedCat ? '' : 'product-form__select-placeholder'}>
                    {selectedCat ? selectedCat.name : 'Select category'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {catOpen && (
                  <div className="product-form__dropdown">
                    <input
                      className="product-form__dropdown-search"
                      placeholder="Search category..."
                      value={catSearch}
                      autoFocus
                      onChange={e => setCatSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="product-form__dropdown-list">
                      {filteredCats.map(c => (
                        <div key={c.category_id} className="product-form__dropdown-item"
                          onClick={() => { set('categoryId', c.category_id); setCatOpen(false); setCatSearch(''); }}>
                          {c.name}
                        </div>
                      ))}
                      {catSearch.trim() && !filteredCats.some(c => c.name.toLowerCase() === catSearch.toLowerCase()) && (
                        <div
                          className="product-form__dropdown-item product-form__dropdown-create"
                          onClick={handleCreateCategory}
                        >
                          {creatingCat ? 'Creating...' : `+ Create "${catSearch}"`}
                        </div>
                      )}
                      {filteredCats.length === 0 && !catSearch.trim() && (
                        <div className="product-form__dropdown-empty">No categories found</div>
                      )}
                    </div>
                  </div>
                )}
                {errors.categoryId && <span className="product-form__error">{errors.categoryId}</span>}
              </div>

              {/* Supplier */}
              <div className={`product-form__field product-form__searchable-select ${supOpen ? 'is-open' : ''}`} ref={supRef}>
                <label className="product-form__label">Supplier</label>
                <div
                  className="product-form__input product-form__select-trigger"
                  onClick={() => { setSupOpen(o => !o); setSupSearch(''); }}
                >
                  <span className={selectedSup ? '' : 'product-form__select-placeholder'}>
                    {selectedSup ? selectedSup.name : 'Select supplier'}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {supOpen && (
                  <div className="product-form__dropdown">
                    <input
                      className="product-form__dropdown-search"
                      placeholder="Search supplier..."
                      value={supSearch}
                      autoFocus
                      onChange={e => setSupSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="product-form__dropdown-list">
                      {filteredSups.map(s => (
                        <div key={s.supplier_id} className="product-form__dropdown-item"
                          onClick={() => { set('supplierId', s.supplier_id); setSupOpen(false); setSupSearch(''); }}>
                          {s.name}
                        </div>
                      ))}
                      {supSearch.trim() && !filteredSups.some(s => s.name.toLowerCase() === supSearch.toLowerCase()) && (
                        <div
                          className="product-form__dropdown-item product-form__dropdown-create"
                          onClick={handleCreateSupplier}
                        >
                          {creatingSup ? 'Creating...' : `+ Create "${supSearch}"`}
                        </div>
                      )}
                      {filteredSups.length === 0 && !supSearch.trim() && (
                        <div className="product-form__dropdown-empty">No suppliers found (leave empty if not applicable)</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selling Price */}
              <div className="product-form__field">
                <label className="product-form__label">Selling Price (₹) *</label>
                <input type="number" step="0.01"
                  className={`product-form__input ${errors.sellingPrice ? 'product-form__input--error' : hasLoss ? 'product-form__input--warning' : ''}`}
                  style={hasLoss && !errors.sellingPrice ? { borderColor: 'var(--color-warning)' } : {}}
                  placeholder="320.00" value={form.sellingPrice}
                  onChange={e => set('sellingPrice', e.target.value)} />
                {errors.sellingPrice ? (
                  <span className="product-form__error">{errors.sellingPrice}</span>
                ) : hasLoss ? (
                  <span className="product-form__warning" style={{ color: 'var(--color-warning)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    ⚠️ Selling price is lower than cost price (Loss: ₹{lossAmount.toFixed(2)})
                  </span>
                ) : null}
              </div>

              {/* Cost Price */}
              <div className="product-form__field">
                <label className="product-form__label">Cost Price (₹)</label>
                <input type="number" step="0.01" className="product-form__input"
                  placeholder="250.00" value={form.costPrice}
                  onChange={e => set('costPrice', e.target.value)} />
              </div>

              {/* GST */}
              <div className={`product-form__field product-form__searchable-select ${gstOpen ? 'is-open' : ''}`} ref={gstRef}>
                <label className="product-form__label">GST Rate (%)</label>
                <div
                  className="product-form__input product-form__select-trigger"
                  onClick={() => setGstOpen(o => !o)}
                >
                  <span>{form.taxRate}%</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {gstOpen && (
                  <div className="product-form__dropdown">
                    <div className="product-form__dropdown-list">
                      {[0, 5, 12, 18, 28].map(r => (
                        <div key={r} className="product-form__dropdown-item"
                          onClick={() => { set('taxRate', r.toString()); setGstOpen(false); }}>
                          {r}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Stock */}
              <div className="product-form__field">
                <label className="product-form__label">
                  Current Stock *
                  {isEdit && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginLeft: '0.5rem', fontWeight: 400 }}>
                      ⚠️ Can only increase stock here. Use Stock Adjustment for corrections.
                    </span>
                  )}
                </label>
                <input type="number" step="1"
                  className={`product-form__input ${errors.stock ? 'product-form__input--error' : ''}`}
                  placeholder="48" value={form.stock}
                  min={isEdit ? product?.stock : 0}  // ← can't go below current stock
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (isEdit && val < (product?.stock || 0)) {
                      setErrors(prev => ({ ...prev, stock: `Stock cannot be decreased. Current: ${product?.stock}` }));
                      return;
                    }
                    set('stock', e.target.value);
                  }} />
                {errors.stock && <span className="product-form__error">{errors.stock}</span>}
                {isEdit && (
                  <span className="product-form__hint">
                    Current: {product?.stock} {product?.unit}. You can only add more stock here.
                  </span>
                )}
              </div>

              {/* Unit */}
              <div className={`product-form__field product-form__searchable-select ${unitOpen ? 'is-open' : ''}`} ref={unitRef}>
                <label className="product-form__label">Unit</label>
                <div
                  className="product-form__input product-form__select-trigger"
                  onClick={() => setUnitOpen(o => !o)}
                >
                  <span>{form.unit}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {unitOpen && (
                  <div className="product-form__dropdown">
                    <div className="product-form__dropdown-list">
                      {['pcs', 'kg', 'L', 'box', 'pack', 'dozen'].map(u => (
                        <div key={u} className="product-form__dropdown-item"
                          onClick={() => { set('unit', u); setUnitOpen(false); }}>
                          {u}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Min Stock */}
              <div className="product-form__field">
                <label className="product-form__label">Min Stock Level *</label>
                <input type="number" step="1"
                  className={`product-form__input ${errors.minStockLevel ? 'product-form__input--error' : ''}`}
                  placeholder="20" value={form.minStockLevel}
                  onChange={e => set('minStockLevel', e.target.value)} />
                {errors.minStockLevel && <span className="product-form__error">{errors.minStockLevel}</span>}
              </div>

              {/* Expiry */}
              <div className="product-form__field">
                <label className="product-form__label">Expiry Date</label>
                <input type="date" className="product-form__input"
                  value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
                <span className="product-form__hint">For perishable items</span>
              </div>

              {/* Public Visibility Confirmation (Suppliers Only) */}
              {isSupplier && (
                <div className="product-form__public-toggle-container">
                  <div className="public-toggle__info">
                    <div className="public-toggle__title">
                      <Icon name="globe" size={20} />
                      List Publicly in B2B Network
                    </div>
                    <p className="public-toggle__desc">
                      Allow connected shops to view and order this product from your catalog. 
                      Changes are synced instantly.
                    </p>
                  </div>
                  
                  <div className="custom-checkbox-row" onClick={() => set('is_public', !form.is_public)}>
                    <div className={`custom-checkbox ${form.is_public ? 'is-checked' : ''}`}>
                      <Icon name="check" size={14} />
                    </div>
                    <span className="custom-checkbox-label">Confirm listing to public catalog</span>
                  </div>
                </div>
              )}

            </div>
          </div>

<div className="product-form__footer">
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="product-form__btn product-form__btn--secondary" onClick={onClose}>
                Cancel
              </button>
              {fromOrder && reviewQueueLength > 0 && (
                <button type="button" className="product-form__btn product-form__btn--outline" onClick={onSkip} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                  Skip to Next ({reviewQueueLength})
                </button>
              )}
            </div>
            <button type="submit" className="product-form__btn product-form__btn--primary" disabled={saving}>
              <Icon name="check" size={16} />
              {saving ? 'Saving...' : isEdit ? (fromOrder ? 'Confirm & Next' : 'Update Product') : (fromOrder ? 'Add & Next' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN INVENTORY
// ══════════════════════════════════════════════════════════
const ROWS_PER_PAGE = 10;

const SORT_OPTIONS = [
  { value: 'latest',      label: 'Latest Added' },
  { value: 'oldest',      label: 'Oldest Added' },
  { value: 'name_asc',    label: 'Name A → Z' },
  { value: 'name_desc',   label: 'Name Z → A' },
  { value: 'price_high',  label: 'Price: High → Low' },
  { value: 'price_low',   label: 'Price: Low → High' },
  { value: 'stock_high',  label: 'Stock: High → Low' },
  { value: 'stock_low',   label: 'Stock: Low → High' },
];

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [prefillData, setPrefillData] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentOrderInfo, setCurrentOrderInfo] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  // Guard: only process the addFromOrder state once (prevents re-open after save)
  const orderHandledRef = useRef(false);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  const handleReviewNext = () => {
    if (reviewQueue.length <= 1) {
      // All done — close everything cleanly, then refresh inventory list
      setReviewQueue([]);
      setPrefillData(null);
      setCurrentOrderInfo(null);
      setShowAdd(false);
      setShowEdit(false);
      setSelected(null);
      // Re-fetch product list without touching location.state
      fetchProducts();
      return;
    }
    const nextQueue = reviewQueue.slice(1);
    setReviewQueue(nextQueue);
    startReview(nextQueue[0], currentOrderInfo, products, suppliers);
  };

  const startReview = (item, orderInfo, loadedProducts, loadedSuppliers) => {
    const matchedSupplier = (loadedSuppliers || []).find(
      s => (s.supplier_id === orderInfo.supplierDbName) ||
           (s.supplier_id === orderInfo.supplierId) || 
           (s.name && orderInfo.supplierName && s.name.trim().toLowerCase() === orderInfo.supplierName.trim().toLowerCase())
    );

    const enriched = {
      name: item.name,
      costPrice: item.price,
      quantity: item.finalQty,
      supplierId: matchedSupplier?.supplier_id || orderInfo.supplierId || '',
      orderId: orderInfo.orderId,
      itemId: item.id
    };

    const existing = (loadedProducts || []).find(
      p => p.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()
    );

    if (existing) {
      setSelected(existing);
      setPrefillData({ ...enriched, isEditMode: true });
      setShowEdit(true);
      setShowAdd(false);
    } else {
      setSelected(null);
      setPrefillData(enriched);
      setShowAdd(true);
      setShowEdit(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Fetch only products/categories/suppliers — does NOT touch review queue state
  const fetchProducts = async () => {
    try {
      const [prodRes, catRes, supRes] = await Promise.all([
        getProducts({ limit: 100 }),
        getCategories(),
        getSuppliers(),
      ]);
      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (supRes.success) setSuppliers(supRes.data);
    } catch (err) {
      console.error('Inventory fetch error:', err.message);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, supRes] = await Promise.all([
        getProducts({ limit: 100 }),
        getCategories(),
        getSuppliers(),
      ]);
      const loadedProducts = prodRes.success ? prodRes.data : [];
      const loadedSuppliers = supRes.success ? supRes.data : [];
      if (prodRes.success) setProducts(loadedProducts);
      if (catRes.success) setCategories(catRes.data);
      if (supRes.success) setSuppliers(loadedSuppliers);

      // ── Handle sequential B2B review queue ──
      // Only read from location.state ONCE — then clear it from history
      const queue = location.state?.reviewQueue;
      const orderInfo = location.state?.orderInfo;
      
      if (queue && queue.length > 0 && !orderHandledRef.current) {
        orderHandledRef.current = true;
        // Clear state from browser history so refresh won't trigger it again
        navigate(location.pathname, { replace: true, state: {} });
        setReviewQueue(queue);
        setCurrentOrderInfo(orderInfo);
        startReview(queue[0], orderInfo, loadedProducts, loadedSuppliers);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (formData) => {
    try {
      const res = await createProduct(formData);
      if (res.success) {
        // If coming from an order review queue, mark synced and advance
        if (prefillData?.orderId && prefillData?.itemId) {
          try { await markB2BItemSynced(prefillData.orderId, prefillData.itemId); } catch(e){}
          handleReviewNext();
        } else {
          setPrefillData(null);
          setShowAdd(false);
          fetchProducts(); // safe — does not re-trigger review queue
        }
      }
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleEdit = async (formData) => {
    const payload = {
      name: formData.get('name'),
      sellingPrice: formData.get('sellingPrice'),
      costPrice: formData.get('costPrice'),
      stock: formData.get('stock'),
      unit: formData.get('unit'),
      taxRate: formData.get('taxRate'),
      minStockLevel: formData.get('minStockLevel'),
      categoryId: formData.get('categoryId'),
      supplierId: formData.get('supplierId'),
      barcode: formData.get('barcode'),
      expiryDate: formData.get('expiryDate'),
      is_public: formData.get('is_public') === 'true' || formData.get('is_public') === '1'
    };

    try {
      const res = await updateProduct(selected.product_id, payload);
      if (res.success) {
        if (prefillData?.orderId && prefillData?.itemId) {
          try { await markB2BItemSynced(prefillData.orderId, prefillData.itemId); } catch(e){}
          handleReviewNext();
        } else {
          setPrefillData(null);
          setShowEdit(false);
          fetchProducts(); // safe — does not re-trigger review queue
        }
      }
    } catch (err) {
      console.error('Update error:', err.message);
      alert('Update failed: ' + err.message);
    }
  };

  const handleDelete = async (e, product) => {
    e.stopPropagation();
    if (!confirm(`Delete "${product.name}"?`)) return;
    await deleteProduct(product.product_id);
    fetchAll();
  };

  const filtered = (() => {
    const base = products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.categoryName || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'low') return p.stock > 0 && p.stock <= p.minStockLevel;
      if (filterType === 'out') return p.stock === 0;
      if (filterType === 'expiring')
        return p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return true;
    });

    return [...base].sort((a, b) => {
      switch (sortBy) {
        case 'latest':     return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':     return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc':   return a.name.localeCompare(b.name);
        case 'name_desc':  return b.name.localeCompare(a.name);
        case 'price_high': return Number(b.sellingPrice) - Number(a.sellingPrice);
        case 'price_low':  return Number(a.sellingPrice) - Number(b.sellingPrice);
        case 'stock_high': return Number(b.stock) - Number(a.stock);
        case 'stock_low':  return Number(a.stock) - Number(b.stock);
        default:           return 0;
      }
    });
  })();

  // Stats
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStockLevel).length;
  const outStock = products.filter(p => p.stock === 0).length;
  const expiring = products.filter(p => p.expiryDate &&
    new Date(p.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  const statusBadge = (stock, min) => {
    const s = getStatus(stock, min);
    return { good: 'Good', low: 'Low', out: 'Out' }[s];
  };

  // Reset to page 0 whenever filters/sort/search change
  useEffect(() => { setPage(0); }, [search, filterType, sortBy]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div className="app-loading__spinner" />
    </div>
  );

  return (
    <div className="inventory">

      {/* Stats */}
      <div className="inventory-stats">
        {[
          { id: 'all', label: 'Total Products', value: products.length, icon: 'box', bg: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' },
          { id: 'low', label: 'Low Stock', value: lowStock, icon: 'alert', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)' },
          { id: 'expiring', label: 'Expiring Soon', value: expiring, icon: 'alert', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
          { id: 'out', label: 'Out of Stock', value: outStock, icon: 'x', bg: 'var(--color-danger-soft)', color: 'var(--color-danger)' },
        ].map(s => (
          <div 
            key={s.label} 
            className={`inventory-stat-card ${filterType === s.id ? 'is-active' : ''}`}
            onClick={() => setFilterType(s.id)}
            style={{ '--stat-color': s.color }}
          >
            <div className="inventory-stat-card__icon" style={{ background: s.bg, color: s.color }}>
              <Icon name={s.icon} size={24} />
            </div>
            <div className="inventory-stat-card__content">
              <span className="inventory-stat-card__label">{s.label}</span>
              <span className="inventory-stat-card__value">{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Icon name="search" size={16} />
          <input className="inventory-search__input"
            placeholder="Search by name, SKU or category..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Sort Dropdown */}
        <div className={`inventory-sort-wrapper ${sortOpen ? 'is-open' : ''}`} ref={sortRef}>
          <button className="inventory-sort-btn" onClick={() => setSortOpen(o => !o)}>
            <Icon name="reports" size={15} />
            <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort'}</span>
            <Icon name="chevronDown" size={13} />
          </button>
          {sortOpen && (
            <div className="inventory-sort-menu">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`inventory-sort-item ${sortBy === opt.value ? 'is-active' : ''}`}
                  onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                >
                  {sortBy === opt.value && <Icon name="check" size={13} />}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="inventory-add-btn" onClick={() => setShowAdd(true)}>
          <Icon name="box" size={16} /> Add Item
        </button>
      </div>

      {/* Table */}
      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Image</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ width: 100 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="inventory-empty">
                  <Icon name="box" size={48} />
                  <p>{products.length === 0 ? 'No products yet. Add your first product!' : 'No products found'}</p>
                </td>
              </tr>
            ) : filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE).map(p => {
              const status = getStatus(p.stock, p.minStockLevel);
              return (
                <tr key={p.product_id} className="inventory-row" onClick={() => setSelected(p)}>
                  <td>
                    {p.image
                      ? <img src={`http://localhost:5000/uploads/${p.image}`} alt={p.name}
                        style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                      : <div className="inventory-image-placeholder"><Icon name="box" size={20} /></div>
                    }
                  </td>
                  <td><span className="inventory-product-name">{p.name}</span></td>
                  <td><span className="inventory-sku">{p.sku}</span></td>
                  <td><span className="inventory-price">{fmt(p.sellingPrice)}</span></td>
                  <td><span className="inventory-stock">{p.stock} {p.unit}</span></td>
                  <td><span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{p.categoryName || '—'}</span></td>
                  <td>
                    <span className={`inventory-status-badge inventory-status-badge--${status}`}>
                      {statusBadge(p.stock, p.minStockLevel)}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="inventory-actions">
                      <button className="inventory-action-btn" title="Edit"
                        onClick={e => { e.stopPropagation(); setSelected(p); setShowEdit(true); }}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button className="inventory-action-btn inventory-action-btn--danger"
                        title="Delete" onClick={e => handleDelete(e, p)}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(() => {
        const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
        if (totalPages <= 1) return null;
        return (
          <div className="inventory-pagination">
            <button
              className="inv-page-btn"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >‹ Prev</button>

            <div className="inv-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`inv-page-dot ${page === i ? 'is-active' : ''}`}
                  onClick={() => setPage(i)}
                >{i + 1}</button>
              ))}
            </div>

            <span className="inv-page-info">
              {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
            </span>

            <button
              className="inv-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >Next ›</button>
          </div>
        );
      })()}

      {/* Side Panel */}
      {selected && !showEdit && (
        <div className="inventory-side-panel-backdrop" onClick={() => setSelected(null)}>
          <div className="inventory-side-panel" onClick={e => e.stopPropagation()}>
            <div className="inventory-side-panel__header">
              <h3>Product Details</h3>
              <button className="inventory-side-panel__close" onClick={() => setSelected(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="inventory-side-panel__content">
              <div className="inventory-detail-image">
                {selected.image
                  ? <img src={`http://localhost:5000/uploads/${selected.image}`} alt={selected.name}
                    style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  : <Icon name="box" size={64} />
                }
              </div>
              <h2 className="inventory-detail-title">{selected.name}</h2>
              <p className="inventory-detail-sku">SKU: {selected.sku}</p>

              {[
                {
                  title: 'Pricing', rows: [
                    ['Selling Price', fmt(selected.sellingPrice)],
                    ['Cost Price', fmt(selected.costPrice || 0)],
                    ['GST Rate', `${selected.taxRate}%`],
                  ]
                },
                {
                  title: 'Stock', rows: [
                    ['Current Stock', `${selected.stock} ${selected.unit}`],
                    ['Min Level', `${selected.minStockLevel} ${selected.unit}`],
                    ['Status', statusBadge(selected.stock, selected.minStockLevel)],
                  ]
                },
                {
                  title: 'Info', rows: [
                    ['Category', selected.categoryName || '—'],
                    ['Supplier', selected.supplierName || '—'],
                    ['Barcode', selected.barcode || '—'],
                    ['Expiry', selected.expiryDate ? new Date(selected.expiryDate).toLocaleDateString('en-IN') : 'N/A'],
                    ['Date Added', selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
                  ]
                },
              ].map(section => (
                <div key={section.title} className="inventory-detail-section">
                  <h4>{section.title}</h4>
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="inventory-detail-row">
                      <span>{label}</span><span>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="inventory-side-panel__actions">
              <button className="inventory-btn inventory-btn--secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="inventory-btn inventory-btn--primary" onClick={() => setShowEdit(true)}>
                <Icon name="settings" size={16} /> Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <ProductFormModal
          title="Add Product"
          prefillData={prefillData}
          reviewQueueLength={reviewQueue.length > 1 ? reviewQueue.length - 1 : 0}
          categories={categories}
          suppliers={suppliers}
          onClose={() => { setShowAdd(false); setPrefillData(null); setReviewQueue([]); }}
          onSave={handleAdd}
          onSkip={handleReviewNext}
          onCategoriesUpdate={setCategories}
          onSuppliersUpdate={setSuppliers}
        />
      )}

      {showEdit && selected && (
        <ProductFormModal
          title="Edit Product"
          product={selected}
          prefillData={prefillData}
          reviewQueueLength={reviewQueue.length > 1 ? reviewQueue.length - 1 : 0}
          categories={categories}
          suppliers={suppliers}
          onClose={() => { setShowEdit(false); setSelected(null); setPrefillData(null); setReviewQueue([]); }}
          onSave={handleEdit}
          onSkip={handleReviewNext}
          onCategoriesUpdate={setCategories}
          onSuppliersUpdate={setSuppliers}
        />
      )}
    </div>
  );
}