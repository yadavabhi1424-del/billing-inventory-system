// ============================================================
//  dashboardData.js — Mock Data for Dashboard
//  StockSense Pro
//
//  Structure matches real API response exactly.
//  When backend is ready → replace each section with API call.
//  API endpoints listed above each section.
// ============================================================

// ── GET /api/dashboard/stats?period=today|week|month ────────
export const STATS_DATA = {
  today: {
    revenue:       12480,
    cost:          8736,
    profit:        3744,
    grossMargin:   30.0,
    orders:        48,
    avgOrderValue: 260,
    customers:     41,
    returns:       2,
  },
  week: {
    revenue:       87350,
    cost:          59598,
    profit:        27752,
    grossMargin:   31.8,
    orders:        312,
    avgOrderValue: 280,
    customers:     268,
    returns:       11,
  },
  month: {
    revenue:       342800,
    cost:          231490,
    profit:        111310,
    grossMargin:   32.5,
    orders:        1248,
    avgOrderValue: 275,
    customers:     980,
    returns:       38,
  },
};

// ── GET /api/dashboard/chart?view=weekly|monthly ────────────
export const CHART_DATA = {
  weekly: [
    { label: 'Mon', revenue: 11200, cost: 7800, profit: 3400 },
    { label: 'Tue', revenue: 14800, cost: 9900, profit: 4900 },
    { label: 'Wed', revenue: 9600,  cost: 6800, profit: 2800 },
    { label: 'Thu', revenue: 16200, cost: 11100, profit: 5100 },
    { label: 'Fri', revenue: 18400, cost: 12200, profit: 6200 },
    { label: 'Sat', revenue: 21600, cost: 14300, profit: 7300 },
    { label: 'Sun', revenue: 12480, cost: 8736,  profit: 3744 },
  ],
  monthly: [
    { label: 'Week 1', revenue: 78400,  cost: 54200, profit: 24200 },
    { label: 'Week 2', revenue: 92600,  cost: 63800, profit: 28800 },
    { label: 'Week 3', revenue: 85300,  cost: 58100, profit: 27200 },
    { label: 'Week 4', revenue: 87350,  cost: 59598, profit: 27752 },
  ],
};

// ── GET /api/dashboard/top-products ─────────────────────────
export const TOP_PRODUCTS = [
  { name: 'Basmati Rice (5kg)',    sales: 142, revenue: 45440,  trend: +12 },
  { name: 'Sunflower Oil (1L)',    sales: 98,  revenue: 17640,  trend: +8  },
  { name: 'Amul Butter (500g)',    sales: 87,  revenue: 22620,  trend: -3  },
  { name: 'Tata Salt (1kg)',       sales: 210, revenue: 5880,   trend: +22 },
  { name: 'Turmeric Powder (200g)',sales: 76,  revenue: 4940,   trend: +5  },
];

// ── GET /api/dashboard/ai-prediction ────────────────────────
export const AI_PREDICTIONS = [
  // restock = true → demand rising, buy more
  // restock = false → demand falling, reduce/hold stock
  { name: 'Basmati Rice (5kg)',     demandChange: +34, restock: true,  confidence: 92, reason: 'Festival season approaching' },
  { name: 'Tata Salt (1kg)',        demandChange: +28, restock: true,  confidence: 88, reason: 'Consistently high weekly demand' },
  { name: 'Sunflower Oil (1L)',     demandChange: +19, restock: true,  confidence: 84, reason: 'Price drop increased demand' },
  { name: 'Green Tea (100g)',       demandChange: -22, restock: false, confidence: 79, reason: 'Sales dropped 3 weeks in a row' },
  { name: 'Whole Wheat Flour (2kg)',demandChange: -15, restock: false, confidence: 75, reason: 'Seasonal low demand period' },
  { name: 'Sugar (1kg)',            demandChange: -8,  restock: false, confidence: 71, reason: 'Overstocked, slow movement' },
];

// ── GET /api/dashboard/low-stock ────────────────────────────
export const LOW_STOCK = [
  { name: 'Tata Salt (1kg)',    sku: 'SP-004', stock: 3,  minStock: 40, category: 'Spices'   },
  { name: 'Sunflower Oil (1L)', sku: 'OL-002', stock: 8,  minStock: 20, category: 'Oils'     },
  { name: 'Amul Butter (500g)', sku: 'DA-005', stock: 12, minStock: 15, category: 'Dairy'    },
  { name: 'Green Tea (100g)',   sku: 'BV-008', stock: 14, minStock: 20, category: 'Beverages'},
];

// ── GET /api/dashboard/recent-transactions ───────────────────
export const RECENT_TRANSACTIONS = [
  { id: 'INV-2026-0048', customer: 'Sunita Devi',  amount: 643,  payment: 'UPI',  items: 4, time: '2 min ago'  },
  { id: 'INV-2026-0047', customer: 'Walk-in',       amount: 248,  payment: 'Cash', items: 2, time: '18 min ago' },
  { id: 'INV-2026-0046', customer: 'Rahul Sharma',  amount: 1124, payment: 'Card', items: 6, time: '34 min ago' },
  { id: 'INV-2026-0045', customer: 'Walk-in',       amount: 320,  payment: 'Cash', items: 1, time: '51 min ago' },
  { id: 'INV-2026-0044', customer: 'Priya Gupta',   amount: 568,  payment: 'UPI',  items: 3, time: '1 hr ago'   },
];

// ── Quick actions (no API needed) ───────────────────────────
export const QUICK_ACTIONS = [
  { label: 'New Bill',      icon: 'billing',    path: '/billing'   },
  { label: 'Add Product',   icon: 'inventory',  path: '/inventory' },
  { label: 'View Reports',  icon: 'reports',    path: '/reports'   },
  { label: 'AI Predict',    icon: 'ai',         path: '/ai-predict'},
];