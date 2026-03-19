import { Router }      from "express";
import { getAllOrders, getOrderById, createOrder,
         receiveOrder, updateStatus } from "./purchaseOrder.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect, adminOrOwner);
router.get("/",              getAllOrders);
router.get("/:id",           getOrderById);
router.post("/",             createOrder);
router.post("/:id/receive",  receiveOrder);
router.patch("/:id/status",  updateStatus);

export default router;