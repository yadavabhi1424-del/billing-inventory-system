const router = require("express").Router();
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("./supplier.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect);
router.get("/",     getAllSuppliers);
router.get("/:id",  getSupplierById);
router.post("/",    adminOrOwner, createSupplier);
router.put("/:id",  adminOrOwner, updateSupplier);
router.delete("/:id", adminOrOwner, deleteSupplier);

module.exports = router;