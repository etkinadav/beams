const jwt = require("jsonwebtoken");
const user = require("../models/user");
const Branch = require("../models/branch");
const Express_printer = require('../models/express_printer');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        console.log("branch.st!!!!!!!!!!!!0", decodedToken.roles);
        if (!decodedToken.roles || !decodedToken.roles.includes('su')) {
            if (decodedToken.roles && decodedToken.roles.includes('bm')) {
                const service = req.body.printingservice;
                const branchName = req.body.branch;
                if (!service || !branchName) {
                    throw new Error('Printing service and branch are required');
                }
                if (service === "plotter") {
                    const branch = await Branch.findOne({ serial_name: branchName });
                    if (!branch) {
                        throw new Error('Branch not found');
                    }
                    if (branch.bm.toString() !== decodedToken.userId) {
                        throw new Error('User is not authorized');
                    }
                } else if (service === "express") {
                    const printer = await Express_printer.findOne({ serial_name: branchName });
                    if (!printer) {
                        throw new Error('Printer not found');
                    }
                    if (printer.bm.toString() !== decodedToken.userId) {
                        throw new Error('User is not authorized');
                    }
                } else {
                    throw new Error('Printing service not found');
                }
            } else {
                console.log("branch.st!!!!!!!!!!!!7");
                if (decodedToken.roles && decodedToken.roles.includes('st')) {
                    const service = req.body.printingservice;
                    const branchName = req.body.branch;
                    if (!service || !branchName) {
                        throw new Error('Printing service and branch are required');
                    }
                    if (service === "plotter") {
                        const branch = await Branch.findOne({ serial_name: branchName });
                        if (!branch) {
                            throw new Error('Branch not found');
                        }
                        console.log("branch.st!!!!!!!!!!!!", branch.st, branch.st[0], branch.st[0].toString(), decodedToken.userId);
                        if (!branch.st.some(st => st.toString() === decodedToken.userId)) {
                            throw new Error('User is not authorized');
                        }
                    } else if (service === "express") {
                        const printer = await Express_printer.findOne({ serial_name: branchName });
                        if (!printer) {
                            throw new Error('Printer not found');
                        }
                        if (!printer.st.some(st => st.toString() === decodedToken.userId)) {
                            throw new Error('User is not authorized');
                        }
                    } else {
                        throw new Error('Printing service not found');
                    }
                } else {
                    throw new Error('User is not authorized');
                }
            }
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