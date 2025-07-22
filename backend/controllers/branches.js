const Branch = require("../models/branch");
const Paper = require('../models/paper');
const Printer = require('../models/printer');
const User = require('../models/user');
const Express_printer = require('../models/express_printer');

const e = require("express");
const branch = require("../models/branch");
const { populate } = require("../models/order-express");
const ObjectId = require('mongoose').Types.ObjectId;
const fix_product = require("../models/fix_product");

exports.createBranch = async (req, res, next) => {
    try {
        const url = req.protocol + "://" + req.get("host");
        const branch = new Branch({
            serial_name: req.body.serial_name,
            close: req.body.close,
            close_msg: req.body.close_msg,
            domain: req.body.domain,
            downgraded: req.body.downgraded,
            email: req.body.email,
            hide: req.body.hide,
            hotjarID: req.body.hotjarID,
            inform_slack_of_new_orders: req.body.inform_slack_of_new_orders,
            isPlotter: true,
            is_express: false,
            location: req.body.location,
            name: req.body.name,
            short_name: req.body.short_name,
            slack_url: req.body.slack_url,
            sort: req.body.sort,
            Papers: [],
        });
        const createdBranch = await branch.save();

        const printer = new Printer({
            name: req.body.name,
            branch: createdBranch._id,
            inputBins: []
        });

        let papers = req.body.papers;
        if (typeof papers === 'string') {
            papers = JSON.parse(papers);
        }
        if (Array.isArray(papers)) {
            printer.inputBins = [];

            papers.forEach((paperId, index) => {
                printer.inputBins.push({
                    physicalInputBin: `inputbin_p${index + 1}`,
                    paperType: new ObjectId(paperId),
                    status: {
                        orientation: 'short_edge_feed',
                        detection: true,
                        lingerLength: 0,
                        lingerPercent: 0,
                        position: 'loaded',
                        paperNeeded: 0,
                        enableReplace: false
                    },
                });
            });
            await printer.save();
        } else {
            console.error('papers is not an array');
        }

        res.status(201).json({
            message: "Branch added successfully",
            branch: {
                ...createdBranch.toObject(),
                id: createdBranch._id
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Creating a branch failed!",
            error: error.message
        });
    }
};

exports.updateBranch = async (req, res, next) => {
    let image = req.body.image;

    if (req.file) {
        const url = req.protocol + "://" + req.get("host");
        image = url + "/images/" + req.file.filename;
    }
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found!" });
        }
        branch.serial_name = req.body.serial_name;
        branch.close = req.body.close;
        branch.close_msg = req.body.close_msg;
        branch.domain = req.body.domain;
        branch.downgraded = req.body.downgraded;
        branch.email = req.body.email;
        branch.hide = req.body.hide;
        branch.hotjarID = req.body.hotjarID;
        branch.inform_slack_of_new_orders = req.body.inform_slack_of_new_orders;
        branch.location = req.body.location;
        branch.name = req.body.name;
        branch.short_name = req.body.short_name;
        branch.slack_url = req.body.slack_url;
        branch.sort = req.body.sort;
        await branch.save();

        const printerId = branch.printers[0]._id.toString();
        const printer = await Printer.findById(printerId);
        if (!printer) {
            return res.status(404).json({ message: "Printer not found!" });
        }

        let papers = req.body.papers;
        if (typeof papers === 'string') {
            papers = JSON.parse(papers);
        }
        if (Array.isArray(papers)) {
            printer.inputBins = [];

            papers.forEach((paperId, index) => {
                printer.inputBins.push({
                    physicalInputBin: `inputbin_p${index + 1}`,
                    paperType: new ObjectId(paperId),
                    status: {
                        orientation: 'short_edge_feed',
                        detection: true,
                        lingerLength: 0,
                        lingerPercent: 0,
                        position: 'loaded',
                        paperNeeded: 0,
                        enableReplace: false
                    },
                });
            });
            await printer.save();
        } else {
            console.error('papers is not an array');
        }

        res.status(200).json({ message: "Update successful!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Couldn't update branch!",
            error: error.message
        });
    }
};

