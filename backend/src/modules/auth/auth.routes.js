import { Router }  from "express";
import {
  signup, verifyEmail, resendOtp, login, googleAuth,
  forgotPassword, verifyResetOtp, resetPassword,
  refreshToken, logout, getMe, changePassword,
  verifyMember, getInviteDetails, acceptInvite
} from "./auth.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

// Public
router.post("/signup",           signup);
router.post("/verify-email",     verifyEmail);
router.post("/resend-otp",       resendOtp);
router.post("/login",            login);
router.post("/google",           googleAuth);
router.post("/forgot-password",  forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password",   resetPassword);
router.post("/refresh-token",    refreshToken);

router.post("/verify-member",    verifyMember);
router.get("/invite/:token",     getInviteDetails);
router.post("/accept-invite",    acceptInvite);

// Protected
router.post("/logout",          protect, logout);
router.get("/me",               protect, getMe);
router.put("/change-password",  protect, changePassword);

export default router;