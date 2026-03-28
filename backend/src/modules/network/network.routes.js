import { Router } from "express";
import { protect }  from "../../middleware/auth.js";
import {
  getSupplierCatalog,
  getConnections,
  sendConnectionRequest,
  updateConnectionStatus,
} from "./network.controller.js";

const router = Router();

// Retrieve supplier's catalog (specific supplier)
router.get("/supplier/:supplier_id/catalog", protect, getSupplierCatalog);

// NEW: Global B2B browsing for Shops (accepted connections only)
import { getB2BProducts } from "./network.controller.js";
router.get("/b2b-products", protect, getB2BProducts);

// Connections matching
router.get("/connections", protect, getConnections);
router.post("/connections", protect, sendConnectionRequest);
router.patch("/connections/:map_id", protect, updateConnectionStatus);

export default router;
