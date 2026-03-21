const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const goalSchema = new Schema(
  {
    primaryObjective: { type: String, required: true },
    primaryObjectiveOther: String,
    comparisonType: [String],
    comparisonTypeOther: String,
    successMetrics: [String],
    successMetricsOther: String,
  },
  { _id: false }
);

const cropSchema = new Schema(
  {
    cropType: { type: String, required: true },
    cropVariety: String,
    seedType: String,
    growthStage: String,
  },
  { _id: false }
);

const environmentSchema = new Schema(
  {
    growingMethod: { type: String, required: true },
    growingMethodOther: String,
    country: String,
    region: String,
    climateType: String,
    greenhouse: Boolean,
    controlledEnvironment: Boolean,
  },
  { _id: false }
);

const substrateSchema = new Schema(
  {
    soilType: String,
    soilTypeOther: String,
    drainage: String,
    soilPh: Number,
    substrateNotes: String,
  },
  { _id: false }
);

const irrigationSchema = new Schema(
  {
    irrigationMethod: String,
    irrigationMethodOther: String,
    irrigationFrequency: String,
    waterType: String,
    waterQualityNotes: String,
  },
  { _id: false }
);

const fertilizationSchema = new Schema(
  {
    fertilizationStrategy: String,
    existingFertilizationProtocol: Boolean,
    fertilizerTypes: String,
    nutrientNotes: String,
  },
  { _id: false }
);

const lightingSchema = new Schema(
  {
    sunExposure: String,
    artificialLighting: Boolean,
    lightingType: String,
    averageTemperature: Number,
    humidityNotes: String,
  },
  { _id: false }
);

const trialDesignSchema = new Schema(
  {
    controlGroup: Boolean,
    numberOfGroups: Number,
    replications: Number,
    sampleSizePerGroup: Number,
    plotSize: String,
    experimentDurationValue: Number,
    experimentDurationUnit: String,
    trialDesignNotes: String,
  },
  { _id: false }
);

const priorKnowledgeSchema = new Schema(
  {
    previousExperience: Boolean,
    previousAttempts: String,
    assumptionsToTest: String,
    knownConstraints: String,
  },
  { _id: false }
);

const freeTextSchema = new Schema(
  {
    additionalNotes: String,
  },
  { _id: false }
);

const agronomistQuerySchema = new Schema(
  {
    source: { type: String, default: "public-form" },
    goal: { type: goalSchema, required: true },
    crop: { type: cropSchema, required: true },
    environment: { type: environmentSchema, required: true },
    substrate: { type: substrateSchema, default: () => ({}) },
    irrigation: { type: irrigationSchema, default: () => ({}) },
    fertilization: { type: fertilizationSchema, default: () => ({}) },
    lighting: { type: lightingSchema, default: () => ({}) },
    trialDesign: { type: trialDesignSchema, default: () => ({}) },
    priorKnowledge: { type: priorKnowledgeSchema, default: () => ({}) },
    freeText: { type: freeTextSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "agronomist-query" }
);

module.exports = mongoose.model("AgronomistQuery", agronomistQuerySchema);
