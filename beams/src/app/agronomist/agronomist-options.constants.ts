export interface SelectOption {
  value: string;
  /** ngx-translate key */
  labelKey: string;
}

export const PRIMARY_OBJECTIVE_OPTIONS: SelectOption[] = [
  { value: "improve_yield", labelKey: "agronomist.opt.improve_yield" },
  { value: "test_new_variety", labelKey: "agronomist.opt.test_new_variety" },
  { value: "optimize_fertilization", labelKey: "agronomist.opt.optimize_fertilization" },
  { value: "optimize_irrigation", labelKey: "agronomist.opt.optimize_irrigation" },
  { value: "disease_resistance", labelKey: "agronomist.opt.disease_resistance" },
  { value: "growth_rate", labelKey: "agronomist.opt.growth_rate" },
  { value: "quality_improvement", labelKey: "agronomist.opt.quality_improvement" },
  { value: "other", labelKey: "agronomist.opt.other" },
];

export const COMPARISON_TYPE_OPTIONS: SelectOption[] = [
  { value: "varieties", labelKey: "agronomist.opt.varieties" },
  { value: "fertilizers", labelKey: "agronomist.opt.fertilizers" },
  { value: "irrigation", labelKey: "agronomist.opt.irrigation" },
  { value: "climate_conditions", labelKey: "agronomist.opt.climate_conditions" },
  { value: "light_conditions", labelKey: "agronomist.opt.light_conditions" },
  { value: "substrate", labelKey: "agronomist.opt.substrate" },
  { value: "pest_treatment", labelKey: "agronomist.opt.pest_treatment" },
  { value: "other", labelKey: "agronomist.opt.other" },
];

export const SUCCESS_METRICS_OPTIONS: SelectOption[] = [
  { value: "yield", labelKey: "agronomist.opt.yield" },
  { value: "height", labelKey: "agronomist.opt.height" },
  { value: "weight", labelKey: "agronomist.opt.weight" },
  { value: "growth_speed", labelKey: "agronomist.opt.growth_speed" },
  { value: "plant_health", labelKey: "agronomist.opt.plant_health" },
  { value: "disease_level", labelKey: "agronomist.opt.disease_level" },
  { value: "fruit_quality", labelKey: "agronomist.opt.fruit_quality" },
  { value: "other", labelKey: "agronomist.opt.other" },
];

export const GROWTH_STAGE_OPTIONS: SelectOption[] = [
  { value: "seeding", labelKey: "agronomist.opt.seeding" },
  { value: "seedling", labelKey: "agronomist.opt.seedling" },
  { value: "vegetative", labelKey: "agronomist.opt.vegetative" },
  { value: "flowering", labelKey: "agronomist.opt.flowering" },
  { value: "fruiting", labelKey: "agronomist.opt.fruiting" },
  { value: "harvest_ready", labelKey: "agronomist.opt.harvest_ready" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const GROWING_METHOD_OPTIONS: SelectOption[] = [
  { value: "open_field", labelKey: "agronomist.opt.open_field" },
  { value: "greenhouse", labelKey: "agronomist.opt.greenhouse" },
  { value: "hydroponic", labelKey: "agronomist.opt.hydroponic" },
  { value: "indoor", labelKey: "agronomist.opt.indoor" },
  { value: "shade_house", labelKey: "agronomist.opt.shade_house" },
  { value: "other", labelKey: "agronomist.opt.other" },
];

export const CLIMATE_TYPE_OPTIONS: SelectOption[] = [
  { value: "tropical", labelKey: "agronomist.opt.tropical" },
  { value: "mediterranean", labelKey: "agronomist.opt.mediterranean" },
  { value: "arid", labelKey: "agronomist.opt.arid" },
  { value: "temperate", labelKey: "agronomist.opt.temperate" },
  { value: "continental", labelKey: "agronomist.opt.continental" },
  { value: "subtropical", labelKey: "agronomist.opt.subtropical" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const SOIL_TYPE_OPTIONS: SelectOption[] = [
  { value: "sandy", labelKey: "agronomist.opt.sandy" },
  { value: "clay", labelKey: "agronomist.opt.clay" },
  { value: "loamy", labelKey: "agronomist.opt.loamy" },
  { value: "silty", labelKey: "agronomist.opt.silty" },
  { value: "peat", labelKey: "agronomist.opt.peat" },
  { value: "coco_coir", labelKey: "agronomist.opt.coco_coir" },
  { value: "rockwool", labelKey: "agronomist.opt.rockwool" },
  { value: "mixed", labelKey: "agronomist.opt.mixed" },
  { value: "other", labelKey: "agronomist.opt.other" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const DRAINAGE_OPTIONS: SelectOption[] = [
  { value: "good", labelKey: "agronomist.opt.good" },
  { value: "medium", labelKey: "agronomist.opt.medium" },
  { value: "poor", labelKey: "agronomist.opt.poor" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const IRRIGATION_METHOD_OPTIONS: SelectOption[] = [
  { value: "drip", labelKey: "agronomist.opt.drip" },
  { value: "sprinkler", labelKey: "agronomist.opt.sprinkler" },
  { value: "manual", labelKey: "agronomist.opt.manual" },
  { value: "flood", labelKey: "agronomist.opt.flood" },
  { value: "hydroponic_circulation", labelKey: "agronomist.opt.hydroponic_circulation" },
  { value: "other", labelKey: "agronomist.opt.other" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const FERTILIZATION_STRATEGY_OPTIONS: SelectOption[] = [
  { value: "organic", labelKey: "agronomist.opt.organic" },
  { value: "chemical", labelKey: "agronomist.opt.chemical" },
  { value: "mixed", labelKey: "agronomist.opt.mixed" },
  { value: "none", labelKey: "agronomist.opt.none" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const SUN_EXPOSURE_OPTIONS: SelectOption[] = [
  { value: "full_sun", labelKey: "agronomist.opt.full_sun" },
  { value: "partial_sun", labelKey: "agronomist.opt.partial_sun" },
  { value: "shade", labelKey: "agronomist.opt.shade" },
  { value: "controlled_light", labelKey: "agronomist.opt.controlled_light" },
  { value: "unknown", labelKey: "agronomist.opt.unknown" },
];

export const EXPERIMENT_DURATION_UNIT_OPTIONS: SelectOption[] = [
  { value: "days", labelKey: "agronomist.opt.days" },
  { value: "weeks", labelKey: "agronomist.opt.weeks" },
  { value: "months", labelKey: "agronomist.opt.months" },
];
