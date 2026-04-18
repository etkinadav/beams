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
}

export interface AiPlaceSearchResponse {
  meta: AiPlaceSearchMeta;
  places: AiPlaceResult[];
}
