// ============================================================
//  App.jsx — Root Application
//  StockSense Pro
// ============================================================

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import LoginPage  from './pages/login';
import SignupPage from './pages/Signup';
import MainLayout from './components/AppLayout';
import Dashboard  from './modules/Dashboard/Dashboard';
import Billing  from './modules/billing/Billing';
import Inventory from './modules/Inventory/Inventory';
import AIPredictPage from './modules/AI/AI';
import Reports   from './modules/Reports/Reports';
import Suppliers from './modules/Suppliers/Suppliers';
import UserManagement from './modules/Users/UserManagement';
import Settings from './modules/Settings/Settings';
import * as authAPI from './services/api';
import SetupWizard    from './pages/SetupWizard';
import { getShopProfile } from './services/api';
import VerifyEmail from './pages/VerifyEmail';
import AcceptInvite from './pages/AcceptInvite';
import DiscoveryPage from './pages/Discovery';

// ── Role permissions (what each role can access) ────────────
const PERMISSIONS = {
  admin:   ['dashboard', 'billing', 'inventory', 'reports', 'manufacturers', 'users', 'settings', 'ai-predict', 'discovery'],
  owner:   ['dashboard', 'billing', 'inventory', 'reports', 'manufacturers', 'settings', 'ai-predict', 'discovery'],
  cashier: ['dashboard', 'billing', 'discovery'],
};

function canAccess(role, page) {
  return PERMISSIONS[role]?.includes(page) ?? false;
}

// ── Simple auth hook ────────────────────────────────────────
function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Check token exists too
      const saved = localStorage.getItem('stocksense_user');
      const token = localStorage.getItem('accessToken');
      if (saved && token) {
        setUser(JSON.parse(saved));
      }
    } catch {
      localStorage.removeItem('stocksense_user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  const login = (userData) => {
    // userData already saved by api.js
    // just update state
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    localStorage.removeItem('stocksense_user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return { user, loading, login, logout };
}

// ── Loading screen ──────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="app-loading__logo">
        <div className="app-loading__logo-icon">📦</div>
        <span className="app-loading__logo-name">StockSense Pro</span>
      </div>
      <div className="app-loading__spinner" />
      <p className="app-loading__text">Loading...</p>
    </div>
  );
}

// ── Module placeholder (remove as you build real modules) ───
function ModulePlaceholder({ page, user }) {
  return (
    <div className="app-placeholder">
      <div className="app-placeholder__card">
        <span className="app-placeholder__tag">Module</span>
        <h2 className="app-placeholder__title">{page}</h2>
        <div className="app-placeholder__meta">
          <span>Logged in as </span>
          <strong>{user.name}</strong>
          <span className="app-placeholder__role">{user.role}</span>
        </div>
      </div>
    </div>
  );
}

// ── Protected route (blocks unauthorized access) ────────────
function ProtectedRoute({ page, user, children }) {
  if (!canAccess(user.role, page)) {
    return (
      <div className="app-unauthorized">
        <div className="app-unauthorized__card">
          <div className="app-unauthorized__icon">🛡️</div>
          <span className="app-unauthorized__code">403 — Access Denied</span>
          <h2 className="app-unauthorized__title">You can't access this</h2>
          <p className="app-unauthorized__message">
            This page is restricted. Your <strong>{user.role}</strong> role doesn't have permission.
          </p>
          <button 
            className="app-unauthorized__btn-primary"
            onClick={() => window.location.href = '/dashboard'}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  return children;
}

// ── Main app (authenticated users) ──────────────────────────
function AuthenticatedApp({ user, logout }) {
  const [setupDone, setSetupDone] = useState(true);

useEffect(() => {
  getShopProfile()
    .then(r => {
      if (!r.data || !r.data.is_setup_done) {
        setSetupDone(false);
      }
    })
    .catch(() => {
      // Error means table exists but no profile yet
      // Only show wizard for non-admin roles
      if (user.role !== 'admin') setSetupDone(false);
    });
}, []);
if (!setupDone) {
  return (
    <SetupWizard
      user={user}
      onComplete={() => setSetupDone(true)}
    />
  );
}
  return (
    <MainLayout 
      user={user} 
      onLogout={logout}
      allowedRoutes={PERMISSIONS[user.role] || []}
    >
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute page="dashboard" user={user}>
            <Dashboard user={user} />
          </ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute page="billing" user={user}>
            <Billing user={user} />
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute page="inventory" user={user}>
            <Inventory user={user} />
          </ProtectedRoute>
        } />

        <Route path="/ai-predict" element={
          <ProtectedRoute page="ai-predict" user={user}>
            <AIPredictPage user={user} />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute page="reports" user={user}>
            <Reports user={user} />
          </ProtectedRoute>
        } />

        <Route path="/manufacturers" element={
          <ProtectedRoute page="manufacturers" user={user}>
            <Suppliers user={user} />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute page="users" user={user}>
            <UserManagement user={user} />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute page="settings" user={user}>
            <Settings user={user} />
          </ProtectedRoute>
        } />
        <Route path="/discovery" element={
          <ProtectedRoute page="discovery" user={user}>
            <DiscoveryPage user={user} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
}

// ── Root ────────────────────────────────────────────────────
export default function App() {
  const { user, loading, login, logout } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      {!user ? (
        <Routes>
          <Route path="/signup" element={
            <SignupPage
              onLoginRedirect={() => window.location.href = '/'}
            />
          } />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/accept-invite" element={<AcceptInvite onLoginRedirect={() => window.location.href = '/'} />} />
          <Route path="*" element={
            <LoginPage 
              onLogin={login} 
              onSignupRedirect={() => window.location.href = '/signup'} 
            />
          } />
        </Routes>
      ) : (
        <AuthenticatedApp user={user} logout={logout} />
      )}
    </BrowserRouter>
  );
}