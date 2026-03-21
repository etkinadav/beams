const express = require("express");
const router = express.Router();
const agronomistQueryController = require("../controllers/agronomistquery");

router.post("/", agronomistQueryController.create);
router.get("/:id", agronomistQueryController.getById);

module.exports = router;
