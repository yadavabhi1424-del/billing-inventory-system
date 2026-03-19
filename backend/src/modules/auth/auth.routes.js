import { Router }  from "express";
import {
  signup, verifyEmail, login, refreshToken, logout, getMe, changePassword,
} from "./auth.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

// Public
router.post("/signup",        signup);
router.get("/verify-email",   verifyEmail);
router.post("/login",         login);
router.post("/refresh-token", refreshToken);

// Protected
router.post("/logout",          protect, logout);
router.get("/me",               protect, getMe);
router.put("/change-password",  protect, changePassword);

export default router;