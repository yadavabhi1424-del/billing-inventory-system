import { Router }      from "express";
import { getAllSuppliers, getSupplierById,
         createSupplier, updateSupplier, deleteSupplier } from "./supplier.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/",       getAllSuppliers);
router.get("/:id",    getSupplierById);
router.post("/",      adminOrOwner, createSupplier);
router.put("/:id",    adminOrOwner, updateSupplier);
router.delete("/:id", adminOrOwner, deleteSupplier);

export default router;