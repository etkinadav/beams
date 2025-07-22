const express = require("express");

const OrdersController = require("../controllers/order")
const checkAuth = require("../middleware/check-auth");
const checkAuthPrivate = require("../middleware/check-auth-private");
const checkSU = require("../middleware/check-su");
const checkBM = require("../middleware/check-bm");

const router = express.Router();

router.get("/ordersforuser/:userId", checkAuthPrivate, OrdersController.getUserOrders);

router.get("/numofpendingorders/:userId", checkAuthPrivate, OrdersController.getUserNumOfPendingOrders);

router.post("/ordersformanager/:service/:branchId", checkAuth, checkBM, OrdersController.getOrdersForManager);

router.get("/pendingorder/:service/:orderId", OrdersController.getPendingOrder);

router.post("/createexpress", checkAuth, OrdersController.createExpressOrder);

router.put("/deleteorder/:service/:orderId", checkAuthPrivate, OrdersController.deleteOrder);

router.put("/deleteordersu/:service/:orderId", checkAuth, checkSU, OrdersController.deleteOrder);

router.post("/reportdata/:service/:branchId/:month/:year", checkAuth, checkBM, OrdersController.getReportData);

module.exports = router;
