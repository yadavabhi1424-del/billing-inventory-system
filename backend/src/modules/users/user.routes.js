import { Router }                          from "express";
import { getAllUsers, getPendingUsers, getUserById,
         createUser, updateUser, approveUser,
         rejectUser, deleteUser }          from "./user.controller.js";
import { protect, adminOnly, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/",              adminOnly,    getAllUsers);
router.get("/pending",       adminOnly,    getPendingUsers);
router.get("/:id",           adminOrOwner, getUserById);
router.post("/",             adminOnly,    createUser);
router.put("/:id",           adminOrOwner, updateUser);
router.patch("/:id/approve", adminOnly,    approveUser);
router.patch("/:id/reject",  adminOnly,    rejectUser);
router.delete("/:id",        adminOnly,    deleteUser);

export default router;