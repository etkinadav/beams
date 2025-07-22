const Paper = require("../models/paper");

exports.createPaper = (req, res, next) => {
    const url = req.protocol + "://" + req.get("host");
    const paper = new Paper({
        paperName: req.body.paperName,
        paperWidth: req.body.paperWidth,
        paperHeight: req.body.paperHeight,
        paperWeight: req.body.paperWeight,
        paperPrinterCode: req.body.paperPrinterCode,
        paperPrinterQuality: req.body.paperPrinterQuality,
        isExpress: req.body.isExpress,
        isPlotter: req.body.isPlotter,
        isPh: req.body.isPh,
    });
    paper
        .save()
        .then(createdPaper => {
            res.status(201).json({
                message: "Paper added successfully",
                paper: {
                    ...createdPaper,
                    id: createdPaper._id
                }
            });
        })
        .catch(error => {
            res.status(500).json({
                message: "Create_paper-Creating_paper_failed"
            });
        });
};

exports.updatePaper = (req, res, next) => {
    const paper = new Paper({
        _id: req.body.id,
        paperName: req.body.paperName,
        paperWidth: req.body.paperWidth,
        paperHeight: req.body.paperHeight,
        paperWeight: req.body.paperWeight,
        paperPrinterCode: req.body.paperPrinterCode,
        paperPrinterQuality: req.body.paperPrinterQuality,
        isExpress: req.body.isExpress,
        isPlotter: req.body.isPlotter,
        isPh: req.body.isPh,
    });
    Paper.updateOne({ _id: req.params.id }, paper)
        .then(result => {
            if (result.matchedCount > 0) {
                res.status(200).json({ message: "Update successful!" });
            } else {
                res.status(401).json({ message: "Update_paper-Updating_paper_failed" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Couldn't udpate paper!"
            });
        });
};

exports.getPapers = (req, res, next) => {
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const PaperQuery = Paper.find();
    let fetchedPapers;
    if (pageSize && currentPage) {
        PaperQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
    }
    PaperQuery
        .then(documents => {
            fetchedPapers = documents;
            return Paper.count();
        })
        .then(count => {
            res.status(200).json({
                message: "Papers fetched successfully!",
                papers: fetchedPapers,
                maxPapers: count
            });
        })
        .catch(error => {
            res.status(500).json({
                message: "Get_papers-Fetching_papers_failed"
            });
        });
};

exports.getPaper = (req, res, next) => {
    Paper.findById(req.params.id)
        .then(paper => {
            if (paper) {
                res.status(200).json(paper);
            } else {
                res.status(404).json({ message: "Paper not found!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Get_paper-Fetching_paper_failed"
            });
        });
};

exports.deletePaper = (req, res, next) => {
    Paper.deleteOne({ _id: req.params.id })
        .then(result => {
            if (result.deletedCount > 0) {
                res.status(200).json({ message: "Deletion successful!" });
            } else {
                res.status(401).json({ message: "Not authorized!" });
            }
        })
        .catch(error => {
            res.status(500).json({
                message: "Delete_paper-Deleting_paper_failed"
            });
        });
};

exports.getAllPapers = (req, res, next) => {
    Paper.find()
        .then(papers => {
            res.status(200).json({
                message: "All papers fetched successfully!",
                papers: papers
            });
        })
        .catch(error => {
            res.status(500).json({
                message: "Get_paper-Fetching_paper_failed"
            });
        });
};
