const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        if (!decodedToken.roles || !decodedToken.roles.includes('su')) {
            throw new Error('User is not a super user');
        }
        req.userData = {
            email: decodedToken.email,
            userId: decodedToken.userId,
            roles: decodedToken.roles
        };

        next();
    } catch (error) {
        res.status(401).json({ message: "Check_su-Access-denied-not-authorized-su" })
    }
}