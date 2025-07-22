const Product = require("../models/product");
const User = require('../models/user');

const e = require("express");
const ObjectId = require('mongoose').Types.ObjectId;

exports.createProduct = async (req, res, next) => {
    try {
        const url = req.protocol + "://" + req.get("host");
        const product = new Product({
            name: req.body.name,
        });
        const createdProduct = await product.save();

        res.status(201).json({
            message: "Product added successfully",
            product: {
                ...createdProduct.toObject(),
                id: createdProduct._id
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Creating a product failed!",
            error: error.message
        });
    }
};

exports.updateProduct = async (req, res, next) => {
    let image = req.body.image;

    if (req.file) {
        const url = req.protocol + "://" + req.get("host");
        image = url + "/images/" + req.file.filename;
    }
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found!" });
        }
        product.name = req.body.name;
        await product.save();

        res.status(200).json({ message: "Update successful!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Couldn't update product!",
            error: error.message
        });
    }
};

exports.getProducts = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const ProductQuery = Product.find();
    let fetchedProducts;
    if (pageSize && currentPage) {
        ProductQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    ProductQuery
        .then(documents => {
            fetchedProducts = documents;
            return Product.count();
        })
        .then(count => {
            res.status(200).json({
                message: "Products fetched successfully!",
                products: fetchedProducts,
                maxProducts: count
            });
        })
        .catch(error => {
            console.error('Error during population:', error);
            res.status(500).json({
                message: "Fetching products failed!"
            });
        });
};

exports.getProduct = (req, res, next) => {
    Product.findById(req.params.id)
        .then(product => {
            if (product) {
                res.status(200).json(product);
            } else {
                res.status(404).json({ message: "Product not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching product failed!"
            });
        });
};

exports.getProductById = (req, res, next) => {
    const product = req.params.product;
    // console.log("getProductById", product, service);

    Product.findById(product)
        .then(product => {
            if (product) {
                console.log("getProductById *************", product);
                res.status(200).json(product);
            } else {
                res.status(404).json({ message: "Product not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching product failed!"
            });
        });
};

exports.getProductByName = (req, res, next) => {
    const product = req.params.product;
    // console.log("getProductByName", product);
    Product.findOne({ name: product })
        .then(product => {
            if (product) {
                console.log("getProductByName *************", product);
                res.status(200).json(product);
            } else {
                res.status(404).json({ message: "Product not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching product failed!"
            });
        });
};

exports.getProductByUnique = (req, res, next) => {
    const NumberUnique = Number(req.params.unique);
    // console.log("getProductByUnique", NumberUnique)
    Product.findOne({ unique: NumberUnique })
        .then(product => {
            if (product) {
                res.status(200).json(product);
            } else {
                res.status(404).json({ message: "Product not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching product failed!"
            });
        });
};

exports.deleteProduct = (req, res, next) => {
    Product.deleteOne({ _id: req.params.id })
        .then(result => {
            if (result.deletedCount > 0) {
                res.status(200).json({ message: "Deletion successful!" });
            } else {
                res.status(401).json({ message: "Not authorized!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Deleting posts failed!"
            });
        });
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const products = await Product.find({ hide: { $ne: true } })
        res.status(200).json({
            message: "All products fetched successfully!",
            products: products
        });
    } catch (error) {
        res.status(500).json({
            message: "Products_Fetching-all-products-failed"
        });
    }
};

