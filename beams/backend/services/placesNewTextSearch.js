const axios = require("axios");

const PLACES_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

/** Field mask for fields we normalize to the legacy client shape */
const SEARCH_TEXT_FIELD_MASK = [
  "places.id",
  "places.name",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
  "places.regularOpeningHours",
  "places.photos",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

const PRICE_ENUM_TO_NUMBER = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
  PRICE_LEVEL_UNSPECIFIED: null,
};

/**
 * @param {object} place - single Place from Places API (New)
 * @param {number} userLat
 * @param {number} userLng
 * @returns {object} legacy-shaped place for normalizePlaceResult-compatible consumers
 */
function newPlaceToLegacyShape(place, userLat, userLng) {
  const loc = place.location || {};
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);

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

  let placeId = place.id != null ? String(place.id) : "";
  if (!placeId && place.name) {
    placeId = String(place.name).replace(/^places\//, "");
  }
  if (placeId.startsWith("places/")) {
    placeId = placeId.replace(/^places\//, "");
  }
  const displayName = place.displayName && place.displayName.text ? place.displayName.text : "";

  const photos = place.photos || [];
  const photoRef = photos[0] && photos[0].name ? String(photos[0].name) : null;

  const openNow =
    place.regularOpeningHours && typeof place.regularOpeningHours.openNow === "boolean"
      ? place.regularOpeningHours.openNow
      : null;

  const priceEnum = place.priceLevel;
  const priceLevel =
    priceEnum != null && PRICE_ENUM_TO_NUMBER[priceEnum] !== undefined
      ? PRICE_ENUM_TO_NUMBER[priceEnum]
      : typeof priceEnum === "number"
        ? priceEnum
        : null;

  return {
    place_id: placeId,
    name: displayName,
    geometry: { location: { lat, lng } },
    formatted_address: place.formattedAddress || "",
    rating: typeof place.rating === "number" ? place.rating : null,
    user_ratings_total: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    price_level: priceLevel,
    opening_hours: openNow != null ? { open_now: openNow } : undefined,
    types: Array.isArray(place.types) ? place.types : [],
    photos: photoRef ? [{ photo_reference: photoRef }] : [],
    business_status: place.businessStatus || null,
    googleMapsUrl: place.googleMapsUri || null,
    _distanceMeters: distanceMeters,
  };
}

/**
 * @param {object} legacyLike from newPlaceToLegacyShape
 * @param {number} userLat
 * @param {number} userLng
 */
function legacyShapeToNormalized(legacyLike, userLat, userLng) {
  const loc = legacyLike.geometry && legacyLike.geometry.location;
  const lat = loc ? Number(loc.lat) : NaN;
  const lng = loc ? Number(loc.lng) : NaN;
  const openNow =
    legacyLike.opening_hours && typeof legacyLike.opening_hours.open_now === "boolean"
      ? legacyLike.opening_hours.open_now
      : null;
  const photos = legacyLike.photos || [];
  const photoRef = photos[0] && photos[0].photo_reference ? photos[0].photo_reference : null;

  return {
    id: legacyLike.place_id,
    name: legacyLike.name || "",
    lat,
    lng,
    address: legacyLike.formatted_address || "",
    rating: typeof legacyLike.rating === "number" ? legacyLike.rating : null,
    userRatingsTotal: typeof legacyLike.user_ratings_total === "number" ? legacyLike.user_ratings_total : null,
    priceLevel: typeof legacyLike.price_level === "number" ? legacyLike.price_level : null,
    openNow,
    types: Array.isArray(legacyLike.types) ? legacyLike.types : [],
    photoReference: photoRef,
    googleMapsUrl:
      legacyLike.googleMapsUrl ||
      (legacyLike.place_id
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            legacyLike.name || "place"
          )}&query_place_id=${legacyLike.place_id}`
        : null),
    distanceMeters: legacyLike._distanceMeters,
    rawBusinessStatus: legacyLike.business_status || null,
  };
}

/**
 * @param {string} apiKey
 * @param {object} requestBody - Places API (New) SearchTextRequest JSON
 * @returns {Promise<{ resultsLegacyLike: object[], rawStatus: string }>}
 */
async function searchTextNew(apiKey, requestBody) {
  const res = await axios.post(PLACES_SEARCH_TEXT_URL, requestBody, {
    timeout: 25000,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_TEXT_FIELD_MASK,
    },
    validateStatus: () => true,
  });

  const data = res.data;
  if (res.status !== 200) {
    const msg = data?.error?.message || data?.error?.status || `places_new_http_${res.status}`;
    const err = new Error(msg);
    err.httpStatus = res.status;
    err.placesData = data;
    throw err;
  }

  if (data && data.error) {
    const err = new Error(data.error.message || data.error.status || "Places searchText error");
    err.placesStatus = data.error.status;
    err.placesData = data.error;
    throw err;
  }

  const places = Array.isArray(data.places) ? data.places : [];
  return { resultsLegacyLike: places, rawStatus: "OK" };
}

module.exports = {
  searchTextNew,
  newPlaceToLegacyShape,
  legacyShapeToNormalized,
  SEARCH_TEXT_FIELD_MASK,
};
