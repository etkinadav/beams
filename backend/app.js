const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const userRoutes = require("./routes/user");
const branchesRoutes = require("./routes/branches");
const productsRoutes = require("./routes/products");
const papersRoutes = require("./routes/papers");
const filesRoutes = require("./routes/files");
const ordersRoutes = require("./routes/orders");

require('dotenv').config();

const app = express();

mongoose
    // Connection to eazix's real DB =>
    .connect(
        "mongodb+srv://nadavdev:" + process.env.MONGO_ATLAS_PW + "@production.z1wj1.mongodb.net/eazix?retryWrites=true&w=majority"
    )
    // Connection to nadav's fake DB =>
    // .connect(
    //     "mongodb+srv://etkinadav:" + "qeOGKkabON2W3XHv" + "@cluster0.a28kq1n.mongodb.net/node-angular?retryWrites=true&w=majority"
    // )
    .then(() => {
        console.log("Connected to database!");
    })
    .catch(() => {
        console.log("Connection failed!");
    });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/images", express.static(path.join("backend/images")));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );
    next();
});

// app.use("/api/posts", postsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/papers", papersRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/products", productsRoutes);

module.exports = app;
