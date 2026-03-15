const router = require("express").Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  receiveOrder,
  updateStatus,
} = require("./purchaseOrder.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect, adminOrOwner);
router.get("/",                  getAllOrders);
router.get("/:id",               getOrderById);
router.post("/",                 createOrder);
router.post("/:id/receive",      receiveOrder);
router.patch("/:id/status",      updateStatus);

module.exports = router;