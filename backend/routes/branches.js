const express = require("express");

const BranchController = require("../controllers/branches");

const checkSU = require("../middleware/check-su");
const checkAuth = require("../middleware/check-auth");
const extractFile = require("../middleware/file");
const checkST = require("../middleware/check-st");

const router = express.Router();

router.post("", checkAuth, checkSU, extractFile, BranchController.createBranch);

router.put("/:id", checkAuth, checkSU, extractFile, BranchController.updateBranch);

router.get("", BranchController.getBranches);

router.get("/allbranches", BranchController.getAllBranches);

router.get("/branchscanningstatus/:branchId/:userId", BranchController.getBranchScanningStatus);

router.get("/quedata/:service/:idArray", BranchController.getQueueStatus);

router.get("/:id", BranchController.getBranch);

router.get("/branchbyid/:service/:branch", BranchController.getBranchById);

router.get("/branchbyname/:service/:branch", BranchController.getBranchByName);

router.get("/unique/:unique", BranchController.getBranchByUnique);

router.delete("/:id", checkAuth, checkSU, BranchController.deleteBranch);

router.put("/openorclosequeue/:id", checkAuth, checkST, BranchController.openOrCloseQueue);

router.put("/openorcloseslack/:id", checkAuth, checkST, BranchController.openOrCloseSlack);

router.get("/checkbranchstatus/:service/:branch", BranchController.checkBranchStatus);

router.put("/closebranch/:service/:branch", checkAuth, checkST, BranchController.closeBranch);

router.put("/openbranch/:service/:branch", checkAuth, checkST, BranchController.openBranch);

router.put("/updateinventory/:id", checkAuth, checkST, BranchController.updateInventory);

router.put("/replacebm/:printingService/:branchId", checkAuth, checkSU, BranchController.replaceBm);

router.put("/removest/:printingService/:branchId", checkAuth, checkSU, BranchController.removeSt);

router.put("/addst/:printingService/:branchId", checkAuth, checkSU, BranchController.addSt);

router.put("/replaceconsumable/:printingService/:branchId", checkAuth, checkST, BranchController.replaceConsumable);

module.exports = router;





