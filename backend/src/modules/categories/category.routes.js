import { Router }      from "express";
import { getAllCategories, getCategoryById,
         createCategory, updateCategory, deleteCategory } from "./category.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/",       getAllCategories);
router.get("/:id",    getCategoryById);
router.post("/",      adminOrOwner, createCategory);
router.put("/:id",    adminOrOwner, updateCategory);
router.delete("/:id", adminOrOwner, deleteCategory);

export default router;