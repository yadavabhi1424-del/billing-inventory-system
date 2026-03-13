import { useState } from 'react';
import Icon from '../../components/Icon';
import './Suppliers.css';

// Mock supplier data
const MOCK_SUPPLIERS = [
  {
    id: 'S001',
    name: 'ABC Foods',
    company: 'ABC Foods Pvt Ltd',
    contact: 'Rajesh Kumar',
    phone: '98765 43210',
    email: 'rajesh@abcfoods.com',
    address: '123 Industrial Area, Delhi - 110001',
    products: ['Basmati Rice (5kg)', 'Wheat Flour (2kg)', 'Sugar (1kg)'],
    productsCount: 24,
    creditPeriod: 30,
    outstandingPayment: 45200,
    lastOrder: '2 days ago',
    status: 'active',
    notes: 'Primary grain supplier. Good quality, timely delivery.'
  },
  {
    id: 'S002',
    name: 'Tata Consumer',
    company: 'Tata Consumer Products Ltd',
    contact: 'Priya Sharma',
    phone: '98234 56789',
    email: 'priya@tataconsumer.com',
    address: '456 Business Park, Mumbai - 400001',
    products: ['Tata Salt (1kg)', 'Tata Tea Gold (250g)'],
    productsCount: 12,
    creditPeriod: 45,
    outstandingPayment: 0,
    lastOrder: '1 week ago',
    status: 'active',
    notes: 'Reliable brand supplier. Premium quality products.'
  },
  {
    id: 'S003',
    name: 'Fortune Foods',
    company: 'Fortune Foods India',
    contact: 'Amit Singh',
    phone: '99876 54321',
    email: 'amit@fortunefoods.in',
    address: '789 Trade Center, Bangalore - 560001',
    products: ['Sunflower Oil (1L)', 'Mustard Oil (1L)'],
    productsCount: 8,
    creditPeriod: 30,
    outstandingPayment: 28400,
    lastOrder: '3 days ago',
    status: 'active',
    notes: 'Oil supplier. Competitive pricing.'
  },
  {
    id: 'S004',
    name: 'Amul',
    company: 'Gujarat Cooperative Milk Marketing Federation',
    contact: 'Neha Patel',
    phone: '97654 32109',
    email: 'neha@amul.coop',
    address: '321 Dairy Plaza, Ahmedabad - 380001',
    products: ['Amul Butter (500g)', 'Amul Milk (1L)'],
    productsCount: 15,
    creditPeriod: 15,
    outstandingPayment: 0,
    lastOrder: '5 days ago',
    status: 'active',
    notes: 'Dairy products supplier. Quick delivery.'
  },
  {
    id: 'S005',
    name: 'MDH Spices',
    company: 'MDH Spices Pvt Ltd',
    contact: 'Ravi Kumar',
    phone: '98111 22333',
    email: 'ravi@mdh.com',
    address: '567 Spice Market, Delhi - 110002',
    products: ['Turmeric Powder (200g)', 'Red Chilli Powder (200g)'],
    productsCount: 18,
    creditPeriod: 30,
    outstandingPayment: 12600,
    lastOrder: '1 day ago',
    status: 'active',
    notes: 'Spices supplier. Good margins.'
  },
  {
    id: 'S006',
    name: 'Haldiram',
    company: 'Haldiram Manufacturing Company',
    contact: 'Sunita Gupta',
    phone: '96543 21098',
    email: 'sunita@haldiram.com',
    address: '890 Food Court, Nagpur - 440001',
    products: ['Haldirams Namkeen (200g)'],
    productsCount: 10,
    creditPeriod: 30,
    outstandingPayment: 0,
    lastOrder: '2 weeks ago',
    status: 'inactive',
    notes: 'Snacks supplier. Seasonal orders.'
  },
];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

