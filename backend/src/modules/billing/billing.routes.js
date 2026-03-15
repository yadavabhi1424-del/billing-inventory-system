const router = require("express").Router();
const {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  getByInvoiceNumber,
  returnTransaction,
  getTodaySummary,
} = require("./billing.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect);
router.get("/",                          getAllTransactions);
router.get("/today-summary",             getTodaySummary);
router.get("/invoice/:invoiceNumber",    getByInvoiceNumber);
router.get("/:id",                       getTransactionById);
router.post("/",                         createTransaction);
router.post("/:id/return", adminOrOwner, returnTransaction);

module.exports = router;