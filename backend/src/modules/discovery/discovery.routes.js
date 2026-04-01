import { Router } from "express";
import { getDiscovery, getProfileBySlug, upsertProfile, getOwnProfile, getCatalog } from "./discovery.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

router.get("/",        protect, getDiscovery); 
router.get("/own-profile", protect, getOwnProfile);
router.get("/supplier/:id/catalog", protect, getCatalog);
router.get("/:slug",   getProfileBySlug);   
router.post("/profile", protect, upsertProfile); 

export default router;
