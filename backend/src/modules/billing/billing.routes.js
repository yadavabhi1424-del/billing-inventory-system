import { Router }      from "express";
import { createTransaction, getAllTransactions, getTransactionById,
         getByInvoiceNumber, returnTransaction, getReturnsByInvoice, getTodaySummary } from "./billing.controller.js";
import { protect, adminOrOwner } from "../../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/",                         getAllTransactions);
router.get("/today-summary",            getTodaySummary);
router.get("/invoice/:invoiceNumber",   getByInvoiceNumber);
router.get("/:id",                      getTransactionById);
router.get("/:id/returns",              getReturnsByInvoice);
router.post("/",                        createTransaction);
router.post("/:id/return", adminOrOwner, returnTransaction);

export default router;