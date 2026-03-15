const router = require("express").Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("./category.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect);
router.get("/",     getAllCategories);
router.get("/:id",  getCategoryById);
router.post("/",    adminOrOwner, createCategory);
router.put("/:id",  adminOrOwner, updateCategory);
router.delete("/:id", adminOrOwner, deleteCategory);

module.exports = router;