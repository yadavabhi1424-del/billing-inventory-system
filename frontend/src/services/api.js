// ============================================================
//  api.js — API Service
//  StockSense Pro
// ============================================================
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Set token on every app load
const savedToken = localStorage.getItem('accessToken');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// ── Request interceptor (attach token automatically) ─────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor (handle token expiry) ───────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken }
        );

        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    throw new Error(message);
  }
);

// ============================================================
//  AUTH
// ============================================================

export async function login(credentials) {
  const res = await api.post('/auth/login', credentials);
  if (res.success) {
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    // Merge userType and slug into user object before persisting
    const userObj = {
      ...res.data.user,
      userType: res.data.userType || 'shop',
      slug: res.data.tenant?.slug || null
    };
    localStorage.setItem('stocksense_user', JSON.stringify(userObj));
  }
  return res;
}

export async function signup(userData) {
  return await api.post('/auth/signup', {
    name: userData.fullName,
    email: userData.email,
    password: userData.password,
    phone: userData.phone,
    userType: userData.userType || 'shop',
    shopType: userData.shopType || 'other',
  });
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch { }
  localStorage.clear();
}

export async function getMe() {
  return await api.get('/auth/me');
}

export async function changePassword(data) {
  return await api.put('/auth/change-password', data);
}

export async function verifyOtp(data) {
  return await api.post('/auth/verify-email', data); // { email, code }
}

export async function resendOtp(data) {
  return await api.post('/auth/resend-otp', data); // { email }
}

export async function forgotPassword(data) {
  return await api.post('/auth/forgot-password', data); // { email }
}

export async function verifyResetOtp(data) {
  return await api.post('/auth/verify-reset-otp', data); // { email, code }
}

export async function resetPassword(data) {
  return await api.post('/auth/reset-password', data); // { email, code, newPassword }
}

export async function googleLogin(data) {
  const res = await api.post('/auth/google', data); // { idToken, userType? }
  if (res.success) {
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    const userObj = {
      ...res.data.user,
      userType: res.data.userType || 'shop',
      slug: res.data.tenant?.slug || null
    };
    localStorage.setItem('stocksense_user', JSON.stringify(userObj));
  }
  return res;
}

export async function verifyMemberEmail(data) {
  return await api.post('/auth/verify-member', data); // { token }
}

export async function getInviteDetails(token) {
  return await api.get(`/auth/invite/${token}`);
}

export async function acceptInvite(data) {
  return await api.post('/auth/accept-invite', data); // { token, name, password, phone }
}

// ============================================================
//  SHOP PROFILE
// ============================================================

export async function getShopProfile() {
  return await api.get('/shop/profile');
}

export async function saveShopProfile(data) {
  return await api.post('/shop/profile', data);
}

export async function getShopTypes() {
  return await api.get('/shop/shop-types');
}

// ============================================================
//  NOTIFICATIONS
// ============================================================

export async function getNotifications() {
  return await api.get('/notifications');
}

// ============================================================
//  DASHBOARD
// ============================================================

export async function getDashboard(params = {}) {
  return await api.get('/dashboard', { params });
}

// ============================================================
//  PRODUCTS
// ============================================================

export async function getProducts(params = {}) {
  return await api.get('/products', { params });
}

export async function getProductById(id) {
  return await api.get(`/products/${id}`);
}

export async function getProductBySku(sku) {
  return await api.get(`/products/sku/${sku}`);
}

export async function getLowStockProducts() {
  return await api.get('/products/low-stock');
}

export async function getNextSkuSeq() {
  return await api.get('/products/next-sku-seq');
}

