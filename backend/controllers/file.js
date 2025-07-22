const File = require("../models/file");
const Paper = require("../models/paper");
const Express_printer = require("../models/express_printer");
const FileExpress = require("../models/file-express");
const e = require("express");
const Product = require("../models/product");

// [plotter]
exports.getUserFiles = async (req, res, next) => {
  const printerId = req.params.printerId;
  const userId = req.params.userId;
  try {
    const allUserFiles = await File.find({ userID: userId, isOrdered: false, printerID: printerId });
    res.status(200).json({
      message: "Files fetched successfully!",
      files: allUserFiles,
    });
  } catch (error) {
    console.error('Error in getUserFiles:', error);
    res.status(500).json(
      { message: 'File_Unknown-error-apending-files' }
    );
  }
}
// [express]
exports.getUserFilesExpress = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    const allUserFiles = await FileExpress.find({ userID: userId, isPacked: false });
    res.status(200).json({
      message: "Files fetched successfully!",
      files: allUserFiles,
    });
  } catch (error) {
    console.error('Error in getUserFiles:', error);
    res.status(500).json(
      { message: 'File_Unknown-error-apending-files' }
    );
  }
}

// [plotter]
exports.updateFileSettings = async (req, res, next) => {
  const fileId = req.params.fileId;
  const printSettings = req.body.printSettings;
  const imageId = req.body.imageId;
  try {
    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json(
        { message: 'File_File-not-found' }
      );
    }
    let foundImage = false;
    // loop through .images and find the file with matching imageId
    // find image index in file.images
    let imageIndex = file.images.findIndex(image => image._id == imageId);
    if (imageIndex === -1) {
      return res.status(404).json(
        { message: 'File_File-not-found' }
      );
    } else {
      // update printSettings
      file.images[imageIndex].printSettings = printSettings;
      file.images[imageIndex].price = await calculatePlotterImagePrice(file.images[imageIndex]);
      // Save the updated file
      const updatedFile = await file.save();
      const updatedImage = updatedFile.images.find(image => image._id == imageId);
      res.status(200).json({
        message: "Print settings updated successfully!",
        image: updatedImage,
        fileId: updatedFile._id
      });
    }
  } catch (error) {
    console.error('Error in updatePaperType:', error);
    res.status(500).json(
      { message: 'File_Error-updating-paper-type' }
    );
  }
}
// [express]
exports.updateFileSettingsExpress = async (req, res, next) => {
  const fileId = req.params.fileId;
  const printSettings = req.body.printSettings;
  const printerID = req.body.printerID;
  try {
    // Find the file
    const file = await FileExpress.findById(fileId);
    if (!file) {
      return res.status(404).json(
        { message: 'File_File-not-found' }
      );
    }
    // iterate printSetting and update only changed values
    for (const key in printSettings) {
      if (printSettings[key] !== null && printSettings[key] !== '') {
        // is the value changed?
        if (file.printSettings[key] !== printSettings[key]) {
          file.printSettings[key] = printSettings[key];
        }
      }
    }

    file.price = await calculateExpressPrice(file, printerID);

    // Save the updated file
    const updatedFile = await file.save();
    res.status(200).json({
      message: "Print settings updated successfully!",
      file: updatedFile,
      fileId: updatedFile._id
    });
  } catch (error) {
    console.error('Error in updatePaperType:', error);
    res.status(500).json(
      { message: 'File_Error-updating-paper-type' }
    );
  }
}
// [express]
exports.clearFilesSettingsExpress = async (req, res, next) => {
  const userId = req.params.userId;
  try {
    // Find all files
    const allUserFiles = await FileExpress.find({ userID: userId, isPacked: false });
    // loop through all files and clear print settings
    allUserFiles.forEach(async (file, index) => {
      file.printSettings = {};
      file.price = 0;
      await file.save();
    });
    const updatedFiles = await FileExpress.find({ userID: userId, isPacked: false });
    res.status(200).json({
      message: "Print settings cleared successfully!",
      updatedFiles: updatedFiles
    });
  } catch (error) {
    console.error('Error in clearFileSettings:', error);
    res.status(500).json(
      { message: 'File_Error-clearing-print-settings' }
    );
  }
}
// [ph]
exports.updateFileSettingsPh = async (req, res, next) => {
  const fileId = req.params.fileId;
  const printSettings = req.body.printSettings;
  const productID = req.body.productID;
  try {
    // Find the file
    const file = await FileExpress.findById(fileId);
    if (!file) {
      return res.status(404).json(
        { message: 'File_File-not-found' }
      );
    }
    // iterate printSetting and update only changed values
    for (const key in printSettings) {
      if (printSettings[key] !== null && printSettings[key] !== '') {
        // is the value changed?
        if (file.printSettings[key] !== printSettings[key]) {
          file.printSettings[key] = printSettings[key];
        }
      }
    }

    console.log('files!!!55!!1', file);
    file.price = await calculatePhPrice(file, productID);
    console.log('files!!!55!!2', file);

    // Save the updated file
    const updatedFile = await file.save();
    res.status(200).json({
      message: "Print settings updated successfully!",
      file: updatedFile,
      fileId: updatedFile._id
    });
  } catch (error) {
    console.error('Error in updatePaperType:', error);
    res.status(500).json(
      { message: 'File_Error-updating-paper-type' }
    );
  }
}

