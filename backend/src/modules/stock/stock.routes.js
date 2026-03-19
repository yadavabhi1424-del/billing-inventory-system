import { Router }                        from "express";
import { getMovements, adjustStock, bulkAdjust } from "./stock.controller.js";
import { protect, adminOrOwner }         from "../../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/movements",    getMovements);
router.post("/adjust",      adminOrOwner, adjustStock);
router.post("/bulk-adjust", adminOrOwner, bulkAdjust);

export default router;