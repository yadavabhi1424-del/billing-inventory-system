import { useState } from 'react';
import Icon from '../../components/Icon';
import './Inventory.css';

// Mock inventory data
const MOCK_PRODUCTS = [
  { id: 'P001', sku: 'GR-001', name: 'Basmati Rice (5kg)', price: 320, stock: 48, unit: 'kg', gst: 5, minStock: 20, supplier: 'ABC Foods', expiry: '12/2025', status: 'good', image: null },
  { id: 'P002', sku: 'SP-004', name: 'Tata Salt (1kg)', price: 28, stock: 3, unit: 'kg', gst: 5, minStock: 40, supplier: 'Tata Consumer', expiry: null, status: 'low', image: null },
  { id: 'P003', sku: 'OL-002', name: 'Sunflower Oil (1L)', price: 180, stock: 8, unit: 'L', gst: 5, minStock: 20, supplier: 'Fortune Foods', expiry: '06/2026', status: 'low', image: null },
  { id: 'P004', sku: 'DA-005', name: 'Amul Butter (500g)', price: 260, stock: 0, unit: 'kg', gst: 12, minStock: 15, supplier: 'Amul', expiry: '03/2026', status: 'out', image: null },
  { id: 'P005', sku: 'GR-002', name: 'Whole Wheat Flour (2kg)', price: 95, stock: 32, unit: 'kg', gst: 5, minStock: 25, supplier: 'Aashirvaad', expiry: '08/2026', status: 'good', image: null },
  { id: 'P006', sku: 'SP-002', name: 'Turmeric Powder (200g)', price: 65, stock: 40, unit: 'kg', gst: 5, minStock: 30, supplier: 'MDH', expiry: '10/2026', status: 'good', image: null },
  { id: 'P007', sku: 'BV-001', name: 'Tata Tea Gold (250g)', price: 145, stock: 28, unit: 'kg', gst: 5, minStock: 20, supplier: 'Tata Consumer', expiry: '12/2026', status: 'good', image: null },
  { id: 'P008', sku: 'SN-001', name: 'Haldirams Namkeen (200g)', price: 60, stock: 12, unit: 'kg', gst: 12, minStock: 30, supplier: 'Haldiram', expiry: '04/2026', status: 'low', image: null },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

// Product Form Modal Component
function ProductFormModal({ title, product = null, onClose, onSave }) {
  const isEdit = !!product;
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || '',
    stock: product?.stock || '',
    unit: product?.unit || 'kg',
    gst: product?.gst || '5',
    minStock: product?.minStock || '',
    supplier: product?.supplier || '',
    expiry: product?.expiry || '',
    category: product?.category || '',
    image: product?.image || null,
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image must be less than 2MB' }));
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.price) newErrors.price = 'Price is required';
    if (!formData.stock && formData.stock !== 0) newErrors.stock = 'Stock is required';
    if (!formData.minStock && formData.minStock !== 0) newErrors.minStock = 'Min stock is required';

    // SKU format (alphanumeric + hyphens)
    if (formData.sku && !/^[A-Z0-9-]+$/i.test(formData.sku)) {
      newErrors.sku = 'SKU must be alphanumeric (e.g., GR-001)';
    }

    // Price validation
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    // Stock validation
    const stock = parseFloat(formData.stock);
    if (isNaN(stock) || stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    // Min stock validation
    const minStock = parseFloat(formData.minStock);
    if (isNaN(minStock) || minStock < 0) {
      newErrors.minStock = 'Min stock cannot be negative';
    }

    // GST validation
    const gst = parseFloat(formData.gst);
    if (isNaN(gst) || gst < 0 || gst > 28) {
      newErrors.gst = 'GST must be between 0-28%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseFloat(formData.stock),
        minStock: parseFloat(formData.minStock),
        gst: parseFloat(formData.gst),
      };
      onSave(productData);
    }
  };

  return (
    <div className="product-form-modal-backdrop" onClick={onClose}>
      <div className="product-form-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="product-form-modal__header">
          <h3>{title}</h3>
          <button className="product-form-modal__close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form__content">

            {/* Image Upload */}
            <div className="product-form__image-section">
              <label className="product-form__label">Product Image</label>
              <div className="product-form__image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="product-form__image-input"
                  id="product-image"
                />
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

            {/* Two Column Grid */}
            <div className="product-form__grid">
              
              {/* Product Name */}
              <div className="product-form__field product-form__field--full">
                <label className="product-form__label">Product Name *</label>
                <input
                  type="text"
                  className={`product-form__input ${errors.name ? 'product-form__input--error' : ''}`}
                  placeholder="e.g., Basmati Rice (5kg)"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
                {errors.name && <span className="product-form__error">{errors.name}</span>}
              </div>

              {/* SKU */}
              <div className="product-form__field">
                <label className="product-form__label">SKU *</label>
                <input
                  type="text"
                  className={`product-form__input ${errors.sku ? 'product-form__input--error' : ''}`}
                  placeholder="GR-001"
                  value={formData.sku}
                  onChange={e => handleChange('sku', e.target.value.toUpperCase())}
                />
                {errors.sku && <span className="product-form__error">{errors.sku}</span>}
              </div>

              {/* Category */}
              <div className="product-form__field">
                <label className="product-form__label">Category</label>
                <input
                  type="text"
                  className="product-form__input"
                  placeholder="Grains, Spices, etc."
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                />
              </div>

              {/* Price */}
              <div className="product-form__field">
                <label className="product-form__label">Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`product-form__input ${errors.price ? 'product-form__input--error' : ''}`}
                  placeholder="320.00"
                  value={formData.price}
                  onChange={e => handleChange('price', e.target.value)}
                />
                {errors.price && <span className="product-form__error">{errors.price}</span>}
              </div>

              {/* GST */}
              <div className="product-form__field">
                <label className="product-form__label">GST Rate (%) *</label>
                <select
                  className={`product-form__input ${errors.gst ? 'product-form__input--error' : ''}`}
                  value={formData.gst}
                  onChange={e => handleChange('gst', e.target.value)}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
                {errors.gst && <span className="product-form__error">{errors.gst}</span>}
              </div>

              {/* Stock */}
              <div className="product-form__field">
                <label className="product-form__label">Current Stock *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`product-form__input ${errors.stock ? 'product-form__input--error' : ''}`}
                  placeholder="48"
                  value={formData.stock}
                  onChange={e => handleChange('stock', e.target.value)}
                />
                {errors.stock && <span className="product-form__error">{errors.stock}</span>}
              </div>

              {/* Unit */}
              <div className="product-form__field">
                <label className="product-form__label">Unit</label>
                <select
                  className="product-form__input"
                  value={formData.unit}
                  onChange={e => handleChange('unit', e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="L">L (Liter)</option>
                  <option value="pc">pc (Piece)</option>
                  <option value="box">box</option>
                  <option value="pack">pack</option>
                </select>
              </div>

              {/* Min Stock */}
              <div className="product-form__field">
                <label className="product-form__label">Min Stock Level *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`product-form__input ${errors.minStock ? 'product-form__input--error' : ''}`}
                  placeholder="20"
                  value={formData.minStock}
                  onChange={e => handleChange('minStock', e.target.value)}
                />
                {errors.minStock && <span className="product-form__error">{errors.minStock}</span>}
              </div>

              {/* Supplier */}
              <div className="product-form__field product-form__field--full">
                <label className="product-form__label">Supplier / Manufacturer</label>
                <input
                  type="text"
                  className="product-form__input"
                  placeholder="ABC Foods"
                  value={formData.supplier}
                  onChange={e => handleChange('supplier', e.target.value)}
                />
              </div>

              {/* Expiry Date */}
              <div className="product-form__field">
                <label className="product-form__label">Expiry Date (Optional)</label>
                <input
                  type="month"
                  className="product-form__input"
                  value={formData.expiry}
                  onChange={e => handleChange('expiry', e.target.value)}
                />
                <span className="product-form__hint">For perishable items</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="product-form__footer">
            <button type="button" className="product-form__btn product-form__btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="product-form__btn product-form__btn--primary">
              <Icon name="check" size={16} />
              {isEdit ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default function Inventory() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Calculate stats
  const totalProducts = MOCK_PRODUCTS.length;
  const lowStock = MOCK_PRODUCTS.filter(p => p.status === 'low').length;
  const expiringSoon = MOCK_PRODUCTS.filter(p => p.expiry && new Date(p.expiry) < new Date(Date.now() + 30*24*60*60*1000)).length;
  const outOfStock = MOCK_PRODUCTS.filter(p => p.status === 'out').length;

  // Filter products
  const filtered = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleRowClick = (product) => {
    setSelectedProduct(product);
  };

  const handleEdit = (e, product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const toggleMenu = (e, productId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === productId ? null : productId);
  };

  const getStatusBadge = (status) => {
    const badges = {
      good: { label: 'Good', class: 'good' },
      low: { label: 'Low', class: 'low' },
      out: { label: 'Out', class: 'out' }
    };
    return badges[status] || badges.good;
  };

  return (
    <div className="inventory">
      
      {/* Stats Cards */}
      <div className="inventory-stats">
        <div className="inventory-stat-card">
          <div className="inventory-stat-card__icon" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' }}>
            <Icon name="box" size={24} />
          </div>
          <div className="inventory-stat-card__content">
            <span className="inventory-stat-card__label">Total Products</span>
            <span className="inventory-stat-card__value">{totalProducts}</span>
            <span className="inventory-stat-card__subtitle">Total items in stock</span>
          </div>
        </div>

        <div className="inventory-stat-card inventory-stat-card--clickable" onClick={() => setSearch('low')}>
          <div className="inventory-stat-card__icon" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="inventory-stat-card__content">
            <span className="inventory-stat-card__label">Low Stock</span>
            <span className="inventory-stat-card__value">{lowStock}</span>
            <span className="inventory-stat-card__subtitle">Items running low</span>
          </div>
        </div>

        <div className="inventory-stat-card inventory-stat-card--clickable">
          <div className="inventory-stat-card__icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="inventory-stat-card__content">
            <span className="inventory-stat-card__label">Expiring Soon</span>
            <span className="inventory-stat-card__value">{expiringSoon}</span>
            <span className="inventory-stat-card__subtitle">Within 30 days</span>
          </div>
        </div>

        <div className="inventory-stat-card inventory-stat-card--clickable" onClick={() => setSearch('out')}>
          <div className="inventory-stat-card__icon" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            <Icon name="x" size={24} />
          </div>
          <div className="inventory-stat-card__content">
            <span className="inventory-stat-card__label">Out of Stock</span>
            <span className="inventory-stat-card__value">{outOfStock}</span>
            <span className="inventory-stat-card__subtitle">Currently unavailable</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Icon name="search" size={16} />
          <input
            className="inventory-search__input"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button className="inventory-filter-btn">
          <Icon name="settings" size={16} />
          Filter
        </button>

        <button className="inventory-add-btn" onClick={() => setShowAddModal(true)}>
          <Icon name="box" size={16} />
          Add Item
        </button>
      </div>

      {/* Table */}
      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" className="inventory-checkbox" />
              </th>
              <th style={{ width: '60px' }}>Image</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="inventory-empty">
                  <Icon name="box" size={48} />
                  <p>No products found</p>
                </td>
              </tr>
            ) : (
              filtered.map(product => {
                const statusBadge = getStatusBadge(product.status);
                return (
                  <tr key={product.id} className="inventory-row" onClick={() => handleRowClick(product)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="inventory-checkbox" />
                    </td>
                    <td>
                      <div className="inventory-image-placeholder">
                        <Icon name="box" size={20} />
                      </div>
                    </td>
                    <td>
                      <span className="inventory-product-name">{product.name}</span>
                    </td>
                    <td>
                      <span className="inventory-sku">{product.sku}</span>
                    </td>
                    <td>
                      <span className="inventory-price">{fmt(product.price)}</span>
                    </td>
                    <td>
                      <span className="inventory-stock">{product.stock}{product.unit}</span>
                    </td>
                    <td>
                      <span className={`inventory-status-badge inventory-status-badge--${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
  <div className="inventory-actions">
    <button 
      className="inventory-action-btn" 
      onClick={(e) => handleEdit(e, product)}
      title="Edit"
    >
      <Icon name="settings" size={14} />
    </button>
    <button 
      className="inventory-action-btn inventory-action-btn--danger" 
      onClick={(e) => {
        e.stopPropagation();
        if (confirm(`Delete ${product.name}?`)) {
          console.log('Delete product:', product.id);
          // TODO: Call API to delete
        }
      }}
      title="Delete"
    >
      <Icon name="x" size={14} />
    </button>
  </div>
</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Details Side Panel */}
      {selectedProduct && !showEditModal && (
        <div className="inventory-side-panel-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="inventory-side-panel" onClick={e => e.stopPropagation()}>
            <div className="inventory-side-panel__header">
              <h3>Product Details</h3>
              <button className="inventory-side-panel__close" onClick={() => setSelectedProduct(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="inventory-side-panel__content">
              <div className="inventory-detail-image">
                <Icon name="box" size={64} />
              </div>

              <h2 className="inventory-detail-title">{selectedProduct.name}</h2>
              <p className="inventory-detail-sku">SKU: {selectedProduct.sku}</p>

              <div className="inventory-detail-section">
                <h4>Pricing</h4>
                <div className="inventory-detail-row">
                  <span>Price</span>
                  <span>{fmt(selectedProduct.price)}</span>
                </div>
                <div className="inventory-detail-row">
                  <span>GST Rate</span>
                  <span>{selectedProduct.gst}%</span>
                </div>
              </div>

              <div className="inventory-detail-section">
                <h4>Stock Information</h4>
                <div className="inventory-detail-row">
                  <span>Current Stock</span>
                  <span className="inventory-detail-stock">{selectedProduct.stock}{selectedProduct.unit}</span>
                </div>
                <div className="inventory-detail-row">
                  <span>Min Stock Level</span>
                  <span>{selectedProduct.minStock}{selectedProduct.unit}</span>
                </div>
                <div className="inventory-detail-row">
                  <span>Status</span>
                  <span className={`inventory-status-badge inventory-status-badge--${getStatusBadge(selectedProduct.status).class}`}>
                    {getStatusBadge(selectedProduct.status).label}
                  </span>
                </div>
              </div>

              <div className="inventory-detail-section">
                <h4>Supplier Information</h4>
                <div className="inventory-detail-row">
                  <span>Supplier</span>
                  <span>{selectedProduct.supplier}</span>
                </div>
                {selectedProduct.expiry && (
                  <div className="inventory-detail-row">
                    <span>Expiry Date</span>
                    <span>{selectedProduct.expiry}</span>
                  </div>
                )}
              </div>

              <div className="inventory-detail-section">
                <h4>Metadata</h4>
                <div className="inventory-detail-row">
                  <span>Added</span>
                  <span>Jan 15, 2026</span>
                </div>
                <div className="inventory-detail-row">
                  <span>Last Updated</span>
                  <span>2 days ago</span>
                </div>
              </div>
            </div>

            <div className="inventory-side-panel__actions">
              <button className="inventory-btn inventory-btn--secondary" onClick={() => setSelectedProduct(null)}>
                Close
              </button>
              <button className="inventory-btn inventory-btn--primary" onClick={() => setShowEditModal(true)}>
                <Icon name="settings" size={16} />
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
{showAddModal && (
  <ProductFormModal
    title="Add New Product"
    onClose={() => setShowAddModal(false)}
    onSave={(product) => {
      console.log('New product:', product);
      // TODO: Call API to save product
      setShowAddModal(false);
    }}
  />
)}

{/* Edit Product Modal */}
{showEditModal && selectedProduct && (
  <ProductFormModal
    title="Edit Product"
    product={selectedProduct}
    onClose={() => {
      setShowEditModal(false);
      setSelectedProduct(null);
    }}
    onSave={(product) => {
      console.log('Updated product:', product);
      // TODO: Call API to update product
      setShowEditModal(false);
      setSelectedProduct(null);
    }}
  />
)}
    </div>
  );
}