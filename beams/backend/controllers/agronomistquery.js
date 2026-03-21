const mongoose = require("mongoose");
const AgronomistQuery = require("../models/agronomistquery");

function normalizePayload(body) {
  const g = body.goal || {};
  const c = body.crop || {};
  const e = body.environment || {};

  const goal = {
    primaryObjective: g.primaryObjective != null ? String(g.primaryObjective) : "",
    primaryObjectiveOther: g.primaryObjectiveOther,
    comparisonType: Array.isArray(g.comparisonType) ? g.comparisonType : [],
    comparisonTypeOther: g.comparisonTypeOther,
    successMetrics: Array.isArray(g.successMetrics) ? g.successMetrics : [],
    successMetricsOther: g.successMetricsOther,
  };
  const crop = {
    cropType: c.cropType != null ? String(c.cropType) : "",
    cropVariety: c.cropVariety,
    seedType: c.seedType,
    growthStage: c.growthStage,
  };
  const environment = {
    growingMethod: e.growingMethod != null ? String(e.growingMethod) : "",
    growingMethodOther: e.growingMethodOther,
    country: e.country,
    region: e.region,
    climateType: e.climateType,
    greenhouse: e.greenhouse,
    controlledEnvironment: e.controlledEnvironment,
  };

  return {
    source: body.source || "public-form",
    goal,
    crop,
    environment,
    substrate: body.substrate || {},
    irrigation: body.irrigation || {},
    fertilization: body.fertilization || {},
    lighting: body.lighting || {},
    trialDesign: body.trialDesign || {},
    priorKnowledge: body.priorKnowledge || {},
    freeText: body.freeText || {},
  };
}

function validateRequired(doc) {
  const errors = [];
  if (!doc.goal?.primaryObjective || !String(doc.goal.primaryObjective).trim()) {
    errors.push("goal.primaryObjective is required");
  }
  if (!doc.crop?.cropType || !String(doc.crop.cropType).trim()) {
    errors.push("crop.cropType is required");
  }
  if (!doc.environment?.growingMethod || !String(doc.environment.growingMethod).trim()) {
    errors.push("environment.growingMethod is required");
  }
  return errors;
}

exports.create = async (req, res) => {
  try {
    const payload = normalizePayload(req.body || {});
    const validationErrors = validateRequired(payload);
    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: "Validation failed",
        details: validationErrors,
      });
    }

    const created = await AgronomistQuery.create(payload);
    return res.status(201).json({
      success: true,
      message: "Agronomist query saved",
      id: created._id,
      data: created.toObject(),
    });
  } catch (err) {
    console.error("[AgronomistQuery] create error:", err.message, err.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to save agronomist query",
      error: "Failed to save agronomist query",
      details: err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
        error: "Invalid id",
      });
    }
    const doc = await AgronomistQuery.findById(id).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Not found",
        error: "Not found",
      });
    }
    return res.json({
      success: true,
      data: doc,
    });
  } catch (err) {
    console.error("[AgronomistQuery] getById error:", err.message, err.stack);
    return res.status(500).json({
      success: false,
      message: "Failed to load agronomist query",
      error: "Failed to load agronomist query",
      details: err.message,
    });
  }
};