// [plotter]
exports.applyToAllFilesSettings = async (req, res, next) => {
  const userId = req.params.userId;
  const printerId = req.params.printerId;
  const newPrintSettings = req.body.printSettings;
  try {
    const allUserFiles = await File.find({ userID: userId, isOrdered: false, printerID: printerId });
    allUserFiles.forEach(async (file, index) => {
      file.images.forEach(async (image, index) => {
        file.images[index].printSettings = newPrintSettings;
      });
      await file.save();
    });
    res.status(200).json({
      message: "Apply to all print settings updated successfully!",
      updatedFiles: allUserFiles
    });
  } catch (error) {
    console.error('Error in applyToAllFilesSettings:', error);
    res.status(500).json(
      { message: 'File_Error-apply-to-all' }
    );
  }
}
// [express]
exports.applyToAllFilesSettingsExpress = async (req, res, next) => {
  const userId = req.params.userId;
  const newPrintSettings = req.body.printSettings;
  const printerID = req.body.printerID;
  try {
    const allUserFiles = await FileExpress.find({ userID: userId, isPacked: false });
    allUserFiles.forEach(async (file, index) => {
      let newPrintSettingsModified = { ...newPrintSettings };
      if (file.images.length === 1) {
        newPrintSettingsModified.doubleSided = false;
      }
      file.printSettings = newPrintSettingsModified;
      file.price = await calculateExpressPrice(file, printerID);
      await file.save();
    });
    res.status(200).json({
      message: "Apply to all print settings updated successfully!",
      updatedFiles: allUserFiles
    });
  } catch (error) {
    console.error('Error in applyToAllFilesSettings:', error);
    res.status(500).json(
      { message: 'File_Error-apply-to-all' }
    );
  }
}

// [plotter]
exports.deleteFile = (req, res, next) => {
  const fileId = req.params.fileId;
  File.deleteOne({ _id: fileId })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({
          message: "File_Not-authorized-deleting-file"
        });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-file'
      });
    });
};
// [express]
exports.deleteFileExpress = (req, res, next) => {
  const fileId = req.params.fileId;
  FileExpress.deleteOne({ _id: fileId })
    .then(result => {
      if (result.deletedCount > 0) {
        res.status(200).json({ message: "Deletion successful!" });
      } else {
        res.status(401).json({
          message: "File_Not-authorized-deleting-file"
        });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-file'
      });
    });
}


// [plotter]
exports.deleteImage = (req, res, next) => {
  const fileId = req.params.fileId;
  const imageIndex = req.params.imageIndex;
  File.findById(fileId)
    .then(file => {
      if (!file) {
        return res.status(404).json({
          message: 'File_File-not-found'
        });
      }
      file.images.splice(imageIndex, 1);
      return file.save();
    })
    .then(result => {
      res.status(200).json({ message: "Image deleted!" });
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-file'
      });
    });
};
// [express]
exports.deleteImageExpress = (req, res, next) => {
  const fileId = req.params.fileId;
  const imageIndex = req.params.imageIndex;
  console.log('fileId:', fileId);
  console.log('imageIndex:', imageIndex);
  FileExpress.findById(fileId)
    .then(file => {
      if (!file) {
        return res.status(404).json({
          message: 'File_File-not-found'
        });
      }
      file.images.splice(imageIndex, 1);
      return file.save();
    })
    .then(result => {
      res.status(200).json({ message: "Image deleted!" });
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-file'
      });
    });
}

