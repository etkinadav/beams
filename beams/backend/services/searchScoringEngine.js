/**
 * Dimension-based scoring + constraint handling for the Search Intelligence pipeline.
 * Generic: driven by evaluationModel + constraints from Gemini (no category hardcoding).
 */

const { normalize } = require("../helpers/placePromptScoring");

const SOURCE_CONFIDENCE = {
  google_result: 1,
  google_filter: 1,
  heuristic: 0.85,
  review_inference: 0.6,
};

function normRating(r) {
  if (r == null || !Number.isFinite(Number(r))) return 0.5;
  return Math.min(1, Math.max(0, Number(r) / 5));
}

function normRatingCount(n) {
  const t = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(1, Math.log10(t + 1) / Math.log10(1001));
}

/** Soft score: 0 at >= 3× plan radius; linear decay inside that band (hard filter uses the same multiple in the controller). */
function normDistanceScore(distM, planRadiusMeters) {
  const r = Math.max(1, Number(planRadiusMeters) || 1500);
  const cap = r * 3;
  if (distM == null || !Number.isFinite(distM)) return 0.5;
  return Math.max(0, 1 - Math.min(1, distM / cap));
}

/** @deprecated use normDistanceScore — kept as alias for callers/tests */
function normDistance(distM, maxRadius) {
  return normDistanceScore(distM, maxRadius);
}

function tokenizePrompt(prompt) {
  return String(prompt || "")
    .toLowerCase()
    .split(/[^a-z0-9\u0590-\u05FF]+/i)
    .filter((w) => w.length > 2)
    .slice(0, 40);
}

function inferenceQueryRelevance(place, userPrompt) {
  const hay = `${normalize(place.name || "")} ${(place.types || []).join(" ")}`.toLowerCase();
  const tokens = tokenizePrompt(userPrompt);
  if (!tokens.length) return 0.5;
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits++;
  }
  return Math.min(1, hits / Math.max(3, tokens.length * 0.35));
}

/**
 * @param {object} place
 * @param {object} rule
 * @returns {"pass"|"violation"|"unverified"}
 */
function evaluateStrictRule(place, rule) {
  const hay = `${normalize(place.name || "")} ${normalize(place.address || "")} ${(place.types || []).join(" ")}`.toLowerCase();

  for (const f of rule.forbiddenTerms || []) {
    if (f && hay.includes(f)) {
      return "violation";
    }
  }

  const required = rule.requiredTerms || [];
  const partial = rule.partialTerms || [];

  if (!required.length && !partial.length) {
    return "pass";
  }

  let anyRequired = false;
  for (const t of required) {
    if (t && hay.includes(t)) {
      anyRequired = true;
      break;
    }
  }
  if (anyRequired) {
    return "pass";
  }

  let anyPartialOnly = false;
  for (const t of partial) {
    if (t && hay.includes(t)) {
      anyPartialOnly = true;
      break;
    }
  }

  if (required.length && anyPartialOnly) {
    return "unverified";
  }

  if (required.length) {
    return "unverified";
  }

  return "pass";
}

/**
 * @param {object[]} candidates
 * @param {object} constraints
 * @param {string} userPrompt
 */
function applyStrictConstraints(candidates, constraints, userPrompt) {
  const filteredOut = [];
  const constraintLog = [];
  /** @type {Record<string, string[]>} */
  const warningsByPlaceId = {};

  const strict = constraints && Array.isArray(constraints.strict) ? constraints.strict : [];
  if (!strict.length) {
    return {
      kept: candidates.slice(),
      filteredOut,
      constraintLog: ["No strict rules in constraints"],
      warningsByPlaceId,
    };
  }

  const kept = [];
  for (const p of candidates) {
    const id = p.id != null ? String(p.id) : "";
    let drop = false;
    const reasons = [];

    for (const rule of strict) {
      const ev = evaluateStrictRule(p, rule);
      if (ev === "violation") {
        drop = true;
        reasons.push(`strict:${rule.id}:violation`);
        constraintLog.push(`Dropped ${id || p.name}: strict rule ${rule.id} violation`);
        break;
      }
      if (ev === "unverified") {
        const w = `Unverified strict rule "${rule.id}" — kept with warning`;
        warningsByPlaceId[id] = warningsByPlaceId[id] || [];
        warningsByPlaceId[id].push(w);
        constraintLog.push(`Warning ${id || p.name}: ${w}`);
      }
    }

    if (drop) {
      filteredOut.push({
        placeId: p.id != null ? String(p.id) : null,
        name: p.name != null ? String(p.name) : null,
        stage: "strictFilter",
        reason: reasons.join("; ") || "Strict constraint violation",
        distanceMeters: null,
        relevanceScoreBeforeRemoval: null,
      });
    } else {
      kept.push(p);
    }
  }

  return { kept, filteredOut, constraintLog, warningsByPlaceId };
}

function applySoftPreferenceToTotal(baseTotal, constraints, place) {
  const hay = `${normalize(place.name || "")} ${(place.types || []).join(" ")}`.toLowerCase();
  let softPenalty = 0;
  const soft = constraints && Array.isArray(constraints.soft) ? constraints.soft : [];
  for (const s of soft) {
    const terms = s.requiredTerms || s.terms || [];
    const hit = terms.some((t) => t && hay.includes(t));
    if (!hit && terms.length) {
      softPenalty += s.penaltyWeight != null ? Number(s.penaltyWeight) : 0.08;
    }
  }
  let prefBoost = 0;
  const prefs = constraints && Array.isArray(constraints.preference) ? constraints.preference : [];
  for (const pr of prefs) {
    const terms = pr.requiredTerms || pr.terms || [];
    const hit = terms.some((t) => t && hay.includes(t));
    if (hit && terms.length) {
      prefBoost += pr.boostWeight != null ? Number(pr.boostWeight) : 0.05;
    }
  }
  const t = Math.max(0, Math.min(1, baseTotal - softPenalty + prefBoost));
  return {
    finalScore: Math.round(Math.min(100, Math.max(0, t * 100))),
    softPenalty,
    prefBoost,
  };
}

