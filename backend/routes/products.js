const express = require("express");

const ProductController = require("../controllers/products");

const checkSU = require("../middleware/check-su");
const extractFile = require("../middleware/file");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.post("", checkAuth, checkSU, extractFile, ProductController.createProduct);

router.put("/:id", checkAuth, checkSU, extractFile, ProductController.updateProduct);

router.get("", ProductController.getProducts);

router.get("/allproducts", ProductController.getAllProducts);

router.get("/:id", ProductController.getProduct);

router.get("/productbyid/:product", ProductController.getProductById);

router.get("/productbyname/:product", ProductController.getProductByName);

router.get("/unique/:unique", ProductController.getProductByUnique);

router.delete("/:id", checkAuth, checkSU, ProductController.deleteProduct);

module.exports = router;





