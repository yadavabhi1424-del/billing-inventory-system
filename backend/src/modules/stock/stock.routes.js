const router = require("express").Router();
const { getMovements, adjustStock, bulkAdjust } = require("./stock.controller");
const { protect, adminOrOwner } = require("../../middleware/auth");

router.use(protect);
router.get("/movements",      getMovements);
router.post("/adjust",        adminOrOwner, adjustStock);
router.post("/bulk-adjust",   adminOrOwner, bulkAdjust);

module.exports = router;