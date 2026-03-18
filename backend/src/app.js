require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const compression  = require("compression");
const rateLimit    = require("express-rate-limit");
const path         = require("path");

const { notFound, errorHandler } = require("./middleware/errorHandler");

// ─── Route imports ────────────────────────────────────
const authRoutes          = require("./modules/auth/auth.routes");
const userRoutes          = require("./modules/users/user.routes");
const categoryRoutes      = require("./modules/categories/category.routes");
const productRoutes       = require("./modules/products/product.routes");
const supplierRoutes      = require("./modules/suppliers/supplier.routes");
const customerRoutes      = require("./modules/customers/customer.routes");
const billingRoutes       = require("./modules/billing/billing.routes");
const stockRoutes         = require("./modules/stock/stock.routes");
const purchaseOrderRoutes = require("./modules/purchaseOrders/purchaseOrder.routes");
const reportRoutes        = require("./modules/reports/report.routes");
const dashboardRoutes     = require("./modules/dashboard/dashboard.routes");

const app = express();

// ─── Security ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
  })
);

// ─── Rate Limiting ────────────────────────────────────
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  message:  { success: false, message: "Too many requests. Try again later." },
}));

app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: "Too many login attempts. Try again later." },
}));

// ─── Body Parsers ─────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

// ─── Logging ──────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Static files (product images) ───────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health check ─────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success:     true,
    message:     "StockSense Pro API is running!",
    version:     "1.0.0",
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────
app.use("/api/auth",            authRoutes);
app.use("/api/users",           userRoutes);
app.use("/api/categories",      categoryRoutes);
app.use("/api/products",        productRoutes);
app.use("/api/suppliers",       supplierRoutes);
app.use("/api/customers",       customerRoutes);
app.use("/api/billing",         billingRoutes);
app.use("/api/stock",           stockRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/reports",         reportRoutes);
app.use("/api/dashboard",       dashboardRoutes);

// ─── Error Handling ───────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;