exports.getBranches = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const BranchQuery = Branch.find();
    let fetchedBranches;
    if (pageSize && currentPage) {
        BranchQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    BranchQuery
        .populate({
            path: 'printers',
            populate: {
                path: 'inputBins.paperType',
                model: 'Paper'
            }
        })
        .populate('bm')
        .populate({
            path: 'st',
            model: 'User'
        })
        .then(documents => {
            fetchedBranches = documents;
            return Branch.count();
        })
        .then(count => {
            res.status(200).json({
                message: "Branches fetched successfully!",
                branches: fetchedBranches,
                maxBranches: count
            });
        })
        .catch(error => {
            console.error('Error during population:', error);
            res.status(500).json({
                message: "Fetching branches failed!"
            });
        });
};

exports.getBranch = (req, res, next) => {
    Branch.findById(req.params.id)
        .populate({
            path: 'printers',
            populate: {
                path: 'inputBins.paperType',
                model: 'Paper'
            }
        })
        .populate('bm')
        .populate({
            path: 'st',
            model: 'User'
        })
        .then(branch => {
            if (branch) {
                res.status(200).json(branch);
            } else {
                res.status(404).json({ message: "Branch not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching branch failed!"
            });
        });
};

exports.getBranchById = (req, res, next) => {
    const service = req.params.service;
    const branch = req.params.branch;
    // console.log("getBranchById", branch, service);

    if (service === 'plotter') {
        Branch.findById(branch)
            .populate({
                path: 'printers',
                populate: [
                    {
                        path: 'inputBins.paperType',
                        model: 'Paper'
                    },
                    {
                        path: 'printerQueue',
                        model: 'Order'
                    },
                    {
                        path: 'queue',
                        model: 'Order'
                    }
                ]
            })
            .populate('bm')
            .populate({
                path: 'st',
                model: 'User'
            })
            .then(branch => {
                if (branch) {
                    console.log("getBranchById *************", branch);
                    res.status(200).json(branch);
                } else {
                    res.status(404).json({ message: "Branch not found!" });
                }
            })
            .catch(error => {
                res.status(500).json({
                    message: "Fetching branch failed!"
                });
            });
    } else if (service === 'express') {
        Express_printer.findById(branch)
            .populate('bm')
            .populate({
                path: 'queue.printerQueue',
                model: 'OrderExpress',
                populate: {
                    path: 'files',
                    model: 'FileExpress'
                }
            })
            .then(branch => {
                if (branch) {
                    res.status(200).json(branch);
                } else {
                    res.status(404).json({ message: "Branch not found!" });
                }
            })
            .catch(error => {
                res.status(500).json({
                    message: "Fetching branch failed!"
                });
            });

    } else {
        res.status(500).json({
            message: "Fetching branch failed!"
        });
    }
};

exports.getBranchByName = (req, res, next) => {
    const service = req.params.service;
    const branch = req.params.branch;
    // console.log("getBranchByName", branch, service);
    if (service === 'plotter') {
        Branch.findOne({ serial_name: branch })
            .then(branch => {
                if (branch) {
                    console.log("getBranchById *************", branch);
                    res.status(200).json(branch._id);
                } else {
                    res.status(404).json({ message: "Branch not found!" });
                }
            })
            .catch(error => {
                res.status(500).json({
                    message: "Fetching branch failed!"
                });
            });
    } else if (service === 'express') {
        Express_printer.findOne({ serial_name: branch })
            .then(branch => {
                if (branch) {
                    res.status(200).json(branch);
                } else {
                    res.status(404).json({ message: "Branch not found!" });
                }
            })
            .catch(error => {
                res.status(500).json({
                    message: "Fetching branch failed!"
                });
            });

    } else {
        res.status(500).json({
            message: "Fetching branch failed!"
        });
    }
};

exports.getBranchByUnique = (req, res, next) => {
    const NumberUnique = Number(req.params.unique);
    // console.log("getBranchByUnique", NumberUnique)
    Branch.findOne({ unique: NumberUnique })
        .populate({
            path: 'printers',
            populate: [
                {
                    path: 'inputBins.paperType',
                    model: 'Paper'
                },
                {
                    path: 'printerQueue',
                    model: 'Order'
                },
                {
                    path: 'queue',
                    model: 'Order'
                }
            ]
        })
        .populate('bm')
        .populate({
            path: 'st',
            model: 'User'
        })
        .then(branch => {
            if (branch) {
                res.status(200).json(branch);
            } else {
                res.status(404).json({ message: "Branch not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Fetching branch failed!"
            });
        });
};

exports.deleteBranch = (req, res, next) => {
    Branch.deleteOne({ _id: req.params.id })
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

exports.getAllBranches = async (req, res, next) => {
    const newBranches = [];
    try {
        const branches = await Branch.find({ hide: { $ne: true } })
            .populate({
                path: 'printers',
                populate: {
                    path: 'inputBins.paperType',
                    model: 'Paper'
                }
            })
            .populate('bm')
            .populate({
                path: 'st',
                model: 'User'
            })
        const plotterBranchesSerial = [];
        branches.forEach(branch => {
            if (branch.is_express === false) {
                const newPlotterBranch = {};
                newPlotterBranch.name = branch.serial_name;
                newPlotterBranch.plotter = branch;
                newBranches.push(newPlotterBranch);
                plotterBranchesSerial.push(branch.serial_name);
            }
        });
        const expressPrinters = await Express_printer.find({}, '-scan.scan -status.image')
            .populate('bm')
            .populate({
                path: 'fix_products.productId',
                model: 'Fix_Product'
            })
        expressPrinters.forEach(expressPrinter => {
            if (expressPrinter.status.hide !== true) {
                if (plotterBranchesSerial.includes(expressPrinter.serial_name)) {
                    newBranches.forEach(branch => {
                        // delete expressPrinter scan and branch screen
                        if (branch.name === expressPrinter.serial_name) {
                            branch.express = expressPrinter;
                        }
                    });
                } else {
                    const newExpressBranch = {};
                    newExpressBranch.name = expressPrinter.serial_name;
                    newExpressBranch.express = expressPrinter;
                    newBranches.push(newExpressBranch);
                }
            }
        });
        res.status(200).json({
            message: "All branches fetched successfully!",
            branches: newBranches
        });
    } catch (error) {
        res.status(500).json({
            message: "Branches_Fetching-all-branches-failed"
        });
    }
};

exports.getBranchScanningStatus = async (req, res, next) => {
    const branchId = req.params.branchId;
    const userId = req.params.userId;
    try {
        const printer = await Express_printer
            .findOne({ _id: branchId });
        let scanningStatus;
        if (printer.scan.last_scan_completed > printer.scan.last_scan_requested) {
            scanningStatus = "ready";
        } else {
            const printerUserId = printer.scan.userID.toHexString();
            if (printerUserId === userId) {
                scanningStatus = "scanning";
            } else {
                scanningStatus = "occupied";
            }
        }
        res.status(200).json({
            message: "Calculating scanning statussuccessfully!",
            scanningStatus: scanningStatus
        });
    } catch (error) {
        res.status(500).json({
            message: "Branches_Get-scanning-status-failed"
        });
    }
};

exports.getQueueStatus = async (req, res, next) => {
    const service = req.params.service;
    const idArray = req.params.idArray;
    let idArrayObject = [];

    const ids = idArray.split(',');
    for (const id of ids) {
        idArrayObject.push(id);
    }
    let branches = [];
    try {
        if (service === 'plotter') {
            branches = await Branch.find({
                _id: { $in: idArrayObject }
            }).populate({
                path: 'printers',
                populate: [
                    {
                        path: 'inputBins.paperType',
                        model: 'Paper'
                    },
                    {
                        path: 'printerQueue',
                        model: 'Order'
                    },
                    {
                        path: 'queue',
                        model: 'Order'
                    }
                ]
            });
        } else if (service === 'express') {
            branches = await Express_printer.find({ _id: { $in: idArrayObject } })
                .populate('queue.printerQueue').select('-scan -status.image -pricing -printnode -fix_products')
                .exec();
        }
        res.status(200).json({
            message: "Queue statuses fetched successfully!",
            fetchedBranches: [...branches]
        });
    } catch (error) {
        res.status(500).json({
            message: "Branches_Get-que-status-failed"
        });
    }
}

exports.openOrCloseQueue = async (req, res, next) => {
    console.log("openOrCloseQueue");
    const branchId = req.params.id;
    const isOpen = req.body.isOpen;
    try {
        const branch = await Branch
            .findById(branchId)
            .populate({
                path: 'printers',
                populate: [
                    {
                        path: 'inputBins.paperType',
                        model: 'Paper'
                    },
                    {
                        path: 'printerQueue',
                        model: 'Order'
                    },
                    {
                        path: 'queue',
                        model: 'Order'
                    }
                ]
            });
        if (branch && branch.printers && branch.printers[0]) {
            const printer = branch.printers[0];
            printer.queueStatus = isOpen ? "idle" : "manual";
            await printer.save();
            res.status(200).json({
                message: "Queue status changed successfully!",
                printer: printer
            });
        } else {
            res.status(404).json({
                message: "Branch or printer not found"
            });
        }
    }
    catch (error) {
        res.status(500).json({
            message: "Branches_Open-or-close-queue-failed"
        });
    }
}

exports.openOrCloseSlack = async (req, res, next) => {
    const branchId = req.params.id;
    const isOn = req.body.isOn;
    try {
        const branch = await Branch
            .findById(branchId)
            .populate({
                path: 'printers',
                populate: [
                    {
                        path: 'inputBins.paperType',
                        model: 'Paper'
                    },
                    {
                        path: 'printerQueue',
                        model: 'Order'
                    },
                    {
                        path: 'queue',
                        model: 'Order'
                    }
                ]
            });
        if (branch) {
            branch.inform_slack_of_new_orders = isOn ? false : true;
            await branch.save();
            res.status(200).json({
                message: "Queue status changed successfully!",
                branch: branch
            });
        } else {
            res.status(404).json({
                message: "Branch or printer not found"
            });
        }
    }
    catch (error) {
        res.status(500).json({
            message: "Branches_Open-or-close-queue-failed"
        });
    }
}

exports.checkBranchStatus = async (req, res, next) => {
    const service = req.params.service;
    const serialName = req.params.branch;
    console.log("checkBranchStatus: serialName");
    console.log(serialName);
    try {
        let status = {};
        if (service === 'plotter') {
            const branch = await Branch.findOne({ serial_name: serialName });
            if (!branch) {
                return res.status(404).json({
                    message: "CHECK_BRANCH_STATUS_BRANCH_NOT_FOUND"
                });
            }
            status = { close: branch.close, close_msg: branch.close_msg };
        } else if (service === 'express') {
            console.log("serialName", serialName);
            const printer = await Express_printer.findOne({ serial_name: serialName });
            if (!printer) {
                return res.status(404).json({
                    message: "CHECK_BRANCH_STATUS_PRINTER_NOT_FOUND"
                });
            }
            status = { close: printer.properties.close, close_msg: printer.properties.close_msg };
        }
        res.status(200).json({
            message: "Branch status fetched successfully!",
            status: status
        });
    } catch (error) {
        console.error("Error fetching branch status:", error);
        res.status(500).json({
            message: "Branches_Check-branch-status-failed"
        });
    }
}

exports.closeBranch = async (req, res, next) => {
    const service = req.params.service;
    const serialName = req.params.branch;
    const msg = req.body.close_msg.close_msg;
    try {
        if (service === 'plotter') {
            const branch = await Branch.findOne({ serial_name: serialName });
            if (!branch) {
                return res.status(404).json({
                    message: "Branch not found"
                });
            }
            branch.close = true;
            branch.close_msg = msg;
            await branch.save();
        } else if (service === 'express') {
            const printer = await Express_printer.findOne({ serial_name: serialName });
            if (!printer) {
                return res.status(404).json({
                    message: "Printer not found"
                });
            }
            printer.properties.close = true;
            printer.properties.close_msg = msg;
            await printer.save();
        }
        res.status(200).json({
            message: "Branch closed successfully!"
        });
    } catch (error) {
        console.error("Error closing branch:", error);
        res.status(500).json({
            message: "Branches_Close-branch-failed"
        });
    }
}

exports.openBranch = async (req, res, next) => {
    const service = req.params.service;
    const serialName = req.params.branch;
    try {
        if (service === 'plotter') {
            const branch = await Branch.findOne({ serial_name: serialName });
            if (!branch) {
                return res.status(404).json({
                    message: "Branch not found"
                });
            }
            branch.close = false;
            await branch.save();
        } else if (service === 'express') {
            const printer = await Express_printer.findOne({ serial_name: serialName });
            if (!printer) {
                return res.status(404).json({
                    message: "Printer not found"
                });
            }
            printer.properties.close = false;
            await printer.save();
        }
        res.status(200).json({
            message: "Branch opened successfully!"
        });
    } catch (error) {
        console.error("Error opening branch:", error);
        res.status(500).json({
            message: "Branches_Open-branch-failed"
        });
    }
}

exports.updateInventory = async (req, res, next) => {
    const branchId = req.params.id;
    const inventory = req.body.inventory;
    try {
        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({
                message: "Branch not found"
            });
        }
        branch.stockCurrent = inventory;
        await branch.save();
        res.status(200).json({
            message: "Inventory updated successfully!",
            inventory: branch.stockCurrent
        });
    }
    catch (error) {
        console.error("Error updating inventory:", error);
        res.status(500).json({
            message: "Branches_Update-inventory-failed"
        });
    }
}

exports.replaceBm = async (req, res, next) => {
    const printingService = req.params.printingService;
    const branchId = req.params.branchId;
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        let roles = user.roles;
        if (!roles.includes('bm')) {
            roles.push('bm');
        }
        user.roles = roles;
        await user.save();
    } catch (error) {
        console.error("Error replacing BM on user:", error);
        res.status(500).json({
            message: "no user found"
        });
    }
    if (printingService === 'plotter') {
        try {
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({
                    message: "Branch not found"
                });
            }
            branch.bm = userId;
            await branch.save();
            res.status(200).json({
                message: "BM replaced successfully!",
                branch: branch
            });
        }
        catch (error) {
            console.error("Error replacing BM on branch:", error);
            res.status(500).json({
                message: "Branches_Replace-BM-failed"
            });
        }
    }
    else if (printingService === 'express') {
        try {
            const printer = await Express_printer.findById(branchId);
            if (!printer) {
                return res.status(404).json({
                    message: "Printer not found"
                });
            }
            printer.bm = userId;
            await printer.save();
            res.status(200).json({
                message: "BM replaced successfully!",
                branch: printer
            });
        }
        catch (error) {
            console.error("Error replacing BM on printer:", error);
            res.status(500).json({
                message: "Branches_Replace-BM-failed"
            });
        }
    }
}

