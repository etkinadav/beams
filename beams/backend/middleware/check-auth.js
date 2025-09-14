const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        // console.log("token in check-auth.js:");
        // console.log(token);
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = {
            email: decodedToken.email,
            userId: decodedToken.userId,
        };
        next();
    } catch (error) {
        console.log("error in check-auth.js:")
        console.log(error)
        res.status(401).json({ message: "Check_auth-Auth-Faild-token-incorrect" })
    }
}