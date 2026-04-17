import { Router } from "express";
import {
  getSalesReport, getDetailedSalesReport, getCategoryAnalytics, getReturnsAnalysis,
  getInventoryReport, getCustomerReport, getSupplierReport,
  getProfitLoss, getSupplierOrderHistory
} from "./report.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect, adminOrOwner);

// Existing
router.get("/sales",                          getSalesReport);
router.get("/inventory",                      getInventoryReport);
router.get("/customers",                      getCustomerReport);
router.get("/suppliers",                      getSupplierReport);
router.get("/supplier-orders/:supplierId",    getSupplierOrderHistory);
router.get("/profit-loss",                    getProfitLoss);

// New
router.get("/sales/detailed",                 getDetailedSalesReport);
router.get("/sales/categories",               getCategoryAnalytics);
router.get("/returns",                        getReturnsAnalysis);

export default router;