// Supplier Form Modal Component
function SupplierFormModal({ title, supplier = null, onClose, onSave }) {
  const isEdit = !!supplier;
  
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    company: supplier?.company || '',
    contact: supplier?.contact || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    creditPeriod: supplier?.creditPeriod || '30',
    notes: supplier?.notes || '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Supplier name is required';
    if (!formData.company.trim()) newErrors.company = 'Company name is required';
    if (!formData.contact.trim()) newErrors.contact = 'Contact person is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';

    // Phone validation (10 digits)
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Credit period validation
    const credit = parseInt(formData.creditPeriod);
    if (isNaN(credit) || credit < 0 || credit > 365) {
      newErrors.creditPeriod = 'Credit period must be 0-365 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      const supplierData = {
        ...formData,
        creditPeriod: parseInt(formData.creditPeriod),
      };
      onSave(supplierData);
    }
  };

  return (
    <div className="supplier-form-modal-backdrop" onClick={onClose}>
      <div className="supplier-form-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="supplier-form-modal__header">
          <h3>{title}</h3>
          <button className="supplier-form-modal__close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="supplier-form" onSubmit={handleSubmit}>
          <div className="supplier-form__content">

            {/* Two Column Grid */}
            <div className="supplier-form__grid">
              
              {/* Supplier Name */}
              <div className="supplier-form__field">
                <label className="supplier-form__label">Supplier Name *</label>
                <input
                  type="text"
                  className={`supplier-form__input ${errors.name ? 'supplier-form__input--error' : ''}`}
                  placeholder="e.g., ABC Foods"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                />
                {errors.name && <span className="supplier-form__error">{errors.name}</span>}
              </div>

              {/* Company Name */}
              <div className="supplier-form__field">
                <label className="supplier-form__label">Company Name *</label>
                <input
                  type="text"
                  className={`supplier-form__input ${errors.company ? 'supplier-form__input--error' : ''}`}
                  placeholder="ABC Foods Pvt Ltd"
                  value={formData.company}
                  onChange={e => handleChange('company', e.target.value)}
                />
                {errors.company && <span className="supplier-form__error">{errors.company}</span>}
              </div>

              {/* Contact Person */}
              <div className="supplier-form__field">
                <label className="supplier-form__label">Contact Person *</label>
                <input
                  type="text"
                  className={`supplier-form__input ${errors.contact ? 'supplier-form__input--error' : ''}`}
                  placeholder="Rajesh Kumar"
                  value={formData.contact}
                  onChange={e => handleChange('contact', e.target.value)}
                />
                {errors.contact && <span className="supplier-form__error">{errors.contact}</span>}
              </div>

              {/* Phone */}
              <div className="supplier-form__field">
                <label className="supplier-form__label">Phone Number *</label>
                <input
                  type="tel"
                  className={`supplier-form__input ${errors.phone ? 'supplier-form__input--error' : ''}`}
                  placeholder="98765 43210"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                />
                {errors.phone && <span className="supplier-form__error">{errors.phone}</span>}
              </div>

              {/* Email */}
              <div className="supplier-form__field supplier-form__field--full">
                <label className="supplier-form__label">Email *</label>
                <input
                  type="email"
                  className={`supplier-form__input ${errors.email ? 'supplier-form__input--error' : ''}`}
                  placeholder="contact@abcfoods.com"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
                {errors.email && <span className="supplier-form__error">{errors.email}</span>}
              </div>

              {/* Address */}
              <div className="supplier-form__field supplier-form__field--full">
                <label className="supplier-form__label">Address</label>
                <textarea
                  className="supplier-form__input supplier-form__textarea"
                  placeholder="123 Industrial Area, City - Pincode"
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  rows="3"
                />
              </div>

              {/* Credit Period */}
              <div className="supplier-form__field">
                <label className="supplier-form__label">Credit Period (Days) *</label>
                <input
                  type="number"
                  className={`supplier-form__input ${errors.creditPeriod ? 'supplier-form__input--error' : ''}`}
                  placeholder="30"
                  value={formData.creditPeriod}
                  onChange={e => handleChange('creditPeriod', e.target.value)}
                />
                {errors.creditPeriod && <span className="supplier-form__error">{errors.creditPeriod}</span>}
                <span className="supplier-form__hint">Payment terms in days</span>
              </div>

              {/* Notes */}
              <div className="supplier-form__field supplier-form__field--full">
                <label className="supplier-form__label">Notes</label>
                <textarea
                  className="supplier-form__input supplier-form__textarea"
                  placeholder="Additional notes about this supplier..."
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows="2"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="supplier-form__footer">
            <button type="button" className="supplier-form__btn supplier-form__btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="supplier-form__btn supplier-form__btn--primary">
              <Icon name="check" size={16} />
              {isEdit ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Calculate stats
  const totalSuppliers = MOCK_SUPPLIERS.length;
  const activeSuppliers = MOCK_SUPPLIERS.filter(s => s.status === 'active').length;
  const totalProducts = MOCK_SUPPLIERS.reduce((sum, s) => sum + s.productsCount, 0);
  const totalOutstanding = MOCK_SUPPLIERS.reduce((sum, s) => sum + s.outstandingPayment, 0);

  // Filter suppliers
  const filtered = MOCK_SUPPLIERS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.company.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleRowClick = (supplier) => {
    setSelectedSupplier(supplier);
  };

  const handleEdit = (e, supplier) => {
    e.stopPropagation();
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const handleDelete = (e, supplier) => {
    e.stopPropagation();
    if (confirm(`Delete supplier ${supplier.name}?`)) {
      console.log('Delete supplier:', supplier.id);
      // TODO: Call API to delete
    }
  };

  return (
    <div className="suppliers">
      
      {/* Stats Cards */}
      <div className="suppliers-stats">
        <div className="suppliers-stat-card">
          <div className="suppliers-stat-card__icon" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-primary)' }}>
            <Icon name="manufacturers" size={24} />
          </div>
          <div className="suppliers-stat-card__content">
            <span className="suppliers-stat-card__label">Total Suppliers</span>
            <span className="suppliers-stat-card__value">{totalSuppliers}</span>
            <span className="suppliers-stat-card__subtitle">Registered vendors</span>
          </div>
        </div>

        <div className="suppliers-stat-card">
          <div className="suppliers-stat-card__icon" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <Icon name="check" size={24} />
          </div>
          <div className="suppliers-stat-card__content">
            <span className="suppliers-stat-card__label">Active Suppliers</span>
            <span className="suppliers-stat-card__value">{activeSuppliers}</span>
            <span className="suppliers-stat-card__subtitle">Currently working with</span>
          </div>
        </div>

        <div className="suppliers-stat-card">
          <div className="suppliers-stat-card__icon" style={{ background: 'var(--color-violet-soft)', color: 'var(--color-violet)' }}>
            <Icon name="box" size={24} />
          </div>
          <div className="suppliers-stat-card__content">
            <span className="suppliers-stat-card__label">Total Products</span>
            <span className="suppliers-stat-card__value">{totalProducts}</span>
            <span className="suppliers-stat-card__subtitle">Items supplied</span>
          </div>
        </div>

        <div className="suppliers-stat-card">
          <div className="suppliers-stat-card__icon" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
            <Icon name="alert" size={24} />
          </div>
          <div className="suppliers-stat-card__content">
            <span className="suppliers-stat-card__label">Outstanding</span>
            <span className="suppliers-stat-card__value">{fmt(totalOutstanding)}</span>
            <span className="suppliers-stat-card__subtitle">Pending payments</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="suppliers-toolbar">
        <div className="suppliers-search">
          <Icon name="search" size={16} />
          <input
            className="suppliers-search__input"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button className="suppliers-filter-btn">
          <Icon name="settings" size={16} />
          Filter
        </button>

        <button className="suppliers-add-btn" onClick={() => setShowAddModal(true)}>
          <Icon name="manufacturers" size={16} />
          Add Supplier
        </button>
      </div>

      {/* Table */}
      <div className="suppliers-table-wrapper">
        <table className="suppliers-table">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Products</th>
              <th>Outstanding</th>
              <th>Last Order</th>
              <th>Status</th>
              <th style={{ width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="suppliers-empty">
                  <Icon name="manufacturers" size={48} />
                  <p>No suppliers found</p>
                </td>
              </tr>
            ) : (
              filtered.map(supplier => (
                <tr key={supplier.id} className="suppliers-row" onClick={() => handleRowClick(supplier)}>
                  <td>
                    <div className="suppliers-name">{supplier.name}</div>
                    <div className="suppliers-company">{supplier.company}</div>
                  </td>
                  <td>
                    <span className="suppliers-contact">{supplier.contact}</span>
                  </td>
                  <td>
                    <span className="suppliers-phone">{supplier.phone}</span>
                  </td>
                  <td>
                    <span className="suppliers-products">{supplier.productsCount}</span>
                  </td>
                  <td>
                    <span className={`suppliers-outstanding ${supplier.outstandingPayment > 0 ? 'suppliers-outstanding--pending' : ''}`}>
                      {supplier.outstandingPayment > 0 ? fmt(supplier.outstandingPayment) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="suppliers-time">{supplier.lastOrder}</span>
                  </td>
                  <td>
                    <span className={`suppliers-status-badge suppliers-status-badge--${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="suppliers-actions">
                      <button className="suppliers-action-btn" onClick={(e) => handleEdit(e, supplier)} title="Edit">
                        <Icon name="settings" size={14} />
                      </button>
                      <button className="suppliers-action-btn suppliers-action-btn--danger" onClick={(e) => handleDelete(e, supplier)} title="Delete">
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Side Panel */}
      {selectedSupplier && !showEditModal && (
        <div className="suppliers-side-panel-backdrop" onClick={() => setSelectedSupplier(null)}>
          <div className="suppliers-side-panel" onClick={e => e.stopPropagation()}>
            <div className="suppliers-side-panel__header">
              <h3>Supplier Details</h3>
              <button className="suppliers-side-panel__close" onClick={() => setSelectedSupplier(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="suppliers-side-panel__content">
              <h2 className="suppliers-detail-title">{selectedSupplier.name}</h2>
              <p className="suppliers-detail-company">{selectedSupplier.company}</p>

              <div className="suppliers-detail-section">
                <h4>Contact Information</h4>
                <div className="suppliers-detail-row">
                  <span>Contact Person</span>
                  <span>{selectedSupplier.contact}</span>
                </div>
                <div className="suppliers-detail-row">
                  <span>Phone</span>
                  <span>{selectedSupplier.phone}</span>
                </div>
                <div className="suppliers-detail-row">
                  <span>Email</span>
                  <span>{selectedSupplier.email}</span>
                </div>
                <div className="suppliers-detail-row">
                  <span>Address</span>
                  <span style={{ textAlign: 'right', fontSize: '0.82rem' }}>{selectedSupplier.address}</span>
                </div>
              </div>

              <div className="suppliers-detail-section">
                <h4>Business Terms</h4>
                <div className="suppliers-detail-row">
                  <span>Credit Period</span>
                  <span>{selectedSupplier.creditPeriod} days</span>
                </div>
                <div className="suppliers-detail-row">
                  <span>Outstanding Payment</span>
                  <span className={selectedSupplier.outstandingPayment > 0 ? 'suppliers-detail-outstanding' : ''}>
                    {selectedSupplier.outstandingPayment > 0 ? fmt(selectedSupplier.outstandingPayment) : 'No dues'}
                  </span>
                </div>
                <div className="suppliers-detail-row">
                  <span>Status</span>
                  <span className={`suppliers-status-badge suppliers-status-badge--${selectedSupplier.status}`}>
                    {selectedSupplier.status}
                  </span>
                </div>
              </div>

              <div className="suppliers-detail-section">
                <h4>Products Supplied ({selectedSupplier.productsCount})</h4>
                <div className="suppliers-products-list">
                  {selectedSupplier.products.map((product, i) => (
                    <div key={i} className="suppliers-product-item">
                      <Icon name="box" size={14} />
                      {product}
                    </div>
                  ))}
                  {selectedSupplier.products.length < selectedSupplier.productsCount && (
                    <div className="suppliers-product-item suppliers-product-item--more">
                      +{selectedSupplier.productsCount - selectedSupplier.products.length} more products
                    </div>
                  )}
                </div>
              </div>

              <div className="suppliers-detail-section">
                <h4>Notes</h4>
                <p className="suppliers-detail-notes">{selectedSupplier.notes}</p>
              </div>

              <div className="suppliers-detail-section">
                <h4>History</h4>
                <div className="suppliers-detail-row">
                  <span>Last Order</span>
                  <span>{selectedSupplier.lastOrder}</span>
                </div>
              </div>
            </div>

            <div className="suppliers-side-panel__actions">
              <button className="suppliers-btn suppliers-btn--secondary" onClick={() => setSelectedSupplier(null)}>
                Close
              </button>
              <button className="suppliers-btn suppliers-btn--primary" onClick={() => setShowEditModal(true)}>
                <Icon name="settings" size={16} />
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
{showAddModal && (
  <SupplierFormModal
    title="Add New Supplier"
    onClose={() => setShowAddModal(false)}
    onSave={(supplier) => {
      console.log('New supplier:', supplier);
      // TODO: Call API to save supplier
      setShowAddModal(false);
    }}
  />
)}

{/* Edit Supplier Modal */}
{showEditModal && selectedSupplier && (
  <SupplierFormModal
    title="Edit Supplier"
    supplier={selectedSupplier}
    onClose={() => {
      setShowEditModal(false);
      setSelectedSupplier(null);
    }}
    onSave={(supplier) => {
      console.log('Updated supplier:', supplier);
      // TODO: Call API to update supplier
      setShowEditModal(false);
      setSelectedSupplier(null);
    }}
  />
)}
    </div>
  );
}