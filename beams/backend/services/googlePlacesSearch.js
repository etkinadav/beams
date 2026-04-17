const axios = require("axios");

const TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

const CATEGORY_TO_TYPE = {
  cafe: "cafe",
  restaurant: "restaurant",
  hotel: "lodging",
  bar: "bar",
  all: null,
};

/**
 * Approximate count of bars in the area (first page only, max ~20). For UX hints only.
 */
async function countBarsNearby(apiKey, lat, lng, radius) {
  const params = {
    location: `${lat},${lng}`,
    radius: Math.min(Number(radius) || 1500, 2000),
    type: "bar",
    key: apiKey,
  };
  try {
    const { data } = await axios.get(NEARBY_SEARCH_URL, { params, timeout: 12000 });
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { count: null, status: data.status };
    }
    return { count: (data.results || []).length, status: data.status };
  } catch (e) {
    return { count: null, status: "ERROR" };
  }
}

function normalizePlaceResult(place, userLat, userLng) {
  const loc = place.geometry && place.geometry.location;
  const lat = loc ? Number(loc.lat) : NaN;
  const lng = loc ? Number(loc.lng) : NaN;

  let distanceMeters = null;
  if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(userLat) && Number.isFinite(userLng)) {
    const R = 6371000;
    const φ1 = (userLat * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - userLat) * Math.PI) / 180;
    const Δλ = ((lng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceMeters = Math.round(R * c);
  }

  const photos = place.photos || [];
  const photoRef = photos[0] && photos[0].photo_reference ? photos[0].photo_reference : null;

  const openNow =
    place.opening_hours && typeof place.opening_hours.open_now === "boolean"
      ? place.opening_hours.open_now
      : null;

  return {
    id: place.place_id,
    name: place.name || "",
    lat,
    lng,
    address: place.formatted_address || place.vicinity || "",
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingsTotal: typeof place.user_ratings_total === "number" ? place.user_ratings_total : null,
    priceLevel: typeof place.price_level === "number" ? place.price_level : null,
    openNow,
    types: Array.isArray(place.types) ? place.types : [],
    photoReference: photoRef,
    googleMapsUrl: place.place_id
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || "place")}&query_place_id=${place.place_id}`
      : null,
    distanceMeters,
    rawBusinessStatus: place.business_status || null,
  };
}

async function runLegacyTextSearch(apiKey, { prompt, lat, lng, radius, category }) {
  const type = CATEGORY_TO_TYPE[category] || null;
  const params = {
    query: String(prompt).trim(),
    location: `${lat},${lng}`,
    radius: Math.min(Math.max(Number(radius) || 1500, 1), 50000),
    key: apiKey,
  };
  if (type) params.type = type;

  const { data } = await axios.get(TEXT_SEARCH_URL, { params, timeout: 20000 });

  if (data.status === "ZERO_RESULTS") {
    return { results: [], status: data.status, errorMessage: data.error_message };
  }
  if (data.status !== "OK") {
    const err = new Error(data.error_message || `Places API: ${data.status}`);
    err.placesStatus = data.status;
    err.placesData = data;
    throw err;
  }

  return { results: data.results || [], status: data.status, errorMessage: data.error_message };
}

/**
 * Fallback when text search is weak: nearby search by type + keyword from prompt words.
 */
async function runNearbyFallback(apiKey, { prompt, lat, lng, radius, category }) {
  const type = CATEGORY_TO_TYPE[category];
  if (!type) return { results: [] };

  const params = {
    location: `${lat},${lng}`,
    radius: Math.min(Math.max(Number(radius) || 1500, 1), 50000),
    type,
    key: apiKey,
  };
  const words = String(prompt)
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(" ");
  if (words) params.keyword = words;

  const { data } = await axios.get(NEARBY_SEARCH_URL, { params, timeout: 20000 });
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    const err = new Error(data.error_message || `Places API: ${data.status}`);
    err.placesStatus = data.status;
    throw err;
  }
  return { results: data.results || [] };
}

function dedupeByPlaceId(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p.place_id || seen.has(p.place_id)) continue;
    seen.add(p.place_id);
    out.push(p);
  }
  return out;
}

/**
 * Legacy Places Text Search + optional Nearby fallback (unchanged behavior).
 * Used when Gemini / Places (New) path is unavailable or fails.
 */
async function searchPlacesLegacy(apiKey, body) {
  const { prompt, latitude, longitude, radius, category } = body;

  const primary = await runLegacyTextSearch(apiKey, {
    prompt,
    lat: latitude,
    lng: longitude,
    radius,
    category,
  });

  let combined = [...primary.results];

  if (combined.length < 6 && category && category !== "all") {
    const fb = await runNearbyFallback(apiKey, {
      prompt,
      lat: latitude,
      lng: longitude,
      radius,
      category,
    });
    combined = dedupeByPlaceId([...combined, ...fb.results]);
  } else {
    combined = dedupeByPlaceId(combined);
  }

  const normalized = combined.map((r) => normalizePlaceResult(r, latitude, longitude));

  /** Hotel/nightlife meta is attached in `placeSearchOrchestrator` to avoid duplicate work. */
  const metaExtra = {};

  return {
    placesRaw: combined,
    placesNormalized: normalized,
    placesStatus: primary.status,
    metaExtra,
  };
}

module.exports = {
  searchPlacesLegacy,
  runLegacyTextSearch,
  countBarsNearby,
  CATEGORY_TO_TYPE,
  normalizePlaceResult,
};
