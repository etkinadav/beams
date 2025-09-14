const express = require("express");

const UserController = require("../controllers/user")
const checkAuth = require("../middleware/check-auth");
const checkAuthPrivate = require("../middleware/check-auth-private");
const checkSU = require("../middleware/check-su");

const router = express.Router();

router.post("/signup", UserController.createUser);

router.post("/login", UserController.userLogin);

router.post("/checkemail", UserController.userCheckEmail);

router.get("/auth/facebook/callback", UserController.facebookLoginCallback);
router.get("/auth/facebook", UserController.facebookLogin);

router.get("/auth/google/callback", UserController.googleLoginCallback);
router.get("/auth/google", UserController.googleLogin);

// router.post("/social", UserController.socialLogin);

router.get("", checkAuth, checkSU, UserController.getUsers);

router.get("/:id", UserController.getUser);

router.delete("/:id", checkAuth, checkSU, UserController.deleteUser);

router.put("/:id", checkAuth, UserController.updateUserPlace);

router.put("/language/:id", checkAuth, UserController.updateUserLanguage);

router.put("/usermanagement/:id", checkAuth, checkSU, UserController.updateUserManagement);

router.put("/userprofile/:id", checkAuthPrivate, UserController.updateUserProfile);

router.put("/userprofilemaniger/:id", checkAuth, checkSU, UserController.updateUserProfileManiger);

router.put("/userphone/:id", checkAuthPrivate, UserController.updateUserPhone);

router.put("/usercc/:id", checkAuthPrivate, UserController.setCC);

router.put("/usercc/delete/:id", checkAuthPrivate, UserController.deleteCC);

router.put("/deleteuserccmaniger/:id", checkAuth, checkSU, UserController.deleteCCManiger);

router.post("/update-points/:id", checkAuth, checkSU, UserController.updatePoints);

// Beam configuration endpoints
router.post("/beam-configuration", checkAuth, UserController.saveBeamConfiguration);
router.get("/beam-configuration", checkAuth, UserController.getBeamConfiguration);

module.exports = router;
