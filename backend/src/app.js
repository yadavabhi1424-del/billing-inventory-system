import "dotenv/config";
import express      from "express";
import cors         from "cors";
import helmet       from "helmet";
import morgan       from "morgan";
import compression  from "compression";
import rateLimit    from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes          from "./modules/auth/auth.routes.js";
import userRoutes          from "./modules/users/user.routes.js";
import categoryRoutes      from "./modules/categories/category.routes.js";
import productRoutes       from "./modules/products/product.routes.js";
import supplierRoutes      from "./modules/suppliers/supplier.routes.js";
import customerRoutes      from "./modules/customers/customer.routes.js";
import billingRoutes       from "./modules/billing/billing.routes.js";
import stockRoutes         from "./modules/stock/stock.routes.js";
import purchaseOrderRoutes from "./modules/purchaseOrders/purchaseOrder.routes.js";
import reportRoutes        from "./modules/reports/report.routes.js";
import dashboardRoutes     from "./modules/dashboard/dashboard.routes.js";
import aiRoutes            from "./modules/ai/ai.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin:         [process.env.FRONTEND_URL || "http://localhost:5173"],
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
}));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  message: { success: false, message: "Too many requests. Try again later." },
}));

app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: "Too many login attempts. Try again later." },
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.use("/uploads", express.static(join(__dirname, "../uploads")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true, message: "StockSense Pro API is running!",
    version: "1.0.0", timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

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
app.use("/api/ai",              aiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;