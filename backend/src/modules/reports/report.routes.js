import { Router }      from "express";
import { getSalesReport, getInventoryReport, getCustomerReport,
         getSupplierReport, getProfitLoss } from "./report.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect, adminOrOwner);
router.get("/sales",       getSalesReport);
router.get("/inventory",   getInventoryReport);
router.get("/customers",   getCustomerReport);
router.get("/suppliers",   getSupplierReport);
router.get("/profit-loss", getProfitLoss);

export default router;