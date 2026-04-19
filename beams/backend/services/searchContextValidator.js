const { validateAndSanitizeSearchPlan } = require("./searchPlanValidator");
const { normalizeIncludedType } = require("../config/allowedPlaceTypes");

const MAX_DIM_WEIGHT = 0.35;

/** When Gemini omits evaluationModel (legacy) or fallback. */
function defaultEvaluationModel() {
  return {
    dimensions: [
      { name: "rating", weight: 0.22, source: "google_result", strictness: "soft" },
      { name: "rating_count", weight: 0.18, source: "google_result", strictness: "soft" },
      { name: "distance", weight: 0.28, source: "google_result", strictness: "soft" },
      { name: "query_relevance", weight: 0.32, source: "review_inference", strictness: "soft" },
    ],
    metadata: { version: 1, defaultFallback: true },
  };
}

function defaultConstraints() {
  return { strict: [], soft: [], preference: [] };
}

/**
 * @param {unknown} em
 * @returns {{ dimensions: object[], metadata: object }}
 */
function sanitizeEvaluationModel(em) {
  const base = defaultEvaluationModel();
  if (em == null || typeof em !== "object") {
    return base;
  }
  const o = /** @type {Record<string, unknown>} */ (em);
  let dimensions = [];
  if (Array.isArray(o.dimensions)) {
    dimensions = o.dimensions
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const x = /** @type {Record<string, unknown>} */ (d);
        const name = x.name != null ? String(x.name).trim().slice(0, 64) : "dimension";
        let w = Number(x.weight);
        if (!Number.isFinite(w)) w = 0.2;
        w = Math.min(MAX_DIM_WEIGHT, Math.max(0, w));
        const source = ["google_result", "google_filter", "heuristic", "review_inference"].includes(
          String(x.source)
        )
          ? String(x.source)
          : "review_inference";
        const strictness = ["strict", "soft", "preference"].includes(String(x.strictness))
          ? String(x.strictness)
          : "soft";
        return { name, weight: w, source, strictness };
      })
      .filter(Boolean);
  }
  if (!dimensions.length) {
    dimensions = base.dimensions;
  } else {
    const sum = dimensions.reduce((a, d) => a + d.weight, 0);
    if (sum > 0) {
      dimensions = dimensions.map((d) => ({ ...d, weight: d.weight / sum }));
    }
  }
  const metadata =
    o.metadata && typeof o.metadata === "object"
      ? { ...base.metadata, .../** @type {object} */ (o.metadata) }
      : { ...base.metadata };
  return { dimensions, metadata };
}

/**
 * @param {unknown} c
 */
function sanitizeConstraints(c) {
  const out = defaultConstraints();
  if (c == null || typeof c !== "object") {
    return out;
  }
  const o = /** @type {Record<string, unknown>} */ (c);

  if (Array.isArray(o.strict)) {
    out.strict = o.strict
      .map((r) => sanitizeRule(r, "strict"))
      .filter(Boolean);
  }
  if (Array.isArray(o.soft)) {
    out.soft = o.soft
      .map((r) => sanitizeRule(r, "soft"))
      .filter(Boolean);
  }
  if (Array.isArray(o.preference)) {
    out.preference = o.preference
      .map((r) => sanitizeRule(r, "preference"))
      .filter(Boolean);
  }
  return out;
}

/**
 * @param {unknown} r
 * @param {"strict"|"soft"|"preference"} kind
 */
function sanitizeRule(r, kind) {
  if (!r || typeof r !== "object") return null;
  const x = /** @type {Record<string, unknown>} */ (r);
  const id = x.id != null ? String(x.id).trim().slice(0, 64) : "rule";
  const req = toTermArray([
    ...(Array.isArray(x.requiredTerms) ? x.requiredTerms : []),
    ...(Array.isArray(x.terms) ? x.terms : []),
  ]);
  const forb = toTermArray(x.forbiddenTerms);
  const partial = toTermArray(x.partialTerms);
  const confidence = ["high", "medium", "low"].includes(String(x.confidence))
    ? String(x.confidence)
    : "medium";
  const penaltyWeight = kind === "soft" ? clamp01(Number(x.penaltyWeight) || 0.15) : undefined;
  const boostWeight = kind === "preference" ? clamp01(Number(x.boostWeight) || 0.1) : undefined;
  return {
    id,
    requiredTerms: req,
    forbiddenTerms: forb,
    partialTerms: partial,
    confidence,
    ...(penaltyWeight != null ? { penaltyWeight } : {}),
    ...(boostWeight != null ? { boostWeight } : {}),
  };
}

function toTermArray(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => String(t).toLowerCase().trim())
    .filter(Boolean)
    .slice(0, 24);
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

/**
 * Dietary / vibe constraints are not verifiable from Places fields alone — keep as soft penalties, not hard filters.
 * @param {object} constraints
 */
