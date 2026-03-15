const router = require("express").Router();
const { getDashboard } = require("./dashboard.controller");
const { protect } = require("../../middleware/auth");

router.use(protect);
router.get("/", getDashboard);

module.exports = router;