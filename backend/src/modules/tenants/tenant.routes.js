import { Router }          from "express";
import { registerTenant, getPlans } from "./tenant.controller.js";

const router = Router();

router.post("/register", registerTenant);
router.get("/plans",     getPlans);

export default router;