exports.removeSt = async (req, res, next) => {
    const printingService = req.params.printingService;
    const branchId = req.params.branchId;
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        let roles = user.roles;
        if (roles.includes('st')) {
            const stIndex = roles.findIndex(role => role === 'st');
            roles.splice(stIndex, 1);
        }
        user.roles = roles;
        await user.save();
    } catch (error) {
        console.error("Error removing ST from user:", error);
        res.status(500).json({
            message: "no user found"
        });
    }
    if (printingService === 'plotter') {
        try {
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({ message: "Branch not found" });
            }
            if (branch.st && branch.st.length > 0) {
                const stIndex = branch.st.findIndex(st => st.toString() === userId);
                if (stIndex >= 0) {
                    branch.st.splice(stIndex, 1);
                }
            }
            await branch.save();
            res.status(200).json({
                message: "ST removed successfully!",
                branch: branch
            });
        }
        catch (error) {
            console.error("Error removing ST from branch:", error);
            res.status(500).json({
                message: "Branches_Remove-ST-failed"
            });
        }
    } else if (printingService === 'express') {
        try {
            const printer = await Express_printer.findById(branchId);
            if (!printer) {
                return res.status(404).json({ message: "Printer not found" });
            }
            if (printer.st && printer.st.length > 0) {
                const stIndex = printer.st.findIndex(st => st.toString() === userId);
                if (stIndex >= 0) {
                    printer.st.splice(stIndex, 1);
                }
            }
            await printer.save();
            res.status(200).json({
                message: "ST removed successfully!",
                branch: printer
            });
        }
        catch (error) {
            console.error("Error removing ST from printer:", error);
            res.status(500).json({
                message: "Branches_Remove-ST-failed"
            });
        }
    }
}

