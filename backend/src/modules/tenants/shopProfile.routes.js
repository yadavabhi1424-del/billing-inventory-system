import { Router }       from "express";
import { getShopTypes, saveShopProfile, getShopProfile } from "./shopProfile.controller.js";
import { protect }      from "../../middleware/auth.js";

const router = Router();

router.get("/shop-types",  getShopTypes);
router.get("/profile",     protect, getShopProfile);
router.post("/profile",    protect, saveShopProfile);

export default router;