// [plotter]
exports.deleteAllFiles = (req, res, next) => {
  const userId = req.params.userId;
  File.deleteMany({ userID: userId, isOrdered: false })
    .then(result => {
      res.status(200).json({ message: "All files deleted!" });
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-files'
      });
    });
};
// [express]
exports.deleteAllFilesExpress = (req, res, next) => {
  const userId = req.params.userId;
  FileExpress.deleteMany({ userID: userId, isPacked: false })
    .then(result => {
      res.status(200).json({ message: "All files deleted!" });
    })
    .catch(error => {
      res.status(500).json({
        message: 'File_Error-deleting-files'
      });
    });
};

// [plotter]
async function calculatePlotterImagePrice(image) {
  var price = 0;
  var paperType = image.printSettings.paperType;
  if (typeof image.printSettings.paperType === 'string') {
    // get paper by paperCode stored in image.printSettings.paperType
    var paperCode = image.printSettings.paperType;
    await Paper.findOne({ paperPrinterCode: paperCode }).then(paper => {
      paperType = paper;
    }).catch(error => {
      console.error('Error in calculatePlotterImagePrice:', error);
    });
  }
  // var paperType = image.printSettings.paperType.paperType.paperType;
  var copies = image.printSettings.copies;
  var height = image.imageHeight;
  var width = image.imageWidth;
  var ink = image.inkCalculation / 100;
  var paperWidth = paperType.paperWidth / 1000 / 2.54 * 300;
  if (image.printSettings.isRotated) {
    var temp = width;
    width = height;
    height = temp;
  }

  var missing_part = paperWidth - width;
  var H = height; // Running Height of Sheet
  console.log('H: ' + H);
  var A = (width * H) - (width * H * ink); // Number of white pxiles in IMAGE
  console.log('A: ' + A);
  var B = width * H; // Number of pixels in image
  console.log('B: ' + B);
  var C = missing_part * H; // Number of pixels in the empty part of the sheet
  console.log('C: ' + C);
  var M = (B - A) / (B + C) * 100;
  console.log('M: ' + M);

  // find pricing point by M:
  var pricingPoint = paperType.pricingPoints.find(function (point) {
    return M >= point.min && M <= point.max;
  });
  console.log('pricingPoint: ' + JSON.stringify(pricingPoint));
  if (pricingPoint) {
    var pricePointIndex = paperType.pricingPoints.indexOf(pricingPoint);
    var range = pricingPoint.max - pricingPoint.min;

    var minprice = pricingPoint.price;
    var maxprice = ((pricePointIndex === (paperType.pricingPoints.length - 1)) ? pricingPoint.price : paperType.pricingPoints[(pricePointIndex + 1)].price);

    var P = ((M - pricingPoint.min) / range) * maxprice + ((pricingPoint.max - M) / range) * minprice;

    var cmH = H / 300 * 2.54;
    if (cmH < 30) cmH = 30;
    //(P * H) / (70 * 300 / 2.54);
    return ((P * cmH) / 70).toFixed(2);
  }
}

// [express]
async function calculateExpressPrice(file, printerID) {
  var single_price = null;
  var price = 0;
  var printer = await Express_printer.findById(printerID);
  if (!printer) {
    return price;
  }
  if (file.printSettings && file.printSettings.paperType) {
    // console.log('file.printSettings.paperType.paperName:', file.printSettings.paperType);
    var prices = printer.pricing.prices_x[file.printSettings.paperType.toLowerCase()]

    if (!prices) {
      return price;
    }

    if (file.printSettings.bw && file.printSettings.doubleSided) {
      single_price = prices.double.bw
    } else if (file.printSettings.bw && !file.printSettings.doubleSided) {
      single_price = prices.single.bw
    } else if (!file.printSettings.bw && file.printSettings.doubleSided) {
      single_price = prices.double.color
    } else if (!file.printSettings.bw && !file.printSettings.doubleSided) {
      single_price = prices.single.color
    }

    // count non-white images
    var nonWhiteImages = 0;
    file.images.forEach(function (image) {
      if (image.inkLevel > 0) {
        nonWhiteImages++;
      }
    });
    // calc
    price = nonWhiteImages * file.printSettings.numOfCopies * single_price;
  }

  console.log('price:', price);

  return price;
}

// [ph]
async function calculatePhPrice(file, productID) {
  let price = null;
  const product = await Product.findById(productID);
  if (!product) {
    return price;
  }
  if (product.price && product.price > 0) {
    if (file.printSettings.numOfCopies && file.printSettings.numOfCopies > 0) {
      price = file.printSettings.numOfCopies * product.price;
    } else {
      price = product.price;
    }
  }
  return price;
}