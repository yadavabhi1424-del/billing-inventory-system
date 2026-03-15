const router = require("express").Router();
const {
  getSalesReport,
  getInventoryReport,
  getCustomerReport,
  getSupplierReport,
  getProfitLoss,
} = require("./report.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect, adminOrOwner);
router.get("/sales",      getSalesReport);
router.get("/inventory",  getInventoryReport);
router.get("/customers",  getCustomerReport);
router.get("/suppliers",  getSupplierReport);
router.get("/profit-loss", getProfitLoss);

module.exports = router;