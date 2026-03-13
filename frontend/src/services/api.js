// ============================================================
//  api.js — API Service
//  StockSense Pro
//
//  DEV_MODE = true  → uses mock data (no backend needed)
//  DEV_MODE = false → hits real backend API
// ============================================================

// ── Config ──────────────────────────────────────────────────
const DEV_MODE = true;  // ← flip to false when backend is ready
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Mock data for development ───────────────────────────────
const MOCK_USERS = {
  'admin@stocksense.in':   { email: 'admin@stocksense.in',   password: 'admin123',   role: 'admin',   name: 'Ravi Kumar'  },
  'owner@stocksense.in':   { email: 'owner@stocksense.in',   password: 'owner123',   role: 'owner',   name: 'Store Owner' },
  'cashier@stocksense.in': { email: 'cashier@stocksense.in', password: 'cashier123', role: 'cashier', name: 'Mohan Das'   },
};

// ── API functions ───────────────────────────────────────────

/**
 * Login user
 * @param {Object} credentials - { email, password, role }
 * @returns {Promise<Object>} - { success, user, token, message }
 */
export async function login(credentials) {
  const { email, password } = credentials;

  if (DEV_MODE) {
    // Mock login
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate network delay
    
    const user = MOCK_USERS[email];
    if (user && user.password === password) {
      return {
        success: true,
        user: { id: Date.now(), name: user.name, email: user.email, role: user.role },
        token: 'mock_jwt_token_' + Date.now(),
      };
    }
    
    throw new Error('Invalid email or password');
  }

  // Real API call (when backend is ready)
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

/**
 * Register new user
 * @param {Object} userData - { fullName, email, phone, shopName, password, role }
 * @returns {Promise<Object>} - { success, message }
 */
export async function signup(userData) {
  if (DEV_MODE) {
    // Mock signup
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: 'Account created successfully' };
  }

  // Real API call
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Signup failed');
  }

  return response.json();
}

/**
 * Logout user (clear server session if using sessions)
 * @returns {Promise<Object>}
 */
export async function logout() {
  if (DEV_MODE) {
    return { success: true };
  }

  // Real API call
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  return response.json();
}

// Export API_URL for other services
export { API_URL };