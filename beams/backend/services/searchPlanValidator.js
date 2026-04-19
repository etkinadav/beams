const { normalizeIncludedType } = require("../config/allowedPlaceTypes");

const RADIUS_MIN = 100;
const RADIUS_MAX = 50000;
/** Hard floor for API page size (never below 5). */
const PAGE_SIZE_MIN = 5;
/** Enforced minimum for ranking quality (Gemini may return 1 otherwise). */
const PAGE_SIZE_ENFORCED_MIN = 8;
const PAGE_SIZE_DEFAULT = 14;
const PAGE_SIZE_MAX = 20;
const TEXT_QUERY_MAX = 500;
const REASONING_MAX = 600;
const NOTE_MAX = 200;
const NOTES_MAX_ITEMS = 12;

/** Skip phrases that are not a named place (e.g. "in my area"). */
const EXPLICIT_LOC_FIRST_WORD_STOP = new Set([
  "my",
  "this",
  "the",
  "here",
  "me",
  "a",
  "an",
  "area",
  "vicinity",
  "location",
  "place",
  "home",
  "work",
  "office",
  "current",
  "your",
  "me",
]);

/**
 * If the user names a place after "in", "at", or "near", treat search center as that place
 * (not device location bias), so distance filtering does not wipe remote results.
 * @param {string} userPrompt
 * @returns {{ explicitLocationText: string, centerSource: "explicit_location" } | null}
 */
function inferExplicitLocationFromPrompt(userPrompt) {
  const s = String(userPrompt || "").trim();
  if (!s) return null;

  const m = s.match(/\b(?:in|at|near)\s+([^,.;]+?)(?:\s*[,.;]|$)/i);
  if (!m || !m[1]) return null;

  let loc = m[1].trim().replace(/\s+/g, " ");
  if (loc.length < 2 || loc.length > 120) return null;

  const first = loc.split(/\s+/)[0].toLowerCase();
  if (EXPLICIT_LOC_FIRST_WORD_STOP.has(first)) return null;
  if (/^(my|this|the)\s+/i.test(loc)) return null;

  return { explicitLocationText: loc, centerSource: "explicit_location" };
}

/**
 * @param {unknown} raw
 * @param {{ userPrompt: string }} ctx
 * @returns {{ ok: true, plan: object } | { ok: false, reason: string }}
 */
function validateAndSanitizeSearchPlan(raw, ctx) {
  const userPrompt = ctx && ctx.userPrompt != null ? String(ctx.userPrompt) : "";
  const userWantsOpenNow = /\b(open now|currently open|open today|still open)\b/i.test(userPrompt);
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
  if (openNow === true && !userWantsOpenNow) {
    openNow = null;
  }

  let maxResultCount =
    o.maxResultCount != null && o.maxResultCount !== "" ? Math.round(Number(o.maxResultCount)) : PAGE_SIZE_DEFAULT;
  if (!Number.isFinite(maxResultCount)) maxResultCount = PAGE_SIZE_DEFAULT;
  let pageSize = Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, maxResultCount));
  pageSize = Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_ENFORCED_MIN, pageSize));

  const reasoningSummary =
    o.reasoningSummary != null ? String(o.reasoningSummary).trim().slice(0, REASONING_MAX) : "";

  let notes = [];
  if (Array.isArray(o.notes)) {
    notes = o.notes
      .map((n) => String(n).trim().slice(0, NOTE_MAX))
      .filter(Boolean)
      .slice(0, NOTES_MAX_ITEMS);
  }

  const inferredLoc = inferExplicitLocationFromPrompt(userPrompt);
  if (inferredLoc) {
    centerSource = inferredLoc.centerSource;
    explicitLocationText = inferredLoc.explicitLocationText;
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
  inferExplicitLocationFromPrompt,
  RADIUS_MIN,
  RADIUS_MAX,
  PAGE_SIZE_MIN,
  PAGE_SIZE_ENFORCED_MIN,
  PAGE_SIZE_MAX,
};
