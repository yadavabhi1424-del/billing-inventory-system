import React, { useState, useEffect } from 'react';
import { getB2BProducts, getConnections, placeB2BOrder } from '../../services/api';
import './B2BStore.css';

const B2BStore = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedSupplier]);

  const fetchInitialData = async () => {
    try {
      const connRes = await getConnections({ status: 'ACCEPTED' });
      if (connRes.success) setSuppliers(connRes.data);
      await fetchProducts();
    } catch (err) {
      console.error("Failed to fetch B2B data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const params = {
        search,
        supplier_id: selectedSupplier !== 'all' ? selectedSupplier : undefined,
        limit: 50
      };
      const res = await getB2BProducts(params);
      if (res.success) setProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.product_id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!confirm(`Place B2B order for ₹${cartTotal.toLocaleString()}?`)) return;
    try {
      setLoading(true);
      const res = await placeB2BOrder({ items: cart });
      if (res.success) {
        alert("B2B Order placed successfully! Check your Purchase Orders for tracking.");
        setCart([]);
        setShowCart(false);
      }
    } catch (err) {
      alert("Failed to place order: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="b2b-store">
      <header className="b2b-store__header">
        <div className="b2b-store__title-section">
          <h1>B2B Marketplace</h1>
          <p>Order directly from your connected suppliers</p>
        </div>

        <div className="b2b-store__controls">
          <div className="b2b-store__search">
            <input
              type="text"
              placeholder="Search products or SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="b2b-store__filter">
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.partner_id} value={s.partner_id}>{s.business_name}</option>
              ))}
            </select>
          </div>

          <button
            className={`b2b-store__cart-btn ${cart.length > 0 ? 'has-items' : ''}`}
            onClick={() => setShowCart(!showCart)}
          >
            🛒 {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
          </button>
        </div>
      </header>

      <main className="b2b-store__content">
        {loading ? (
          <div className="b2b-store__loading">Loading marketplace...</div>
        ) : products.length === 0 ? (
          <div className="b2b-store__empty">
            <h3>No products found</h3>
            <p>Connect with more suppliers in the Network tab to see their catalogs here.</p>
          </div>
        ) : (
          <div className="b2b-store__grid">
            {products.map(product => (
              <div key={product.product_id} className="b2b-card">
                <div className="b2b-card__image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="b2b-card__placeholder">📦</div>
                  )}
                  <span className="b2b-card__supplier">{product.supplier_name || 'Supplier'}</span>
                </div>
                <div className="b2b-card__info">
                  <h3 className="b2b-card__name">{product.name}</h3>
                  <p className="b2b-card__sku">SKU: {product.sku}</p>
                  <div className="b2b-card__price-row">
                    <span className="b2b-card__price">₹{parseFloat(product.price).toLocaleString()}</span>
                    <span className="b2b-card__unit">per {product.unit || 'pcs'}</span>
                  </div>
                  {(() => {
                    const cartItem = cart.find(c => c.product_id === product.product_id);
                    if (!cartItem) {
                      return (
                        <button
                          className="b2b-card__add-btn"
                          onClick={() => addToCart(product)}
                        >
                          Add to Order
                        </button>
                      );
                    }
                    return (
                      <div className="qty-picker">
                        <button onClick={() => updateQuantity(product.product_id, cartItem.quantity - 1)}>−</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="qty-picker__input"
                          value={cartItem.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateQuantity(product.product_id, parseInt(val) || 0);
                          }}
                        />
                        <button onClick={() => updateQuantity(product.product_id, cartItem.quantity + 1)}>+</button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <aside className={`b2b-cart ${showCart ? 'is-open' : ''}`}>
        <div className="b2b-cart__header">
          <h2>B2B Order Cart</h2>
          <button onClick={() => setShowCart(false)}>✕</button>
        </div>

        <div className="b2b-cart__items">
          {cart.length === 0 ? (
            <p className="empty-msg">Your cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item__info">
                  <h4>{item.name}</h4>
                  <p>₹{item.price} / {item.unit}</p>
                </div>
                <div className="cart-item__actions">
                  <div className="qty-picker">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>−</button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="qty-picker__input"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updateQuantity(item.product_id, parseInt(val) || 1);
                      }}
                    />
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.product_id)}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="b2b-cart__footer">
            <div className="total-row">
              <span>Grand Total:</span>
              <span>₹{cartTotal.toLocaleString()}</span>
            </div>
            <button className="place-order-btn" onClick={handlePlaceOrder}>
              Place B2B Order
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default B2BStore;
