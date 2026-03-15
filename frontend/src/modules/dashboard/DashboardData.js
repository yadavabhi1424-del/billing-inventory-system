// ============================================================
//  dashboardData.js — Mock Data for Dashboard
//  StockSense Pro
//
//  Structure matches real API response exactly.
//  When backend is ready → replace each section with API call.
//  API endpoints listed above each section.
// ============================================================

// ── GET /api/dashboard/stats?period=today|week|month ────────

// ── Quick actions (no API needed) ───────────────────────────
export const QUICK_ACTIONS = [
  { label: 'New Bill',      icon: 'billing',    path: '/billing'   },
  { label: 'Add Product',   icon: 'inventory',  path: '/inventory' },
  { label: 'View Reports',  icon: 'reports',    path: '/reports'   },
  { label: 'AI Predict',    icon: 'ai',         path: '/ai-predict'},
];