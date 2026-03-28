import { Router } from "express";
import { protect }  from "../../middleware/auth.js";
import { createB2BOrder, getB2BOrders } from "./b2b.controller.js";

const router = Router();

router.use(protect);

router.post("/orders",   createB2BOrder);
router.get("/orders",    getB2BOrders);

export default router;