function downgradeUnverifiableStrictConstraints(constraints) {
  if (!constraints || typeof constraints !== "object") {
    return defaultConstraints();
  }
  const strict = Array.isArray(constraints.strict) ? constraints.strict : [];
  const soft = Array.isArray(constraints.soft) ? [...constraints.soft] : [];
  const kept = [];

  for (const r of strict) {
    if (isStrictRuleVerifiableFromGoogleData(r)) {
      kept.push(r);
    } else {
      const id = r.id != null ? String(r.id).trim().slice(0, 64) : "rule";
      soft.push({
        ...r,
        id: id.startsWith("soft_") ? id : `soft_${id}`.slice(0, 64),
        penaltyWeight: r.penaltyWeight != null ? clamp01(Number(r.penaltyWeight)) : 0.12,
      });
    }
  }

  return {
    ...constraints,
    strict: kept,
    soft,
  };
}

/**
 * @param {object} r
 * @returns {boolean}
 */
function isStrictRuleVerifiableFromGoogleData(r) {
  const id = String(r.id || "").toLowerCase();
  const hay = [id, ...(r.requiredTerms || []), ...(r.forbiddenTerms || []), ...(r.partialTerms || [])]
    .join(" ")
    .toLowerCase();

  if (/\b(vegan|vegetarian|healthy|organic|kosher|halal|plant[- ]based)\b/.test(hay)) {
    return false;
  }
  if (/\b(good\s+coffee|best\s+coffee|great\s+coffee|quiet|romantic|study|vibe|atmosphere)\b/.test(hay)) {
    return false;
  }

  if (/\b(open_now|open now|currently open|hours|price|cheap|expensive|budget|affordable|premium)\b/.test(id)) {
    return true;
  }
  if (/\b(place_type|venue_type|category|included_type|type_only)\b/.test(id)) {
    return true;
  }
  if (/\b(open|price|type|category)\b/.test(id) && !/\b(vegan|healthy)\b/.test(id)) {
    return true;
  }

  return false;
}

/**
 * When Gemini fails, still provide a valid searchContext for scoring / debug (never null).
 * @param {{ prompt: string, radius: number, category: string }} values
 */
function buildFallbackSearchContext(values) {
  const userPrompt = values && values.prompt != null ? String(values.prompt).trim() : "";
  const radius = Number(values && values.radius) || 1500;
  const cat = values && values.category != null ? String(values.category).toLowerCase() : "all";

  let includedType = null;
  if (cat === "cafe") includedType = normalizeIncludedType("cafe");
  else if (cat === "restaurant") includedType = normalizeIncludedType("restaurant");
  else if (cat === "hotel") includedType = normalizeIncludedType("lodging");
  else if (cat === "bar") includedType = normalizeIncludedType("bar");

  const radiusMeters = Math.min(8000, Math.max(3000, Math.round(radius)));

  const raw = {
    searchPlan: {
      textQuery: userPrompt || "places nearby",
      includedType,
      locationMode: "bias",
      centerSource: "user_location",
      explicitLocationText: null,
      radiusMeters,
      priceLevels: null,
      minRating: null,
      openNow: null,
      maxResultCount: 14,
      reasoningSummary: "Fallback search plan (Gemini unavailable or invalid plan).",
      notes: ["fallback_search_context"],
    },
    evaluationModel: defaultEvaluationModel(),
    constraints: defaultConstraints(),
  };

  const v = validateSearchContext(raw, { userPrompt: userPrompt || "places" });
  if (!v.ok) {
    const minimal = validateSearchContext(
      {
        searchPlan: {
          textQuery: "places",
          includedType: null,
          locationMode: "bias",
          centerSource: "user_location",
          explicitLocationText: null,
          radiusMeters: 5000,
          priceLevels: null,
          minRating: null,
          openNow: null,
          maxResultCount: 14,
          reasoningSummary: "Minimal fallback plan.",
          notes: [],
        },
        evaluationModel: defaultEvaluationModel(),
        constraints: defaultConstraints(),
      },
      { userPrompt: "places" }
    );
    return minimal.ok ? minimal.searchContext : null;
  }
  return v.searchContext;
}

/**
 * @param {unknown} raw - full Gemini JSON (flat legacy OR { searchPlan, evaluationModel, constraints })
 * @param {{ userPrompt: string }} ctx
 * @returns {{ ok: true, searchContext: object } | { ok: false, reason: string }}
 */
function validateSearchContext(raw, ctx) {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, reason: "plan_not_object" };
  }
  const o = /** @type {Record<string, unknown>} */ (raw);
  const hasNested = o.searchPlan != null && typeof o.searchPlan === "object";
  const planRaw = hasNested ? o.searchPlan : o;

  const v = validateAndSanitizeSearchPlan(planRaw, ctx);
  if (!v.ok) {
    return { ok: false, reason: v.reason };
  }

  const evaluationModel = sanitizeEvaluationModel(hasNested ? o.evaluationModel : null);
  let constraints = sanitizeConstraints(hasNested ? o.constraints : null);
  constraints = downgradeUnverifiableStrictConstraints(constraints);

  return {
    ok: true,
    searchContext: {
      searchPlan: v.plan,
      evaluationModel,
      constraints,
    },
  };
}

module.exports = {
  validateSearchContext,
  buildFallbackSearchContext,
  downgradeUnverifiableStrictConstraints,
  defaultEvaluationModel,
  defaultConstraints,
  sanitizeEvaluationModel,
  sanitizeConstraints,
};
