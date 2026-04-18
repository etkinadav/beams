export type AiPlaceCategory = "cafe" | "restaurant" | "hotel" | "bar" | "all";

export interface AiPlaceSearchRequest {
  prompt: string;
  latitude: number;
  longitude: number;
  radius: number;
  category: AiPlaceCategory;
}

export interface AiPlaceResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  openNow: boolean | null;
  types: string[];
  photoReference: string | null;
  photoUrl: string | null;
  googleMapsUrl: string | null;
  distanceMeters: number | null;
  relevanceScore: number;
  matchReasons: string[];
  warnings: string[];
  smokingInfo?: string;
}

/** Present only when backend debug is on (request `debug: true` or `AI_PLACE_SEARCH_DEBUG`). */
export interface AiPlaceSearchDebugMeta {
  plannerSource?: string;
  fallbackReason?: string | null;
  geminiPlan?: Record<string, unknown> | null;
  sanitizedPlan?: Record<string, unknown> | null;
  googleRequestSummary?: Record<string, unknown> | null;
  effectiveRadiusMeters?: number;
  /** True when server skipped Google Places calls (debug build). */
  debugStoppedBeforeGoogle?: boolean;
}

/** Full pipeline debug when server builds `meta.debugFlow` (debug mode). */
export interface AiPlaceSearchDebugFlowMeta {
  userPrompt?: string;
  plannerSource?: string | null;
  fallbackReason?: string | null;
  geminiPlan?: Record<string, unknown> | null;
  googleRequestSummary?: Record<string, unknown> | null;
  googleResultsRawCount?: number;
  afterNormalizationCount?: number;
  afterDistanceFilterCount?: number;
  afterStrictFilterCount?: number;
  afterScoringCount?: number;
  finalResultsCount?: number;
  filteredOut?: Array<{
    placeId: string | null;
    name: string | null;
    stage: string;
    reason: string;
    distanceMeters: number | null;
    relevanceScoreBeforeRemoval: number | null;
  }>;
  keptResults?: Array<{
    placeId: string | null;
    name: string | null;
    finalRelevanceScore: number | null;
    matchReasons: string[];
    warnings: string[];
  }>;
  evaluator?: {
    overallQuality?: string;
    confidence?: number;
    strictViolations?: number;
    summary?: string;
  };
  perResultEvaluation?: Array<{
    placeId: string;
    isMatch: boolean;
    score: number;
    reasons: string[];
  }>;
}

export interface AiPlaceSearchMeta {
  prompt: string;
  location: { lat: number; lng: number };
  radius: number;
  category: string;
  totalResults: number;
  placesApiStatus?: string;
  nearbyBarsSampleCount?: number | null;
  nearbyBarsNote?: string | null;
  searchDebug?: AiPlaceSearchDebugMeta;
  debugFlow?: AiPlaceSearchDebugFlowMeta;
}

export interface AiPlaceSearchResponse {
  meta: AiPlaceSearchMeta;
  places: AiPlaceResult[];
}
