import { Router } from "express";
import { protect }  from "../../middleware/auth.js";
import {
  createB2BOrder,
  getB2BOrders,
  getB2BOrderById,
  updateB2BOrderStatus
} from "./b2b.controller.js";

const router = Router();

router.use(protect);

router.post("/orders", (req, res, next) => {
  console.log("🚀 ROUTE HIT");
  next();
}, createB2BOrder);
router.get("/orders",           getB2BOrders);
router.get("/orders/:id",       getB2BOrderById);
router.patch("/orders/:id/status", updateB2BOrderStatus);

export default router;
