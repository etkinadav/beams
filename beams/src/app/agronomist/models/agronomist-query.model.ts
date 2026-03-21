/** Payload shape for POST /api/agronomist-query (matches backend nested sections). */
export interface AgronomistQueryGoal {
  primaryObjective: string;
  primaryObjectiveOther?: string;
  comparisonType?: string[];
  comparisonTypeOther?: string;
  successMetrics?: string[];
  successMetricsOther?: string;
}

export interface AgronomistQueryCrop {
  cropType: string;
  cropVariety?: string;
  seedType?: string;
  growthStage?: string;
}

export interface AgronomistQueryEnvironment {
  growingMethod: string;
  growingMethodOther?: string;
  country?: string;
  region?: string;
  climateType?: string;
  greenhouse?: boolean | null;
  controlledEnvironment?: boolean | null;
}

export interface AgronomistQuerySubstrate {
  soilType?: string;
  soilTypeOther?: string;
  drainage?: string;
  soilPh?: number | null;
  substrateNotes?: string;
}

export interface AgronomistQueryIrrigation {
  irrigationMethod?: string;
  irrigationMethodOther?: string;
  irrigationFrequency?: string;
  waterType?: string;
  waterQualityNotes?: string;
}

export interface AgronomistQueryFertilization {
  fertilizationStrategy?: string;
  existingFertilizationProtocol?: boolean | null;
  fertilizerTypes?: string;
  nutrientNotes?: string;
}

export interface AgronomistQueryLighting {
  sunExposure?: string;
  artificialLighting?: boolean | null;
  lightingType?: string;
  averageTemperature?: number | null;
  humidityNotes?: string;
}

export interface AgronomistQueryTrialDesign {
  controlGroup?: boolean | null;
  numberOfGroups?: number | null;
  replications?: number | null;
  sampleSizePerGroup?: number | null;
  plotSize?: string;
  experimentDurationValue?: number | null;
  experimentDurationUnit?: string;
  trialDesignNotes?: string;
}

export interface AgronomistQueryPriorKnowledge {
  previousExperience?: boolean | null;
  previousAttempts?: string;
  assumptionsToTest?: string;
  knownConstraints?: string;
}

export interface AgronomistQueryFreeText {
  additionalNotes?: string;
}

export interface AgronomistQueryPayload {
  source?: string;
  goal: AgronomistQueryGoal;
  crop: AgronomistQueryCrop;
  environment: AgronomistQueryEnvironment;
  substrate?: AgronomistQuerySubstrate;
  irrigation?: AgronomistQueryIrrigation;
  fertilization?: AgronomistQueryFertilization;
  lighting?: AgronomistQueryLighting;
  trialDesign?: AgronomistQueryTrialDesign;
  priorKnowledge?: AgronomistQueryPriorKnowledge;
  freeText?: AgronomistQueryFreeText;
}

export interface AgronomistQueryCreateResponse {
  success: boolean;
  message?: string;
  id?: string;
  data?: unknown;
  error?: string;
  details?: string | string[];
}

export interface AgronomistQueryGetResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
