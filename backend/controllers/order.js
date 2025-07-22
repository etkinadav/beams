const Order = require("../models/order");
const OrderExpress = require("../models/order-express");
const FileExpress = require("../models/file-express");
const User = require('../models/user');
const Express_printer = require('../models/express_printer');
const Branch = require('../models/branch');

exports.getUserOrders = async (req, res, next) => {
  const userId = req.params.userId;
  if (!userId) {
    return res.status(400).json({
      message: "Orders_Fetching-orders-failed"
    });
  }
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  try {

    // [plotter]
    let orders_array = [];
    await Order.find({ userID: userId })
      .populate({
        path: 'printerID',
        populate: {
          path: 'inputBins.paperType',
          model: 'Paper'
        }
      })
      .populate('files')
      .populate('branchID').then(orders => {
        orders_array = orders
      }).catch(err => {
        console.log(err);
        return res.status(500).json({
          message: "Orders_Fetching-orders-failed"
        });
      })

    // [express]
    let express_array = [];
    await OrderExpress.find({ userID: userId })
      .populate({
        path: 'printerID',
        select: '-properties -printnode -scan'
      })
      .populate('files')
      .populate('branchID').then(orders => {
        // console.log(orders);
        express_array = orders

      }).catch(err => {
        console.log(err);
        return res.status(500).json({
          message: "Orders_Fetching-orders-failed"
        });
      })

    // Combine and sort the orders by created date
    const allOrders = [...orders_array, ...express_array];
    allOrders.sort((a, b) => new Date(b.created) - new Date(a.created));

    // Paginate the orders
    const paginatedOrders = allOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return res.status(200).json({
      message: "Orders fetched successfully!",
      orders: paginatedOrders,
      maxOrders: allOrders.length
    });
  } catch (error) {
    console.log("!!!! = error: ", error);
    return res.status(500).json({
      message: "Orders_Fetching-orders-failed"
    });
  }
};

exports.getOrdersForManager = async (req, res, next) => {
  const service = req.body.service;
  const branchId = req.body.branchId;
  const pageSize = +req.body.ordersPerPage;
  const currentPage = +req.body.currentPage;

  let allOrders = [];
  let paginatedOrders = [];

  if (service === 'plotter') {
    try {
      allOrders = await Order.find({ branchID: branchId })
        .populate({
          path: 'printerID',
          populate: {
            path: 'inputBins.paperType',
            model: 'Paper'
          }
        })
        .populate('files')
        .populate('branchID')
        .sort('-created')
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize);

      paginatedOrders = allOrders;
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else if (service === 'express') {
    try {
      allOrders = await OrderExpress.find({ printerID: branchId })
        .populate('printerID')
        .populate('files')
        .populate('branchID')
        .sort('-created')
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize);

      paginatedOrders = allOrders;
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else {
    return res.status(500).json({
      message: "Orders_Fetching-orders-failed"
    });
  }
  let totalOrders;
  if (service === 'plotter') {
    totalOrders = await Order.countDocuments({ branchID: branchId });
  } else if (service === 'express') {
    totalOrders = await OrderExpress.countDocuments({ printerID: branchId });
  }
  return res.status(200).json({
    message: "Orders fetched successfully!",
    orders: paginatedOrders,
    maxOrders: totalOrders
  });
}

exports.getUserNumOfPendingOrders = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    let orders_array = [];
    await Order.find({
      userID: userId,
      status: { $in: ['PENDING', 'NOT_PAID', 'QR'] },
    })
      .sort({ _id: -1 })
      .limit(50)
      .then(orders => {
        // console.log("Orders from Order collection:", orders);
        orders.forEach(order => {
          // console.log(`Order ID: ${order._id}, isDeleted: ${order.isDeleted}`);
        });
        orders_array = orders;
      })
      .catch(err => {
        console.log(err);
        return res.status(500).json({
          message: "Orders_Fetching-orders-failed"
        });
      });

    let express_array = [];
    await OrderExpress.find({
      userID: userId,
      status: { $in: ['PENDING', 'NOT_PAID', 'QR'] },
    })
      .sort({ _id: -1 })
      .limit(50)
      .then(orders => {
        // console.log("Orders from OrderExpress collection:", orders);
        // orders.forEach(order => {
        //   console.log(`OrderExpress ID: ${order._id}, isDeleted: ${order.isDeleted}`);
        // });
        express_array = orders;
      })
      .catch(err => {
        // console.log(err);
        return res.status(500).json({
          message: "Orders_Fetching-orders-failed"
        });
      });

    // Combine the amount of pending orders
    const allOrders = [...orders_array, ...express_array];
    console.log("Combined orders:", allOrders);
    let allOrdersLength = 0;
    for (let order of allOrders) {
      if (!order.isDeleted) {
        allOrdersLength++;
      }
    }
    return res.status(200).json({
      message: "Number of pending orders fetched successfully!",
      numOfPendingOrders: allOrdersLength,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Orders_Fetching-orders-failed"
    });
  }
};