export async function createProduct(formData) {
  return await api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function updateProduct(id, formData) {
  return await api.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteProduct(id) {
  return await api.delete(`/products/${id}`);
}

// ============================================================
//  CATEGORIES
// ============================================================

export async function getCategories() {
  return await api.get('/categories');
}

export async function createCategory(data) {
  return await api.post('/categories', data);
}

export async function updateCategory(id, data) {
  return await api.put(`/categories/${id}`, data);
}

export async function deleteCategory(id) {
  return await api.delete(`/categories/${id}`);
}

// ============================================================
//  SUPPLIERS
// ============================================================

export async function getSuppliers(params = {}) {
  return await api.get('/suppliers', { params });
}

export async function getSupplierById(id) {
  return await api.get(`/suppliers/${id}`);
}

export async function createSupplier(data) {
  return await api.post('/suppliers', data);
}

export async function updateSupplier(id, data) {
  return await api.put(`/suppliers/${id}`, data);
}

export async function deleteSupplier(id) {
  return await api.delete(`/suppliers/${id}`);
}

// ============================================================
//  CUSTOMERS
// ============================================================

export async function getCustomers(params = {}) {
  return await api.get('/customers', { params });
}

export async function getCustomerById(id) {
  return await api.get(`/customers/${id}`);
}

export async function createCustomer(data) {
  return await api.post('/customers', data);
}

export async function updateCustomer(id, data) {
  return await api.put(`/customers/${id}`, data);
}

export async function deleteCustomer(id) {
  return await api.delete(`/customers/${id}`);
}

// ============================================================
//  BILLING / POS
// ============================================================

export async function createTransaction(data) {
  return await api.post('/billing', data);
}

export async function getTransactions(params = {}) {
  return await api.get('/billing', { params });
}

export async function getTransactionById(id) {
  return await api.get(`/billing/${id}`);
}

export async function getTransactionByInvoice(invoiceNumber) {
  return await api.get(`/billing/invoice/${invoiceNumber}`);
}

export async function returnTransaction(id, data) {
  return await api.post(`/billing/${id}/return`, data);
}

export async function getTodaySummary() {
  return await api.get('/billing/today-summary');
}

// ============================================================
//  STOCK
// ============================================================

export async function getStockMovements(params = {}) {
  return await api.get('/stock/movements', { params });
}

export async function adjustStock(data) {
  return await api.post('/stock/adjust', data);
}

export async function bulkAdjustStock(data) {
  return await api.post('/stock/bulk-adjust', data);
}

// ============================================================
//  PURCHASE ORDERS
// ============================================================

export async function getPurchaseOrders(params = {}) {
  return await api.get('/purchase-orders', { params });
}

export async function getPurchaseOrderById(id) {
  return await api.get(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(data) {
  return await api.post('/purchase-orders', data);
}

export async function receivePurchaseOrder(id, data) {
  return await api.post(`/purchase-orders/${id}/receive`, data);
}

export async function updatePurchaseOrderStatus(id, status) {
  return await api.patch(`/purchase-orders/${id}/status`, { status });
}

// ============================================================
//  REPORTS
// ============================================================

export async function getSalesReport(params = {}) {
  return await api.get('/reports/sales', { params });
}

export async function getInventoryReport() {
  return await api.get('/reports/inventory');
}

export async function getCustomerReport(params = {}) {
  return await api.get('/reports/customers', { params });
}

export async function getSupplierReport(params = {}) {
  return await api.get('/reports/suppliers', { params });
}

export async function getProfitLossReport(params = {}) {
  return await api.get('/reports/profit-loss', { params });
}

// ============================================================
//  USERS (Admin)
// ============================================================

export async function getUsers(params = {}) {
  return await api.get('/users', { params });
}

export async function createUser(data) {
  return await api.post('/users', data);
}

export async function inviteUser(data) {
  return await api.post('/users/invite', data);
}

export async function updateUser(id, data) {
  return await api.put(`/users/${id}`, data);
}

export async function deleteUser(id) {
  return await api.delete(`/users/${id}`);
}

// ============================================================
//  AI PREDICT
// ============================================================

export async function getAIRecommendations() {
  return await api.get('/ai/recommendations');
}

export async function getAIPredictAll() {
  return await api.get('/ai/predict-all');
}

export async function getAIPrediction(productId) {
  return await api.get(`/ai/predict/${productId}`);
}

export async function trainAIModels() {
  return await api.post('/ai/train');
}

export async function getAIHealth() {
  return await api.get('/ai/health');
}

export async function registerTenant(data) {
  return await api.post('/tenants/register', data);
}

export async function updateMyProfile(data) {
  return await api.put('/users/me', data);
}

// ============================================================
//  DISCOVERY (Phase 4 — Master DB only)
// ============================================================
export async function getDiscovery(params = {}) {
  return await api.get('/discovery', { params });
}

export async function getDiscoveryProfile(slug) {
  return await api.get(`/discovery/${slug}`);
}

export async function upsertDiscoveryProfile(data) {
  return await api.post('/discovery/profile', data);
}

// ============================================================
//  NETWORK / B2B (Phase 5 & 6)
// ============================================================
export async function getSupplierCatalog(supplierId, params = {}) {
  return await api.get(`/network/supplier/${supplierId}/catalog`, { params });
}

export async function getConnections(params = {}) {
  return await api.get('/network/connections', { params });
}

export async function sendConnectionRequest(partnerId) {
  return await api.post('/network/connections', { partner_id: partnerId });
}

export async function updateConnectionStatus(mapId, status) {
  return await api.patch(`/network/connections/${mapId}`, { status });
}

export function disconnectPartner(slug) {
  return api.delete(`/network/connections/${slug}`);
}

export async function getB2BProducts(params = {}) {
  return await api.get('/network/b2b-products', { params });
}

export async function placeB2BOrder(data) {
  return await api.post('/b2b/orders', data);
}

export async function getB2BOrders() {
  return await api.get('/b2b/orders');
}

export async function getOwnProfile() {
  return await api.get('/discovery/own-profile');
}

export { api, API_URL };
