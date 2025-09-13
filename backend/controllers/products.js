const Product = require("../models/product");
const User = require('../models/user');

const e = require("express");
const ObjectId = require('mongoose').Types.ObjectId;

exports.getProductById = async (req, res, next) => {
    const id = req.params.id;
    console.log('Fetching product with ID:', id);
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
    }
    try {
        // הדפסת כל ה-IDs הקיימים בקולקשן
        const allProducts = await Product.find({}, { _id: 1 });
        console.log('All product IDs in DB:', allProducts.map(p => p._id.toString()));

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: "Fetching product failed!" });
    }
};