exports.getPendingOrder = async (req, res, next) => {
  const service = req.params.service;
  const orderId = req.params.orderId;
  let orderData = {};

  // get order
  if (service === 'plotter') {
    try {
      orderData.order = await Order.findById(orderId)
        .populate({
          path: 'printerID',
          populate: {
            path: 'inputBins.paperType',
            model: 'Paper'
          }
        })
        .populate('files')
        .populate('branchID');
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else if (service === 'express') {
    try {
      orderData.order = await OrderExpress.findById(orderId)
        .populate('printerID')
        .populate('files')
        .populate('branchID');
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else {
    return res.status(500).json({
      message: "Orders_Fetching-orders-failed"
    });
  }

  // get user
  const userId = orderData.order.userID.toString();
  try {
    const user = await User.findById(userId);
    if (user) {
      orderData.user = user;
    } else {
      return res.status(404).json({ message: "Get_user-Fetching_user_failed" });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Get_user-Fetching_user_failed"
    });
  }

  // console.log("orderData IN getPendingOrder:", orderData);
  return res.status(200).json({
    message: "Order fetched successfully!",
    orderData: orderData
  });
}

exports.createExpressOrder = async (req, res) => {
  try {
    let files = req.body.files;
    if (!files) {
      return res.status(400).json({ message: 'Files are required' });
    }
    let printerID = req.body.printerID;
    if (!printerID) {
      return res.status(400).json({ message: 'Printer ID are required' });
    }
    let user = await User.findById(req.userData.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let branchID = req.body.branchID;
    if (!branchID) {
      return res.status(400).json({ message: 'Branch ID is required' });
    }

    const printer = await Express_printer.findById(printerID);
    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }
    let enable_crop = false;
    if (printer.properties.enable_crop) {
      enable_crop = true;
    }

    // check that all files exist and belong to the user, also collect file object for later use
    let fileObjects = [];
    let orderSum = 0;
    for (const fileID of files) {
      let file = await FileExpress.findById(fileID);
      console.log("files in createExpressOrder: ", file);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      // file have images?
      if (file.images.length === 0) {
        return res.status(400).json({ message: 'File has no images' });
      }
      if (file.userID.toString() !== user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      // file has price?
      if (!file.price) {
        return res.status(400).json({ message: 'File has no price' });
      }
      if (!enable_crop) {
        file.printSettings.cropRatio = false;
        console.log("enable_crop 2!!!");
      }
      orderSum += file.price;
      fileObjects.push(file);
    }

    //calculate discount form order sum using req.userObject.discount
    const discount = user.discount;
    const totalCost = orderSum - (orderSum * discount / 100);
    const actualDiscount = orderSum * discount / 100;

    // is su, admin or bm?
    let adminOrder = false;
    if (user.roles.includes('admin') || user.roles.includes('su')) {
      adminOrder = true;
    } else if (user.roles.includes('bm')) {
      // let printer = await Express_printer.findById(printerID);
      const bm = printer.bm.toString();
      if (bm) {
        if (user._id.toString() === bm) {
          adminOrder = true;
        }
      }
    }

    // create order object and save it
    let order = new OrderExpress({
      files: fileObjects.map(file => file._id),
      user: user.username,
      totalCost: totalCost,
      discount: actualDiscount,
      userID: user._id,
      branchID: branchID,
      printerID: printerID,
      status: 'PENDING',
      adminOrder: adminOrder,
    });
    // try creat order, if success update all files with orderID
    await order.save();
    for (const file of fileObjects) {
      file.orderID = order._id;
      file.isOrdered = false;
      file.isPacked = true;
      await file.save();
    }
    res.status(201).json({ message: 'Order created successfully', order: order });
  } catch (error) {
    console.log("!!!! = error: ", error);
    res.status(500).json({ message: 'Order creation failed', error });
  }
}

exports.deleteOrder = async (req, res, next) => {
  const orderId = req.params.orderId;
  console.log("orderId: ", orderId);
  const service = req.params.service;
  let order;
  if (service === 'p') {
    try {
      order = await Order.findById(orderId);
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else if (service === 'e') {
    try {
      order = await OrderExpress.findById(orderId);
    } catch (error) {
      console.log("!!!! = error: ", error);
      return res.status(500).json({
        message: "Orders_Fetching-orders-failed"
      });
    }
  } else {
    return res.status(500).json({
      message: "Orders_Fetching-orders-failed"
    });
  }

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  try {
    await order.updateOne({ isDeleted: true });
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log("!!!! = error: ", error);
    res.status(500).json({ message: "Order deletion failed" });
  }
}

exports.getReportData = async (req, res, next) => {
  const service = req.params.service;
  const branchId = req.params.branchId;
  const month = req.params.month;
  const year = req.params.year;
  let orders;

  let totalCost = 0;
  let bmTotalCost = 0;
  let bmEmail = '';

  if (service === 'plotter') {
    try {
      // totalCost
      orders = await Order.find({
        $and: [
          { branchID: branchId },
          {
            addedToQueue: {
              $gte: new Date(year, month - 1, 1),
              $lt: new Date(year, month, 1),
            }
          },
          { adminOrder: false },
          { businessOrder: false },
          { status: { $in: ['PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE'] } },
        ]
      });
      for (let order of orders) {
        let cost = order.ccCost;
        totalCost += cost;
      }
      // bm orders
      branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      if (branch.bm) {
        const bm = branch.bm.toString();
        bmOrders = await Order.find({
          $and: [
            { branchID: branchId },
            { userID: bm },
            {
              addedToQueue: {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1),
              }
            },
            { adminOrder: true },
            { status: { $in: ['PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE'] } },
          ]
        });
        // user
        user = await User.findById(bm);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        bmEmail = user.email;
      }
      for (let order of bmOrders) {
        let cost = order.totalCost;
        bmTotalCost += cost;
      }
      // send response
      res.status(200).json({
        message: "Report data fetched successfully",
        reportData: {
          totalCost: totalCost,
          bmTotalCost: bmTotalCost,
          bmEmail: bmEmail
        }
      });
    }
    catch (error) {
      console.log("!!!! = error: ", error);
      res.status(500).json({ message: "Report data fetching failed" });
    }
  } else if (service === 'express') {
    try {
      // totalCost
      orders = await OrderExpress.find({
        $and: [
          { printerID: branchId },
          {
            addedToQueue: {
              $gte: new Date(year, month - 1, 1),
              $lt: new Date(year, month, 1),
            }
          },
          { adminOrder: false },
          { businessOrder: false },
          { status: { $in: ['PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE'] } },
        ]
      });
      for (let order of orders) {
        let cost = order.ccCost;
        totalCost += cost;
      }
      // bm orders
      printer = await Express_printer.findById(branchId);
      if (!printer) {
        return res.status(404).json({ message: "Printer not found" });
      }
      if (printer.bm) {
        const bm = printer.bm.toString();
        bmOrders = await Order.find({
          $and: [
            { printerID: branchId },
            { userID: bm },
            {
              addedToQueue: {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1),
              }
            },
            { adminOrder: true },
            { status: { $in: ['PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE'] } },
          ]
        });
        // user
        user = await User.findById(bm);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        bmEmail = user.email;
      }
      for (let order of bmOrders) {
        let cost = order.totalCost;
        bmTotalCost += cost;
      }
      // send response
      res.status(200).json({
        message: "Report data fetched successfully",
        reportData: {
          totalCost: totalCost,
          bmTotalCost: bmTotalCost,
          bmEmail: bmEmail
        }
      });
    }
    catch (error) {
      console.log("!!!! = error: ", error);
      res.status(500).json({ message: "Report data fetching failed" });
    }
  } else {
    res.status(500).json({ message: "Report data fetching failed" });
  }
}