exports.addSt = async (req, res, next) => {
    const printingService = req.params.printingService;
    const branchId = req.params.branchId;
    const userId = req.body.userId;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        let roles = user.roles;
        if (!roles.includes('st')) {
            roles.push('st');
        }
        user.roles = roles;
        await user.save();
    } catch (error) {
        console.error("Error adding ST on user:", error);
        res.status(500).json({
            message: "no user found"
        });
    }
    if (printingService === 'plotter') {
        try {
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({ message: "Branch not found" });
            }
            const stArray = branch.st;
            if (!stArray.includes(userId)) {
                stArray.push(userId);
            }
            branch.st = stArray;
            await branch.save();
            res.status(200).json({
                message: "ST added successfully!",
                branch: branch
            });
        }
        catch (error) {
            console.error("Error adding ST on branch:", error);
            res.status(500).json({
                message: "Branches_Add-ST-failed"
            });
        }
    }
    else if (printingService === 'express') {
        try {
            const printer = await Express_printer.findById(branchId);
            if (!printer) {
                return res.status(404).json({ message: "Printer not found" });
            }
            const stArray = printer.st;
            if (!stArray.includes(userId)) {
                stArray.push(userId);
            }
            printer.st = stArray;
            await printer.save();
            res.status(200).json({
                message: "ST added successfully!",
                branch: printer
            });
        }
        catch (error) {
            console.error("Error adding ST: on printer", error);
            res.status(500).json({
                message: "Branches_Add-ST-failed"
            });
        }
    }
}

