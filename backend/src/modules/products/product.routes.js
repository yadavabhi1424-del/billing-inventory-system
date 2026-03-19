import { Router }     from "express";
import { getAllProducts, getProductById, getProductBySku,
         getLowStockProducts, createProduct,
         updateProduct, deleteProduct } from "./product.controller.js";
import { protect, adminOrOwner }       from "../../middleware/auth.js";
import upload                          from "../../middleware/upload.js";

const router = Router();

router.use(protect);
router.get("/",           getAllProducts);
router.get("/low-stock",  getLowStockProducts);
router.get("/sku/:sku",   getProductBySku);
router.get("/:id",        getProductById);
router.post("/",          adminOrOwner, upload.single("image"), createProduct);
router.put("/:id",        adminOrOwner, upload.single("image"), updateProduct);
router.delete("/:id",     adminOrOwner, deleteProduct);

export default router;