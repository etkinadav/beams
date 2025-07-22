const express = require("express");

const PaperController = require("../controllers/papers");

const checkAuth = require("../middleware/check-auth");
const checkSU = require("../middleware/check-su");

const router = express.Router();

router.post("", checkAuth, checkSU, PaperController.createPaper);

router.put("/:id", checkAuth, checkSU, PaperController.updatePaper);

router.get("", PaperController.getPapers);

router.get("/allpapers", PaperController.getAllPapers);

router.get("/:id", PaperController.getPaper);

router.delete("/:id", checkAuth, checkSU, PaperController.deletePaper);

module.exports = router;
