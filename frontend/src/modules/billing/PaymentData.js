// ============================================================
//  paymentData.js — Mock Data for Payment/POS Module
//  StockSense Pro
// ============================================================

// ── Product catalog (GET /api/products) ─────────────────────
export const PRODUCTS = [
  { id: 'P001', sku: 'GR-001', name: 'Basmati Rice (5kg)',        price: 320,  gst: 5,  category: 'Grains',    stock: 48,  popular: true  },
  { id: 'P002', sku: 'SP-004', name: 'Tata Salt (1kg)',           price: 28,   gst: 5,  category: 'Spices',    stock: 3,   popular: true  },
  { id: 'P003', sku: 'OL-002', name: 'Sunflower Oil (1L)',        price: 180,  gst: 5,  category: 'Oils',      stock: 8,   popular: true  },
  { id: 'P004', sku: 'DA-005', name: 'Amul Butter (500g)',        price: 260,  gst: 12, category: 'Dairy',     stock: 12,  popular: true  },
  { id: 'P005', sku: 'GR-002', name: 'Whole Wheat Flour (2kg)',   price: 95,   gst: 5,  category: 'Grains',    stock: 32,  popular: true  },
  { id: 'P006', sku: 'SP-002', name: 'Turmeric Powder (200g)',    price: 65,   gst: 5,  category: 'Spices',    stock: 40,  popular: true  },
  { id: 'P007', sku: 'SU-007', name: 'Sugar (1kg)',               price: 48,   gst: 5,  category: 'Staples',   stock: 80,  popular: true  },
  { id: 'P008', sku: 'BV-008', name: 'Green Tea (100g)',          price: 195,  gst: 5,  category: 'Beverages', stock: 14,  popular: true  },
  { id: 'P009', sku: 'BV-001', name: 'Tata Tea Gold (250g)',      price: 145,  gst: 5,  category: 'Beverages', stock: 28,  popular: true  },
  { id: 'P010', sku: 'OL-001', name: 'Mustard Oil (1L)',          price: 165,  gst: 5,  category: 'Oils',      stock: 22,  popular: true  },
  { id: 'P011', sku: 'SN-001', name: 'Haldirams Namkeen (200g)',  price: 60,   gst: 12, category: 'Snacks',    stock: 50,  popular: true  },
  { id: 'P012', sku: 'DA-001', name: 'Amul Milk (1L)',            price: 68,   gst: 5,  category: 'Dairy',     stock: 60,  popular: true  },
  
  // Other products (searchable)
  { id: 'P013', sku: 'SP-003', name: 'Red Chilli Powder (200g)',  price: 72,   gst: 5,  category: 'Spices',    stock: 35,  popular: false },
  { id: 'P014', sku: 'BV-002', name: 'Nescafe Classic (100g)',    price: 320,  gst: 18, category: 'Beverages', stock: 15,  popular: false },
  { id: 'P015', sku: 'SN-002', name: 'Britannia Biscuit (200g)',  price: 40,   gst: 12, category: 'Snacks',    stock: 45,  popular: false },
  { id: 'P016', sku: 'CL-001', name: 'Surf Excel (1kg)',          price: 215,  gst: 18, category: 'Cleaning',  stock: 30,  popular: false },
  { id: 'P017', sku: 'CL-002', name: 'Vim Dishwash (300g)',       price: 45,   gst: 18, category: 'Cleaning',  stock: 55,  popular: false },
  { id: 'P018', sku: 'SU-002', name: 'Toor Dal (1kg)',            price: 135,  gst: 5,  category: 'Staples',   stock: 42,  popular: false },
];

// Get popular products for quick-add grid
export const getPopularProducts = () => PRODUCTS.filter(p => p.popular);

// Get stock status badge
export function getStockStatus(stock) {
  if (stock <= 5)  return { label: 'Critical', color: 'danger'  };
  if (stock <= 15) return { label: 'Low',      color: 'warning' };
  return { label: 'OK', color: 'success' };
}

// GST breakdown
export function getGSTBreakdown(amount, gstRate) {
  const cgst = (amount * (gstRate / 2)) / 100;
  const sgst = (amount * (gstRate / 2)) / 100;
  return { cgst, sgst, total: cgst + sgst };
}

// Generate invoice number
export function generateInvoiceNo() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

// Store info
export const STORE_INFO = {
  name:    'StockSense Store',
  address: '123, Main Market, New Delhi - 110001',
  phone:   '+91 98765 43210',
  gstin:   '07AABCS1429B1ZP',
  email:   'store@stocksense.in',
};