exports.replaceConsumable = async (req, res, next) => {
    const printingService = req.params.printingService;
    const branchId = req.params.branchId;
    const type = req.body.type;
    const consumable = req.body.consumable;
    if (printingService === 'plotter') {
        try {
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({
                    message: "Branch not found"
                });
            }
            const stock = branch.stockCurrent;
            if (type === 'paper') {
                const consumablePaperType = consumable.paperType.paperType;
                for (const paperType in stock.paper) {
                    if (stock.paper.hasOwnProperty(paperType) && paperType === consumablePaperType) {
                        if (stock.paper[paperType] > 0) {
                            stock.paper[paperType] -= 1;
                        }
                    }
                }
            } else if (type === 'ink') {
                const consumableInkType = consumable.color;
                for (const inkType in stock.ink) {
                    if (stock.ink.hasOwnProperty(inkType) && inkType === consumableInkType) {
                        if (stock.ink[inkType] > 0) {
                            stock.ink[inkType] -= 1;
                        }
                    }
                }
            } else if (type === 'wastetanck') {
                if (stock.ink.waste > 0) {
                    stock.ink.waste -= 1;
                }
            }
            branch.stockCurrent = stock;
            await branch.save();
            const printer = await Printer.findById(branch.printers[0]._id.toString());
            if (!printer) {
                return res.status(404).json({
                    message: "Printer not found"
                });
            }
            printer.queueStatus = "idle";
            await printer.save();
            res.status(200).json({
                message: "Replace consumable successfully!",
                branch: branch
            });
        }
        catch (error) {
            console.error("Error updating inventory:", error);
            res.status(500).json({
                message: "Branches_Update-inventory-failed"
            });
        }

    }
    else if (printingService === 'express') {
        try {
            const printer = await Express_printer.findById(branchId);
            if (!printer) {
                return res.status(404).json({
                    message: "Printer not found"
                });
            }
            // printer.consumable = consumable;
            // await printer.save();
            res.status(200).json({
                message: "Consumable replaced successfully!",
                branch: printer
            });
        }
        catch (error) {
            console.error("Error replacing consumable:", error);
            res.status(500).json({
                message: "Branches_Replace-consumable-failed"
            });
        }
    }
}

