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

export interface AiPlaceSearchMeta {
  prompt: string;
  location: { lat: number; lng: number };
  radius: number;
  category: string;
  totalResults: number;
  placesApiStatus?: string;
  nearbyBarsSampleCount?: number | null;
  nearbyBarsNote?: string | null;
}

export interface AiPlaceSearchResponse {
  meta: AiPlaceSearchMeta;
  places: AiPlaceResult[];
}
