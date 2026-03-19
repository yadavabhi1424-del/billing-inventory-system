import { Router } from "express";
import { getAllCustomers, getCustomerById,
         createCustomer, updateCustomer, deleteCustomer } from "./customer.controller.js";
import { protect } from "../../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/",       getAllCustomers);
router.get("/:id",    getCustomerById);
router.post("/",      createCustomer);
router.put("/:id",    updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;