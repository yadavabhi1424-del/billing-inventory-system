const router  = require("express").Router();
const {
  getAllProducts,
  getProductById,
  getProductBySku,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("./product.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");
const upload = require("../../middleware/upload");

router.use(protect);
router.get("/",            getAllProducts);
router.get("/low-stock",   getLowStockProducts);
router.get("/sku/:sku",    getProductBySku);
router.get("/:id",         getProductById);
router.post("/",           adminOrOwner, upload.single("image"), createProduct);
router.put("/:id",         adminOrOwner, upload.single("image"), updateProduct);
router.delete("/:id",      adminOrOwner, deleteProduct);

module.exports = router;