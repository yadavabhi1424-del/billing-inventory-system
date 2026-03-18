// ============================================================
//  Inventory.jsx — Connected to Backend
//  StockSense Pro
// ============================================================

import { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import {
  getProducts, createProduct, updateProduct,
  deleteProduct, getCategories, getSuppliers,
} from '../../services/api';
import './Inventory.css';

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

const getStatus = (stock, min) =>
  stock === 0 ? 'out' : stock <= min ? 'low' : 'good';

// ══════════════════════════════════════════════════════════
//  PRODUCT FORM MODAL
// ══════════════════════════════════════════════════════════
function ProductFormModal({ title, product = null, categories = [], suppliers = [], onClose, onSave }) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    name:         product?.name         || '',
    sku:          product?.sku          || '',
    sellingPrice: product?.sellingPrice || '',
    costPrice:    product?.costPrice    || '',
    stock:        product?.stock        || '',
    unit:         product?.unit         || 'pcs',
    taxRate:      product?.taxRate      || '0',
    minStockLevel: product?.minStockLevel || '',
    categoryId:   product?.category_id  || '',
    supplierId:   product?.supplier_id  || '',
    barcode:      product?.barcode      || '',
    expiryDate:   product?.expiryDate?.split('T')[0] || '',
    image:        null,
  });

  const [errors,       setErrors]       = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [saving,       setSaving]       = useState(false);

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
    if (!form.name.trim())                           e.name         = 'Product name is required';
    if (!form.sku.trim())                            e.sku          = 'SKU is required';
    if (!/^[A-Z0-9-]+$/i.test(form.sku))            e.sku          = 'SKU must be alphanumeric (e.g., GR-001)';
    if (!form.sellingPrice || form.sellingPrice <= 0) e.sellingPrice = 'Price must be greater than 0';
    if (form.stock === '' || form.stock < 0)         e.stock        = 'Stock cannot be negative';
    if (!form.minStockLevel && form.minStockLevel !== 0) e.minStockLevel = 'Min stock is required';
    if (!form.categoryId)                            e.categoryId   = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      // Use FormData for image upload
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== '') data.append(k, v);
      });
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

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form__content">

            {/* Image Upload */}
            <div className="product-form__image-section">
              <label className="product-form__label">Product Image</label>
              <div className="product-form__image-upload">
                <input type="file" accept="image/*" onChange={handleImage}
                  className="product-form__image-input" id="product-image" />
                <label htmlFor="product-image" className="product-form__image-label">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="product-form__image-preview" />
                  ) : (
                    <div className="product-form__image-placeholder">
                      <Icon name="box" size={32} />
                      <span>Click to upload image</span>
                      <span className="product-form__image-hint">Max 2MB (JPG, PNG)</span>
                    </div>
                  )}
                </label>
              </div>
              {errors.image && <span className="product-form__error">{errors.image}</span>}
            </div>

            <div className="product-form__grid">

              {/* Name */}
              <div className="product-form__field product-form__field--full">
                <label className="product-form__label">Product Name *</label>
                <input type="text" className={`product-form__input ${errors.name ? 'product-form__input--error' : ''}`}
                  placeholder="e.g., Rice" value={form.name}
                  onChange={e => set('name', e.target.value)} />
                {errors.name && <span className="product-form__error">{errors.name}</span>}
              </div>

              {/* SKU */}
              <div className="product-form__field">
                <label className="product-form__label">SKU *</label>
                <input type="text" className={`product-form__input ${errors.sku ? 'product-form__input--error' : ''}`}
                  placeholder="GR-001" value={form.sku}
                  onChange={e => set('sku', e.target.value.toUpperCase())} />
                {errors.sku && <span className="product-form__error">{errors.sku}</span>}
              </div>

              {/* Barcode */}
              <div className="product-form__field">
                <label className="product-form__label">Barcode</label>
                <input type="text" className="product-form__input"
                  placeholder="Optional" value={form.barcode}
                  onChange={e => set('barcode', e.target.value)} />
              </div>

              {/* Category */}
              <div className="product-form__field">
                <label className="product-form__label">Category *</label>
                <select className={`product-form__input ${errors.categoryId ? 'product-form__input--error' : ''}`}
                  value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <span className="product-form__error">{errors.categoryId}</span>}
              </div>

              {/* Supplier */}
              <div className="product-form__field">
                <label className="product-form__label">Supplier</label>
                <select className="product-form__input" value={form.supplierId}
                  onChange={e => set('supplierId', e.target.value)}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Selling Price */}
              <div className="product-form__field">
                <label className="product-form__label">Selling Price (₹) *</label>
                <input type="number" step="0.01"
                  className={`product-form__input ${errors.sellingPrice ? 'product-form__input--error' : ''}`}
                  placeholder="320.00" value={form.sellingPrice}
                  onChange={e => set('sellingPrice', e.target.value)} />
                {errors.sellingPrice && <span className="product-form__error">{errors.sellingPrice}</span>}
              </div>

              {/* Cost Price */}
              <div className="product-form__field">
                <label className="product-form__label">Cost Price (₹)</label>
                <input type="number" step="0.01" className="product-form__input"
                  placeholder="250.00" value={form.costPrice}
                  onChange={e => set('costPrice', e.target.value)} />
              </div>

              {/* GST */}
              <div className="product-form__field">
                <label className="product-form__label">GST Rate (%)</label>
                <select className="product-form__input" value={form.taxRate}
                  onChange={e => set('taxRate', e.target.value)}>
                  {[0, 5, 12, 18, 28].map(r => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>

              {/* Stock */}
              <div className="product-form__field">
                <label className="product-form__label">Current Stock *</label>
                <input type="number" step="1"
                  className={`product-form__input ${errors.stock ? 'product-form__input--error' : ''}`}
                  placeholder="48" value={form.stock}
                  onChange={e => set('stock', e.target.value)} />
                {errors.stock && <span className="product-form__error">{errors.stock}</span>}
              </div>

              {/* Unit */}
              <div className="product-form__field">
                <label className="product-form__label">Unit</label>
                <select className="product-form__input" value={form.unit}
                  onChange={e => set('unit', e.target.value)}>
                  {['pcs', 'kg', 'L', 'box', 'pack', 'dozen'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
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

            </div>
          </div>

          <div className="product-form__footer">
            <button type="button" className="product-form__btn product-form__btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="product-form__btn product-form__btn--primary" disabled={saving}>
              <Icon name="check" size={16} />
              {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
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
export default function Inventory() {
  const [products,  setProducts]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);

  useEffect(() => { fetchAll(); }, []);

 const fetchAll = async () => {
  try {
    setLoading(false); // don't show spinner on refresh
    const [prodRes, catRes, supRes] = await Promise.all([
      getProducts({ limit: 100 }),
      getCategories(),
      getSuppliers(),
    ]);
    if (prodRes.success) setProducts(prodRes.data);
    if (catRes.success)  setCategories(catRes.data);
    if (supRes.success)  setSuppliers(supRes.data);
  } catch (err) {
    console.error('Inventory fetch error:', err.message);
  }
};
  const handleAdd = async (formData) => {
    await createProduct(formData);
    setShowAdd(false);
    fetchAll();
  };

 const handleEdit = async (formData) => {
  try {
    const res = await updateProduct(selected.product_id, formData);
    if (res.success) {
      setShowEdit(false);
      setSelected(null);
      await fetchAll(); // wait for fresh data
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const lowStock  = products.filter(p => p.stock > 0 && p.stock <= p.minStockLevel).length;
  const outStock  = products.filter(p => p.stock === 0).length;
  const expiring  = products.filter(p => p.expiryDate &&
    new Date(p.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  const statusBadge = (stock, min) => {
    const s = getStatus(stock, min);
    return { good: 'Good', low: 'Low', out: 'Out' }[s];
  };

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
          { label: 'Total Products', value: products.length, icon: 'box',   bg: 'var(--color-accent-soft)',   color: 'var(--color-accent-primary)' },
          { label: 'Low Stock',      value: lowStock,         icon: 'alert', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)'        },
          { label: 'Expiring Soon',  value: expiring,         icon: 'alert', bg: 'rgba(245,158,11,0.15)',     color: '#f59e0b'                      },
          { label: 'Out of Stock',   value: outStock,         icon: 'x',     bg: 'var(--color-danger-soft)',  color: 'var(--color-danger)'          },
        ].map(s => (
          <div key={s.label} className="inventory-stat-card">
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
            placeholder="Search by name or SKU..."
            value={search} onChange={e => setSearch(e.target.value)} />
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
            ) : filtered.map(p => {
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
                        <Icon name="settings" size={14} />
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
                { title: 'Pricing', rows: [
                  ['Selling Price', fmt(selected.sellingPrice)],
                  ['Cost Price',    fmt(selected.costPrice || 0)],
                  ['GST Rate',      `${selected.taxRate}%`],
                ]},
                { title: 'Stock', rows: [
                  ['Current Stock', `${selected.stock} ${selected.unit}`],
                  ['Min Level',     `${selected.minStockLevel} ${selected.unit}`],
                  ['Status',        statusBadge(selected.stock, selected.minStockLevel)],
                ]},
                { title: 'Info', rows: [
                  ['Category', selected.categoryName || '—'],
                  ['Supplier', selected.supplierName || '—'],
                  ['Barcode',  selected.barcode      || '—'],
                  ['Expiry',   selected.expiryDate ? new Date(selected.expiryDate).toLocaleDateString('en-IN') : 'N/A'],
                ]},
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
        <ProductFormModal title="Add New Product"
          categories={categories} suppliers={suppliers}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd} />
      )}

      {/* Edit Modal */}
      {showEdit && selected && (
        <ProductFormModal title="Edit Product"
          product={selected} categories={categories} suppliers={suppliers}
          onClose={() => { setShowEdit(false); setSelected(null); }}
          onSave={handleEdit} />
      )}
    </div>
  );
}