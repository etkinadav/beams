const { normalizeIncludedType } = require("../config/allowedPlaceTypes");

const RADIUS_MIN = 100;
const RADIUS_MAX = 50000;
const PAGE_SIZE_MIN = 1;
const PAGE_SIZE_MAX = 20;
const TEXT_QUERY_MAX = 500;
const REASONING_MAX = 600;
const NOTE_MAX = 200;
const NOTES_MAX_ITEMS = 12;

/**
 * @param {unknown} raw
 * @param {{ userPrompt: string }} ctx
 * @returns {{ ok: true, plan: object } | { ok: false, reason: string }}
 */
function validateAndSanitizeSearchPlan(raw, ctx) {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, reason: "plan_not_object" };
  }

  const o = /** @type {Record<string, unknown>} */ (raw);

  let textQuery =
    o.textQuery != null && String(o.textQuery).trim() ? String(o.textQuery).trim() : "";
  if (!textQuery) {
    textQuery = String(ctx.userPrompt || "").trim();
  }
  if (!textQuery) {
    return { ok: false, reason: "empty_text_query" };
  }
  if (textQuery.length > TEXT_QUERY_MAX) {
    textQuery = textQuery.slice(0, TEXT_QUERY_MAX);
  }

  const includedType = normalizeIncludedType(o.includedType);

  let locationMode = o.locationMode;
  if (locationMode !== "bias" && locationMode !== "restriction" && locationMode !== null) {
    locationMode = "bias";
  }

  let centerSource = o.centerSource;
  if (
    centerSource !== "user_location" &&
    centerSource !== "explicit_location" &&
    centerSource !== "map_center" &&
    centerSource !== null
  ) {
    centerSource = "user_location";
  }

  let explicitLocationText =
    o.explicitLocationText != null && o.explicitLocationText !== ""
      ? String(o.explicitLocationText).trim().slice(0, 200)
      : null;

  let radiusMeters = o.radiusMeters;
  if (radiusMeters == null || radiusMeters === "") {
    radiusMeters = null;
  } else {
    radiusMeters = Math.round(Number(radiusMeters));
    if (!Number.isFinite(radiusMeters)) radiusMeters = null;
    else radiusMeters = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, radiusMeters));
  }

  let priceLevels = o.priceLevels;
  if (priceLevels != null && !Array.isArray(priceLevels)) {
    priceLevels = null;
  } else if (Array.isArray(priceLevels)) {
    const allowed = new Set([0, 1, 2, 3, 4]);
    priceLevels = priceLevels
      .map((x) => Math.round(Number(x)))
      .filter((x) => allowed.has(x));
    if (priceLevels.length === 0) priceLevels = null;
    else priceLevels = [...new Set(priceLevels)].slice(0, 5);
  }

  let minRating = o.minRating;
  if (minRating == null || minRating === "") {
    minRating = null;
  } else {
    minRating = Number(minRating);
    if (!Number.isFinite(minRating)) minRating = null;
    else {
      minRating = Math.min(5, Math.max(0, minRating));
      minRating = Math.ceil(minRating * 2) / 2;
    }
  }

  let openNow = o.openNow;
  if (openNow !== true && openNow !== false && openNow !== null) {
    openNow = null;
  }

  let maxResultCount = o.maxResultCount != null && o.maxResultCount !== "" ? Math.round(Number(o.maxResultCount)) : 15;
  if (!Number.isFinite(maxResultCount)) maxResultCount = 15;
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, maxResultCount));

  const reasoningSummary =
    o.reasoningSummary != null ? String(o.reasoningSummary).trim().slice(0, REASONING_MAX) : "";

  let notes = [];
  if (Array.isArray(o.notes)) {
    notes = o.notes
      .map((n) => String(n).trim().slice(0, NOTE_MAX))
      .filter(Boolean)
      .slice(0, NOTES_MAX_ITEMS);
  }

  const plan = {
    textQuery,
    includedType,
    locationMode,
    centerSource,
    explicitLocationText,
    radiusMeters,
    priceLevels,
    minRating,
    openNow,
    pageSize,
    reasoningSummary,
    notes,
  };

  return { ok: true, plan };
}

module.exports = {
  validateAndSanitizeSearchPlan,
  RADIUS_MIN,
  RADIUS_MAX,
  PAGE_SIZE_MAX,
};
