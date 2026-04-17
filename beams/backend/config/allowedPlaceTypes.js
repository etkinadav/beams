/**
 * Subset of Places API (New) Table A primary types we allow Gemini → includedType to map to.
 * @see https://developers.google.com/maps/documentation/places/web-service/place-types
 */
const ALLOWED_INCLUDED_TYPES = new Set([
  "restaurant",
  "cafe",
  "coffee_shop",
  "bar",
  "bakery",
  "meal_delivery",
  "meal_takeaway",
  "fast_food_restaurant",
  "fine_dining_restaurant",
  "brunch_restaurant",
  "ice_cream_shop",
  "lodging",
  "hotel",
  "motel",
  "hostel",
  "spa",
  "tourist_attraction",
  "museum",
  "library",
  "book_store",
  "park",
  "gym",
  "night_club",
  "store",
  "supermarket",
  "convenience_store",
  "pharmacy",
  "shopping_mall",
]);

function normalizeIncludedType(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (!ALLOWED_INCLUDED_TYPES.has(s)) return null;
  return s;
}

module.exports = {
  ALLOWED_INCLUDED_TYPES,
  normalizeIncludedType,
};
