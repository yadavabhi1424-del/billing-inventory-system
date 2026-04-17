import { Router } from "express";
import { protect }  from "../../middleware/auth.js";
import {
  createB2BOrder,
  getB2BOrders,
  getB2BOrderById,
  updateB2BOrderStatus,
  createB2BReturn,
  getB2BReturns,
  processB2BReturn,
  rejectB2BReturn,
  markB2BItemSynced,
  getAllB2BReturns
} from "./b2b.controller.js";

const router = Router();

router.use(protect);

router.post("/orders", (req, res, next) => {
  console.log("🚀 ROUTE HIT");
  next();
}, createB2BOrder);
router.get("/orders",                 getB2BOrders);
router.get("/orders/:id",             getB2BOrderById);
router.patch("/orders/:id/status",    updateB2BOrderStatus);
router.post("/orders/:id/return",     createB2BReturn);
router.get("/orders/:id/returns",     getB2BReturns);
router.patch("/orders/:id/returns/:returnId/process", processB2BReturn);
router.patch("/orders/:id/returns/:returnId/reject", rejectB2BReturn);
router.get("/returns",                getAllB2BReturns);
router.post("/orders/:id/items/:itemId/mark-synced", markB2BItemSynced);

export default router;
