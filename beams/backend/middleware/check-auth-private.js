const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        req.userData = {
            email: decodedToken.email,
            userId: decodedToken.userId,
        };
        if (req.params.id && req.params.id !== req.userData.userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    } catch (error) {
        res.status(401).json({ message: "Check_auth-Auth-Faild-token-incorrect-privite" })
    }
}