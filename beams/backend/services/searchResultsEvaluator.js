const {
  normalize,
  analyzePromptIntent,
  placeMatchesStrictVeganIntent,
} = require("../helpers/placePromptScoring");

/**
 * @param {object} params
 * @param {string} params.userPrompt
 * @param {object | null} params.geminiPlan
 * @param {Array<{ id: string, name: string, rating?: number|null, distanceMeters?: number|null, types?: string[] }>} params.placesResults
 * @param {number} params.planRadiusMeters
 * @returns {{
 *   overallQuality: "high"|"medium"|"low",
 *   confidence: number,
 *   strictViolations: number,
 *   summary: string,
 *   perResult: Array<{ placeId: string, isMatch: boolean, score: number, reasons: string[] }>
 * }}
 */
function evaluateResults({ userPrompt, geminiPlan: _geminiPlan, placesResults, planRadiusMeters }) {
  console.log("[DEBUG] Evaluating results...");

  const intent = analyzePromptIntent(userPrompt);
  const radius = Math.max(Number(planRadiusMeters) > 0 ? Number(planRadiusMeters) : 1500, 1);

  /** @type {Array<{ placeId: string, isMatch: boolean, score: number, reasons: string[] }>} */
  const perResult = [];
  let strictViolations = 0;

  for (const place of placesResults || []) {
    const reasons = [];
    let score = 50;
    const name = normalize(place.name || "");
    const placeId = place.id != null ? String(place.id) : "";
    const dist =
      place.distanceMeters != null && Number.isFinite(place.distanceMeters)
        ? place.distanceMeters
        : null;

    let isMatch = true;

    if (intent.isStrictVeganQuery) {
      const strong = placeMatchesStrictVeganIntent(place);
      isMatch = strong;
      if (/\bvegan\b/.test(name)) {
        score += 30;
        reasons.push("Strong keyword match (vegan in name)");
      } else if (/\bplant[- ]based\b|\bplantbased\b/.test(name) || (/\bplant\b/.test(name) && /\b(cafe|restaurant|kitchen|food)\b/.test(name))) {
        score += 20;
        reasons.push("Moderate match (plant-based / plant venue)");
      } else if (strong) {
        score += 20;
        reasons.push("Strong vegan signal (types or address)");
      } else {
        score -= 30;
        reasons.push("Violates strict vegan intent");
        strictViolations++;
      }
    } else if (intent.mentionsVeganIntent) {
      if (placeMatchesStrictVeganIntent(place)) {
        score += 20;
        reasons.push("Aligns with vegan-related search");
      } else {
        score -= 10;
        reasons.push("Weak match for vegan-related search");
      }
    }

    if (dist != null) {
      if (dist > radius * 1.5) {
        score -= 20;
        reasons.push("Far distance (>1.5× plan radius)");
      } else if (dist > radius) {
        score -= 20;
        reasons.push("Distance beyond plan radius");
      }
    }

    const rating = typeof place.rating === "number" ? place.rating : null;
    if (isMatch && rating != null) {
      const rb = (rating - 3) * 5;
      score += rb;
      if (rb > 0) {
        reasons.push("Rating boost (relevant match)");
      } else if (rb < 0) {
        reasons.push("Low rating penalty");
      }
    }

    score = Math.round(Math.min(100, Math.max(0, score)));

    perResult.push({ placeId, isMatch, score, reasons });
  }

  const n = perResult.length;
  const avgScore = n > 0 ? perResult.reduce((a, p) => a + p.score, 0) / n : 0;
  const matchRate = n > 0 ? perResult.filter((p) => p.isMatch).length / n : 1;
  const violationRate = n > 0 ? strictViolations / n : 0;

  let overallQuality = "medium";
  if (n === 0) {
    overallQuality = "low";
  } else if (strictViolations === 0 && avgScore >= 65 && matchRate >= 0.85) {
    overallQuality = "high";
  } else if (violationRate > 0.35 || avgScore < 40 || matchRate < 0.5) {
    overallQuality = "low";
  } else {
    overallQuality = "medium";
  }

  const confidence = Math.min(1, Math.max(0, matchRate * 0.55 + (avgScore / 100) * 0.45));

  const summary =
    n === 0
      ? "No results to evaluate."
      : `${n} result(s): ${overallQuality} quality; ${strictViolations} strict issue(s); average score ${avgScore.toFixed(
          0
        )}/100; match rate ${(matchRate * 100).toFixed(0)}%.`;

  console.log("[DEBUG] Evaluation complete");

  return {
    overallQuality,
    confidence,
    strictViolations,
    summary,
    perResult,
  };
}

module.exports = {
  evaluateResults,
};
