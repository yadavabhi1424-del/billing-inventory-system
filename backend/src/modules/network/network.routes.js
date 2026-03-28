import { Router } from "express";
import { protect }  from "../../middleware/auth.js";
import {
  getSupplierCatalog,
  getConnections,
  sendConnectionRequest,
  updateConnectionStatus,
} from "./network.controller.js";

const router = Router();

// Retrieve supplier's catalog (public but auth checked for convenience, could be public)
router.get("/supplier/:supplier_id/catalog", protect, getSupplierCatalog);

// Connections matching
router.get("/connections", protect, getConnections);
router.post("/connections", protect, sendConnectionRequest);
router.patch("/connections/:map_id", protect, updateConnectionStatus);

export default router;
