/**
 * Builds Places API (New) `places:searchText` JSON body from a validated Gemini plan + request context.
 * Does not perform HTTP — caller owns the network call and field mask.
 */

const NUM_TO_PRICE_ENUM = {
  0: "PRICE_LEVEL_FREE",
  1: "PRICE_LEVEL_INEXPENSIVE",
  2: "PRICE_LEVEL_MODERATE",
  3: "PRICE_LEVEL_EXPENSIVE",
  4: "PRICE_LEVEL_VERY_EXPENSIVE",
};

/**
 * @param {number[] | null} levels
 * @returns {string[] | null}
 */
function priceLevelsToApiEnums(levels) {
  if (!levels || !levels.length) return null;
  const out = [];
  for (const n of levels) {
    const e = NUM_TO_PRICE_ENUM[n];
    if (e && !out.includes(e)) out.push(e);
  }
  return out.length ? out : null;
}

/**
 * Validated + sanitized Gemini plan (also used when merging category hints).
 * @typedef {object} ValidatedSearchPlan
 * @property {string} textQuery
 * @property {string | null} includedType
 * @property {"bias" | "restriction" | null} locationMode
 * @property {"user_location" | "explicit_location" | "map_center" | null} centerSource
 * @property {string | null} explicitLocationText
 * @property {number | null} radiusMeters
 * @property {number[] | null} priceLevels
 * @property {number | null} minRating
 * @property {boolean | null} openNow
 * @property {number} pageSize
 * @property {string} reasoningSummary
 * @property {string[]} notes
 */

/**
 * @typedef {object} BuilderContext
 * @property {number} userLat
 * @property {number} userLng
 * @property {number} clientRadiusMeters
 * @property {number | null} [mapCenterLat]
 * @property {number | null} [mapCenterLng]
 */

/**
 * Approximate axis-aligned bounding box from center + radius (meters), for locationRestriction.rectangle.
 */
function rectangleFromCenterRadius(lat, lng, radiusMeters) {
  const r = Math.max(100, Math.min(50000, radiusMeters));
  const dLat = r / 111320;
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1e-6;
  const dLng = r / (111320 * cosLat);
  return {
    low: { latitude: lat - dLat, longitude: lng - dLng },
    high: { latitude: lat + dLat, longitude: lng + dLng },
  };
}

/**
 * @param {ValidatedSearchPlan} plan
 * @param {BuilderContext} ctx
 * @returns {{ body: object, summary: object }}
 */
function buildSearchTextRequest(plan, ctx) {
  const radius =
    plan.radiusMeters != null && Number.isFinite(plan.radiusMeters)
      ? plan.radiusMeters
      : ctx.clientRadiusMeters;

  /** @type {Record<string, unknown>} */
  const body = {
    textQuery: plan.textQuery,
    pageSize: plan.pageSize,
  };

  if (plan.includedType) {
    body.includedType = plan.includedType;
    body.strictTypeFiltering = false;
  }

  if (plan.openNow === true) {
    body.openNow = true;
  }

  if (plan.minRating != null) {
    body.minRating = plan.minRating;
  }

  const apiPrice = priceLevelsToApiEnums(plan.priceLevels);
  if (apiPrice && apiPrice.length) {
    body.priceLevels = apiPrice;
  }

  const center = resolveGeoCenter(plan, ctx);
  const mode = plan.locationMode || (plan.centerSource === "explicit_location" ? null : "bias");

  if (center && mode === "restriction") {
    body.locationRestriction = {
      rectangle: rectangleFromCenterRadius(center.lat, center.lng, radius),
    };
  } else if (center && mode === "bias") {
    body.locationBias = {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: Number(radius),
      },
    };
  }

  const summary = {
    textQuery: plan.textQuery,
    includedType: plan.includedType,
    locationBias: body.locationBias || null,
    locationRestriction: body.locationRestriction || null,
    openNow: body.openNow ?? null,
    minRating: body.minRating ?? null,
    priceLevels: body.priceLevels ?? null,
    pageSize: body.pageSize,
    centerSource: plan.centerSource,
    locationMode: plan.locationMode,
  };

  return { body, summary };
}

/**
 * @param {ValidatedSearchPlan} plan
 * @param {BuilderContext} ctx
 */
function resolveGeoCenter(plan, ctx) {
  if (plan.centerSource === "explicit_location") {
    return null;
  }
  if (plan.centerSource === "map_center") {
    const lat = ctx.mapCenterLat;
    const lng = ctx.mapCenterLng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  if (Number.isFinite(ctx.userLat) && Number.isFinite(ctx.userLng)) {
    return { lat: ctx.userLat, lng: ctx.userLng };
  }
  return null;
}

module.exports = {
  buildSearchTextRequest,
  rectangleFromCenterRadius,
};
