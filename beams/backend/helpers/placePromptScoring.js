/**
 * Lightweight prompt-aware scoring. Separates factual signals from heuristics.
 */

const COFFEE_TERMS = [
  "high quality coffee",
  "specialty coffee",
  "good coffee",
  "great coffee",
  "quality coffee",
  "third wave",
  "espresso",
  "cappuccino",
  "coffee shop",
  "café",
  "cafe",
];

const QUIET_WORK_TERMS = ["quiet", "work", "laptop", "wifi", "study", "focus"];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mentionsCoffeeQuality(promptLower) {
  return COFFEE_TERMS.some((t) => promptLower.includes(t));
}

function mentionsQuietWork(promptLower) {
  return QUIET_WORK_TERMS.some((t) => promptLower.includes(t));
}

function mentionsSmoking(promptLower) {
  return /\bsmoking\b|\bsmoke\b|\bcigarette\b|\bcigar\b/.test(promptLower);
}

function mentionsNightlifeArea(promptLower) {
  return (
    (promptLower.includes("bar") || promptLower.includes("restaurant")) &&
    (promptLower.includes("near") ||
      promptLower.includes("area") ||
      promptLower.includes("walking"))
  );
}

/** Parse a rough max price in ILS from free text (MVP heuristic). */
function parseMaxPriceIls(promptLower) {
  const m = promptLower.match(/(?:under|below|less than|max|maximum|<)\s*(\d[\d,\s]*)\s*(?:ils|nis|₪|shekel)/i);
  if (m) {
    const n = parseInt(String(m[1]).replace(/[\s,]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const m2 = promptLower.match(/(\d[\d,\s]*)\s*(?:ils|nis|₪)\s*(?:per night|a night|\/night)/i);
  if (m2) {
    const n = parseInt(String(m2[1]).replace(/[\s,]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function wantsBudgetPrice(promptLower) {
  return /\bcheap\b|\baffordable\b|\bbudget\b|\binexpensive\b|\blow cost\b/.test(promptLower);
}

function wantsLuxury(promptLower) {
  return /\bluxury\b|\b5\s*star\b|\bfive star\b|\bupscale\b|\bhigh end\b/.test(promptLower);
}

/**
 * Strong constraint language in the user prompt.
 */
function detectStrictQuery(promptLower) {
  return /\bonly\b|\bstrictly\b|\bexclusively\b|\bmust\b|100\s*%|\bfully\b/.test(promptLower);
}

/**
 * User cares about vegan / plant-based food (broad).
 */
function detectVeganFoodIntent(promptLower) {
  return /\bvegan\b|\bplant[- ]based\b|\bplantbased\b|\bwfpb\b|\bwhole[- ]food\s+plant\b/.test(
    promptLower
  );
}

/**
 * Strict vegan-style requirement: must filter/rank aggressively (e.g. "only vegan", "strictly plant-based").
 */
function detectStrictVeganQuery(promptLower) {
  const mentionsVegan = detectVeganFoodIntent(promptLower);
  if (!mentionsVegan) return false;
  const strict = detectStrictQuery(promptLower);
  const explicit =
    /\bonly\s+(a\s+)?(vegan|plant[- ]based|plantbased)\b/.test(promptLower) ||
    /\b(vegan|plant[- ]based)\s+only\b/.test(promptLower) ||
    /\bstrictly\s+(vegan|plant[- ]based)\b/.test(promptLower) ||
    /\b100\s*%\s*vegan\b/.test(promptLower) ||
    /\bfully\s+vegan\b/.test(promptLower);
  return strict || explicit;
}

/**
 * @param {string} prompt
 * @returns {{ promptLower: string, isStrictQuery: boolean, isStrictVeganQuery: boolean, mentionsVeganIntent: boolean }}
 */
function analyzePromptIntent(prompt) {
  const promptLower = normalize(prompt);
  return {
    promptLower,
    isStrictQuery: detectStrictQuery(promptLower),
    isStrictVeganQuery: detectStrictVeganQuery(promptLower),
    mentionsVeganIntent: detectVeganFoodIntent(promptLower),
  };
}

/**
 * Heuristic: place strongly matches vegan/plant-based intent (name, address, Google types).
 * Reviews are not available on our normalized place shape.
 */
function placeMatchesStrictVeganIntent(place) {
  const name = normalize(place.name || "");
  const address = normalize(place.address || "");
  const text = `${name} ${address}`;
  if (/\bvegan\b/.test(text)) return true;
  if (/\bplant[- ]based\b|\bplantbased\b/.test(text)) return true;
  if (/\bplant\b/.test(name) && /\b(cafe|restaurant|kitchen|bistro|bar|grill|food|eatery|diner)\b/.test(name)) {
    return true;
  }
  const types = Array.isArray(place.types) ? place.types : [];
  for (const raw of types) {
    const t = String(raw).toLowerCase();
    if (t.includes("vegan")) return true;
    if (t.includes("vegetarian")) return true;
  }
  return false;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Map Google price_level (0–4) to rough ILS nightly band for hotels (heuristic, not factual pricing).
 */
function priceLevelToHotelBandIls(priceLevel) {
  if (priceLevel == null || priceLevel === undefined) return null;
  const bands = [
    [0, 400],
    [400, 800],
    [800, 1400],
    [1400, 2200],
    [2200, 4000],
  ];
  const idx = Math.min(Math.max(Number(priceLevel), 0), 4);
  return bands[idx];
}

/**
 * @param {object} ctx
 * @param {string} ctx.prompt
 * @param {string} ctx.category - cafe|restaurant|hotel|bar|all
 * @param {number} ctx.userLat
 * @param {number} ctx.userLng
 * @param {number} ctx.radiusMeters - plan radius (e.g. from Gemini), meters
 * @param {boolean} [ctx.isStrictQuery]
 * @param {boolean} [ctx.isStrictVeganQuery]
 * @param {boolean} [ctx.mentionsVeganIntent]
 * @param {object} place - normalized place from Google
 */
function scorePlace(ctx, place) {
  const promptLower = normalize(ctx.prompt);
  const matchReasons = [];
  const warnings = [];

  let score = 50;

  const strict = ctx.isStrictQuery === true;
  const strictVegan = ctx.isStrictVeganQuery === true;
  const mentionsVegan = ctx.mentionsVeganIntent === true;

  const rating = typeof place.rating === "number" ? place.rating : null;
  const total = typeof place.userRatingsTotal === "number" ? place.userRatingsTotal : 0;
  const types = Array.isArray(place.types) ? place.types : [];

  const dist =
    place.distanceMeters != null
      ? place.distanceMeters
      : haversineMeters(ctx.userLat, ctx.userLng, place.lat, place.lng);

  const radiusM = Math.max(ctx.radiusMeters != null ? Number(ctx.radiusMeters) : 1500, 1);

  const ratingWeight = strict ? 6 : 12;
  if (rating != null) {
    score += (rating - 3) * ratingWeight;
    if (!strict) {
      if (rating >= 4.3) matchReasons.push("Strong Google Maps rating");
      else if (rating >= 4.0) matchReasons.push("Solid Google Maps rating");
    } else if (rating >= 4.2) {
      matchReasons.push("Solid rating (downweighted for strict query)");
    }
  }

  const reviewCap = strict ? 8 : 15;
  const reviewMul = strict ? 3 : 6;
  if (total > 0) {
    score += Math.min(reviewCap, Math.log10(total + 1) * reviewMul);
    if (!strict && total >= 100) matchReasons.push("Many user ratings");
  }

  // Distance: bonus inside plan radius; penalty beyond (hard drop >1.5× radius happens in controller)
  if (typeof dist === "number" && !Number.isNaN(dist)) {
    if (dist <= radiusM) {
      const proximity = Math.max(0, 1 - dist / radiusM);
      score += proximity * 18;
      if (dist < 400) matchReasons.push("Close to your location");
    } else if (dist <= radiusM * 1.5) {
      const overRatio = (dist - radiusM) / radiusM;
      const penalty = Math.min(40, Math.round(20 + overRatio * 20));
      score -= penalty;
      matchReasons.push("Distance penalty applied");
    }
  }

  // Category / type alignment
  const cat = ctx.category;
  if (cat === "cafe" && (types.includes("cafe") || types.includes("coffee_shop"))) {
    score += 12;
    matchReasons.push("Cafe category match");
  }
  if (cat === "restaurant" && types.includes("restaurant")) {
    score += 12;
    matchReasons.push("Restaurant category match");
  }
  if (cat === "hotel" && types.includes("lodging")) {
    score += 12;
    matchReasons.push("Hotel / lodging category match");
  }
  if (cat === "bar" && types.includes("bar")) {
    score += 12;
    matchReasons.push("Bar category match");
  }

  const typesLower = types.map((t) => String(t).toLowerCase());
  const nameNorm = normalize(place.name || "");
  const hasVeganInName = /\bvegan\b/.test(nameNorm);
  const hasPlantBasedInName = /\bplant[- ]based\b|\bplantbased\b/.test(nameNorm);
  const hasPartialVeg =
    /\bveggie\b|\bvegetarian\b/.test(nameNorm) || typesLower.some((t) => t.includes("vegetarian"));
  const veganHeuristicMatch = placeMatchesStrictVeganIntent(place);

  if (mentionsVegan || strictVegan) {
    if (hasVeganInName) {
      score += 30;
      matchReasons.push("Name matches vegan intent");
    } else if (hasPlantBasedInName) {
      score += 20;
      matchReasons.push("Strong plant-based keyword in name");
    } else if (hasPartialVeg) {
      score += 10;
      matchReasons.push("Partial match to vegan/vegetarian intent");
    } else if (veganHeuristicMatch) {
      score += 15;
      matchReasons.push("Types or address suggest vegan/vegetarian venue");
    } else if (mentionsVegan && !strictVegan) {
      score -= 30;
      matchReasons.push("Weak relevance to vegan intent");
    }

    if (strictVegan && veganHeuristicMatch) {
      matchReasons.push("Matched strict vegan filter");
    }
  }

  if (mentionsCoffeeQuality(promptLower)) {
    if (types.includes("cafe") || types.includes("coffee_shop")) {
      score += 10;
      matchReasons.push("Coffee-related place type");
    }
    if (rating != null && rating >= 4.2 && total >= 30) {
      score += 8;
      matchReasons.push("Popular & highly rated (proxy for coffee quality)");
    }
  }

  if (mentionsQuietWork(promptLower)) {
    score += 5;
    matchReasons.push("Heuristic: quiet/work-friendly (not verified)");
    warnings.push(
      "Quiet / laptop-friendliness is not verified by Google data; ranking uses soft cues only."
    );
  }

  if (mentionsSmoking(promptLower)) {
    warnings.push("Smoking availability not verified by Google Places data.");
  }

  const maxIls = parseMaxPriceIls(promptLower);
  const priceLevel = place.priceLevel;
  if (ctx.category === "hotel" && maxIls != null && priceLevel != null) {
    const band = priceLevelToHotelBandIls(priceLevel);
    if (band) {
      if (maxIls < band[0]) {
        score -= 12;
        warnings.push(
          "Price level from Google may not match your budget; verify current rates on Maps."
        );
      } else if (maxIls >= band[0] && maxIls <= band[1]) {
        score += 6;
        matchReasons.push("Rough price band vs. your stated budget (heuristic)");
      }
    }
  }

  if (priceLevel != null) {
    if (wantsBudgetPrice(promptLower) && priceLevel >= 3) {
      score -= 8;
      warnings.push("May be pricier than a typical “budget” search (price_level heuristic).");
    }
    if (wantsLuxury(promptLower) && priceLevel <= 1) {
      score -= 5;
    }
  }

  score = Math.round(Math.min(100, Math.max(0, score)));

  const smokingInfo = mentionsSmoking(promptLower) ? "unknown" : undefined;

  return {
    relevanceScore: score,
    matchReasons: [...new Set(matchReasons)].slice(0, 10),
    warnings: [...new Set(warnings)].slice(0, 6),
    smokingInfo,
  };
}

module.exports = {
  normalize,
  mentionsSmoking,
  mentionsNightlifeArea,
  mentionsCoffeeQuality,
  mentionsQuietWork,
  haversineMeters,
  analyzePromptIntent,
  placeMatchesStrictVeganIntent,
  scorePlace,
};
