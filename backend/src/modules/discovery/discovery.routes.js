import { Router } from "express";
import { getDiscovery, getProfileBySlug, upsertProfile } from "./discovery.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

router.get("/",        getDiscovery);       // public
router.get("/:slug",   getProfileBySlug);   // public
router.post("/profile", protect, upsertProfile); // auth required

export default router;
