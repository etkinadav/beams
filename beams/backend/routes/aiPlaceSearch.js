const express = require("express");
const router = express.Router();
const aiPlaceSearchController = require("../controllers/aiPlaceSearch");

router.post("/", aiPlaceSearchController.search);

module.exports = router;
