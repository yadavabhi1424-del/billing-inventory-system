const router = require("express").Router();
const {
  getAllUsers,
  getPendingUsers,
  getUserById,
  createUser,
  updateUser,
  approveUser,
  rejectUser,
  deleteUser,
} = require("./user.controller");
const { protect, adminOnly, adminOrOwner } = require("../../middleware/auth");

router.use(protect);

// Admin only
router.get("/",                adminOnly,    getAllUsers);
router.get("/pending",         adminOnly,    getPendingUsers);
router.get("/:id",             adminOrOwner, getUserById);
router.post("/",               adminOnly,    createUser);
router.put("/:id",             adminOrOwner, updateUser);
router.patch("/:id/approve",   adminOnly,    approveUser);
router.patch("/:id/reject",    adminOnly,    rejectUser);
router.delete("/:id",          adminOnly,    deleteUser);

module.exports = router;