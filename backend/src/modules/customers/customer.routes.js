const router = require("express").Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("./customer.controller");
const { protect } = require("../../middleware/auth");

router.use(protect);
router.get("/",       getAllCustomers);
router.get("/:id",    getCustomerById);
router.post("/",      createCustomer);
router.put("/:id",    updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;