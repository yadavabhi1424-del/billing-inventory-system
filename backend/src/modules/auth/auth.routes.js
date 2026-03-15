const router = require("express").Router();
const {
  signup,
  verifyEmail,
  login,
  refreshToken,
  logout,
  getMe,
  changePassword,
} = require("./auth.controller");
const { protect } = require("../../middleware/auth");

// Public routes
router.post("/signup",        signup);
router.get("/verify-email",   verifyEmail);
router.post("/login",         login);
router.post("/refresh-token", refreshToken);

// Protected routes
router.post("/logout",           protect, logout);
router.get("/me",                protect, getMe);
router.put("/change-password",   protect, changePassword);

module.exports = router;