/**
 * @param {object} place
 * @param {object} evaluationModel
 * @param {{ userPrompt: string, planRadiusMeters: number, userLat: number, userLng: number }} ctx
 */
function scoreDimensionsOnly(place, evaluationModel, ctx) {
  const dims = evaluationModel.dimensions || [];
  const dist =
    place.distanceMeters != null && Number.isFinite(place.distanceMeters)
      ? place.distanceMeters
      : null;

  /** @type {Array<{ name: string, rawValue: unknown, normalizedScore: number, weight: number, contribution: number, source: string }>} */
  const dimensionScores = [];
  let total = 0;

  for (const d of dims) {
    const src = d.source || "review_inference";
    const conf = SOURCE_CONFIDENCE[src] ?? 0.7;
    const w = typeof d.weight === "number" ? d.weight : 0;
    let norm = 0.5;
    let raw = null;

    const dn = (d.name || "").toLowerCase().replace(/\s+/g, "_");
    if (dn.includes("rating") && dn.includes("count")) {
      raw = place.userRatingsTotal;
      norm = normRatingCount(place.userRatingsTotal);
    } else if (dn.includes("popular") || dn.includes("traffic")) {
      raw = place.userRatingsTotal;
      norm = normRatingCount(place.userRatingsTotal);
    } else if (dn.includes("distance") || dn.includes("proximity")) {
      raw = dist;
      norm = normDistanceScore(dist, ctx.planRadiusMeters);
    } else if (
      dn.includes("query") ||
      dn.includes("relevance") ||
      dn.includes("keyword") ||
      dn.includes("text_match")
    ) {
      raw = inferenceQueryRelevance(place, ctx.userPrompt);
      norm = raw;
    } else if (dn.includes("rating") || dn.includes("star")) {
      raw = place.rating;
      norm = normRating(place.rating);
    } else {
      raw = inferenceQueryRelevance(place, ctx.userPrompt);
      norm = raw;
    }

    const effectiveW = w * conf;
    const contribution = norm * effectiveW;
    total += contribution;
    dimensionScores.push({
      name: d.name || "dimension",
      rawValue: raw,
      normalizedScore: Math.round(norm * 1000) / 1000,
      weight: Math.round(w * 1000) / 1000,
      contribution: Math.round(contribution * 1000) / 1000,
      source: src,
    });
  }

  const numericRaws = dimensionScores
    .map((x) => x.rawValue)
    .filter((v) => v != null && (typeof v === "number" ? Number.isFinite(v) : true));
  if (numericRaws.length >= 2) {
    const first = numericRaws[0];
    const allSame = numericRaws.every((v) => v === first);
    if (allSame) {
      console.error("[searchScoringEngine] identical rawValues across dimensions (check planner/model names)", {
        placeId: place.id != null ? String(place.id) : null,
        value: first,
        dimensionNames: dimensionScores.map((x) => x.name),
      });
    }
  }

  return { dimensionScores, baseTotal: total };
}

/**
 * @param {object} place
 * @param {object} evaluationModel
 * @param {object} constraints
 * @param {{ userPrompt: string, planRadiusMeters: number, userLat: number, userLng: number }} ctx
 * @param {string[]} [extraWarnings]
 */
function scorePlaceFull(place, evaluationModel, constraints, ctx, extraWarnings) {
  const { dimensionScores, baseTotal } = scoreDimensionsOnly(place, evaluationModel, ctx);
  const sp = applySoftPreferenceToTotal(baseTotal, constraints, place);
  const warnings = [...(extraWarnings || [])];
  return {
    relevanceScore: sp.finalScore,
    matchReasons: [`intelligence_score:${sp.finalScore}`],
    warnings,
    dimensionScores,
    softPenalty: sp.softPenalty,
    prefBoost: sp.prefBoost,
  };
}

/**
 * @param {object[]} candidates
 * @param {object} evaluationModel
 * @param {object} constraints
 * @param {object} ctx
 * @param {Record<string, string[]>} [warningsByPlaceId]
 */
function scoreAllCandidates(candidates, evaluationModel, constraints, ctx, warningsByPlaceId) {
  const perResultScoreBreakdown = [];
  const rows = [];

  for (const p of candidates) {
    const id = p.id != null ? String(p.id) : "";
    const extra = (warningsByPlaceId && warningsByPlaceId[id]) || [];
    const s = scorePlaceFull(p, evaluationModel, constraints, ctx, extra);
    perResultScoreBreakdown.push({
      placeId: p.id != null ? String(p.id) : null,
      dimensionScores: s.dimensionScores,
      finalScore: s.relevanceScore,
    });
    rows.push({
      place: p,
      relevanceScore: s.relevanceScore,
      matchReasons: s.matchReasons,
      warnings: s.warnings,
    });
  }

  rows.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return { rows, perResultScoreBreakdown };
}

module.exports = {
  SOURCE_CONFIDENCE,
  applyStrictConstraints,
  scorePlaceFull,
  scoreAllCandidates,
  evaluateStrictRule,
  normRating,
  normDistance,
  normDistanceScore,
};
