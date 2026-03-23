import { Router }                          from "express";
import { getAllUsers, getUserById,
        createUser, updateUser, deleteUser, updateMyProfile }
from "./user.controller.js";
import { protect, adminOnly, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect);

router.get("/",              adminOnly,    getAllUsers);
router.get("/:id",           adminOrOwner, getUserById);
router.post("/",             adminOnly,    createUser);
router.put('/me',            protect,      updateMyProfile);
router.put("/:id",           adminOrOwner, updateUser);
router.delete("/:id",        adminOnly,    deleteUser);

export default router;