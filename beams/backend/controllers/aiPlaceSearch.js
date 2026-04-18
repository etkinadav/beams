const placeSearchOrchestrator = require("../services/placeSearchOrchestrator");
const { evaluateResults } = require("../services/searchResultsEvaluator");
const {
  scorePlace,
  analyzePromptIntent,
  placeMatchesStrictVeganIntent,
  haversineMeters,
} = require("../helpers/placePromptScoring");

const ALLOWED_CATEGORIES = ["cafe", "restaurant", "hotel", "bar", "all"];

/**
 * @param {object} p - normalized place
 * @param {number} userLat
 * @param {number} userLng
 * @returns {number | null}
 */
function distanceMetersForPlace(p, userLat, userLng) {
  if (p.distanceMeters != null && Number.isFinite(p.distanceMeters)) {
    return p.distanceMeters;
  }
  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
    return haversineMeters(userLat, userLng, p.lat, p.lng);
  }
  return null;
}

function pickSearchBody(req) {
  const b = req.body || {};
  return {
    prompt: b.prompt,
    latitude: b.latitude,
    longitude: b.longitude,
    radius: b.radius,
    category: b.category,
    mapCenterLat: b.mapCenterLat,
    mapCenterLng: b.mapCenterLng,
    debug: b.debug,
  };
}

function validate(body) {
  const errors = [];
  const prompt = body.prompt != null ? String(body.prompt).trim() : "";
  if (!prompt || prompt.length > 2000) {
    errors.push("prompt is required (1–2000 characters)");
  }

  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.push("latitude must be a number between -90 and 90");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.push("longitude must be a number between -180 and 180");
  }

  let radius = body.radius != null && body.radius !== "" ? Number(body.radius) : 1500;
  if (!Number.isFinite(radius) || radius < 100 || radius > 50000) {
    errors.push("radius must be between 100 and 50000 (meters)");
  }

  const catRaw = body.category != null && body.category !== "" ? String(body.category).toLowerCase() : "all";
  if (!ALLOWED_CATEGORIES.includes(catRaw)) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }

  let mapCenterLat = null;
  let mapCenterLng = null;
  if (body.mapCenterLat != null && body.mapCenterLat !== "") {
    const m = Number(body.mapCenterLat);
    if (Number.isFinite(m) && m >= -90 && m <= 90) {
      mapCenterLat = m;
    }
  }
  if (body.mapCenterLng != null && body.mapCenterLng !== "") {
    const m = Number(body.mapCenterLng);
    if (Number.isFinite(m) && m >= -180 && m <= 180) {
      mapCenterLng = m;
    }
  }

  const debugFlag = body.debug === true || body.debug === "true";

  return {
    errors,
    values: {
      prompt,
      latitude: lat,
      longitude: lng,
      radius,
      category: catRaw,
      mapCenterLat,
      mapCenterLng,
      debug: debugFlag,
    },
  };
}

exports.search = async (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("ai-place-search: missing GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY)");
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "Google Maps API key is not configured",
    });
  }

  const raw = pickSearchBody(req);
  const { errors, values } = validate(raw);
  if (errors.length) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
  }

  // TEMPORARY: always attach meta.searchDebug (geminiPlan, etc.). Restore conditional before production:
  // const debug = values.debug === true || process.env.AI_PLACE_SEARCH_DEBUG === 'true';
  const debug = true;

  try {
    const { placesNormalized, metaExtra, placesStatus, effectiveRadiusMeters, searchDebug } =
      await placeSearchOrchestrator.searchPlaces(apiKey, values, { debug });

    const intent = analyzePromptIntent(values.prompt);
    const planRadiusMeters = effectiveRadiusMeters;

    const googleResultsRawCount = placesNormalized.length;

    /** @type {Array<{ placeId: string | null, name: string | null, stage: string, reason: string, distanceMeters: number | null, relevanceScoreBeforeRemoval: number | null }>} */
    const filteredOut = [];

    const afterNorm = [];
    for (const p of placesNormalized) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
        afterNorm.push(p);
      } else {
        filteredOut.push({
          placeId: p.id != null ? String(p.id) : null,
          name: p.name != null ? String(p.name) : null,
          stage: "normalization",
          reason: "Missing required location data",
          distanceMeters: null,
          relevanceScoreBeforeRemoval: null,
        });
      }
    }

    const maxAllowedMeters = planRadiusMeters * 1.5;
    const afterDist = [];
    for (const p of afterNorm) {
      const dist = distanceMetersForPlace(p, values.latitude, values.longitude);
      if (dist == null || Number.isNaN(dist)) {
        afterDist.push(p);
        continue;
      }
      if (dist <= maxAllowedMeters) {
        afterDist.push(p);
      } else {
        filteredOut.push({
          placeId: p.id != null ? String(p.id) : null,
          name: p.name != null ? String(p.name) : null,
          stage: "distanceFilter",
          reason: "Distance exceeded allowed range",
          distanceMeters: Math.round(dist),
          relevanceScoreBeforeRemoval: null,
        });
      }
    }

    let candidates = afterDist;
    if (intent.isStrictVeganQuery) {
      const afterStrict = [];
      for (const p of afterDist) {
        if (placeMatchesStrictVeganIntent(p)) {
          afterStrict.push(p);
        } else {
          const dist = distanceMetersForPlace(p, values.latitude, values.longitude);
          filteredOut.push({
            placeId: p.id != null ? String(p.id) : null,
            name: p.name != null ? String(p.name) : null,
            stage: "strictFilter",
            reason: "Did not match strict vegan intent",
            distanceMeters: dist != null && !Number.isNaN(dist) ? Math.round(dist) : null,
            relevanceScoreBeforeRemoval: null,
          });
        }
      }
      candidates = afterStrict;
    }

    const afterNormalizationCount = afterNorm.length;
    const afterDistanceFilterCount = afterDist.length;
    const afterStrictFilterCount = candidates.length;

    console.log("[DEBUG] Google raw results count:", googleResultsRawCount);
    console.log("[DEBUG] After normalization (valid lat/lng):", afterNormalizationCount);
    console.log("[DEBUG] After distance filter:", afterDistanceFilterCount);
    console.log("[DEBUG] After strict filter:", afterStrictFilterCount);

    const ctx = {
      prompt: values.prompt,
      category: values.category,
      userLat: values.latitude,
      userLng: values.longitude,
      radiusMeters: planRadiusMeters,
      isStrictQuery: intent.isStrictQuery,
      isStrictVeganQuery: intent.isStrictVeganQuery,
      mentionsVeganIntent: intent.mentionsVeganIntent,
    };

    const places = candidates.map((p) => {
      const s = scorePlace(ctx, p);
      const row = {
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        rating: p.rating,
        userRatingsTotal: p.userRatingsTotal,
        priceLevel: p.priceLevel,
        openNow: p.openNow,
        types: p.types,
        photoReference: p.photoReference,
        photoUrl: null,
        googleMapsUrl: p.googleMapsUrl,
        distanceMeters: p.distanceMeters,
        relevanceScore: s.relevanceScore,
        matchReasons: s.matchReasons,
        warnings: s.warnings,
      };
      if (s.smokingInfo) row.smokingInfo = s.smokingInfo;
      return row;
    });

    places.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    const afterScoringCount = places.length;
    const finalResultsCount = places.length;

    console.log("[DEBUG] After scoring:", afterScoringCount);
    console.log("[DEBUG] Final results count:", finalResultsCount);

    let debugFlow = null;
    if (debug) {
      const evalOut = evaluateResults({
        userPrompt: values.prompt,
        geminiPlan: searchDebug && searchDebug.geminiPlan != null ? searchDebug.geminiPlan : null,
        placesResults: places,
        planRadiusMeters: planRadiusMeters,
      });

      const plannerSource = searchDebug && searchDebug.plannerSource != null ? searchDebug.plannerSource : null;
      const fallbackReason = searchDebug && searchDebug.fallbackReason !== undefined ? searchDebug.fallbackReason : null;
      const geminiPlan = searchDebug && searchDebug.geminiPlan != null ? searchDebug.geminiPlan : null;
      const googleRequestSummary =
        searchDebug && searchDebug.googleRequestSummary != null ? searchDebug.googleRequestSummary : null;

      const keptResults = places.map((row) => ({
        placeId: row.id != null ? String(row.id) : null,
        name: row.name != null ? String(row.name) : null,
        finalRelevanceScore: typeof row.relevanceScore === "number" ? row.relevanceScore : null,
        matchReasons: Array.isArray(row.matchReasons) ? row.matchReasons : [],
        warnings: Array.isArray(row.warnings) ? row.warnings : [],
      }));

      debugFlow = {
        userPrompt: values.prompt,
        plannerSource,
        fallbackReason,
        geminiPlan,
        googleRequestSummary,
        googleResultsRawCount,
        afterNormalizationCount,
        afterDistanceFilterCount,
        afterStrictFilterCount,
        afterScoringCount,
        finalResultsCount,
        filteredOut,
        keptResults,
        evaluator: {
          overallQuality: evalOut.overallQuality,
          confidence: evalOut.confidence,
          strictViolations: evalOut.strictViolations,
          summary: evalOut.summary,
        },
        perResultEvaluation: evalOut.perResult,
      };
    }

    const meta = {
      prompt: values.prompt,
      location: { lat: values.latitude, lng: values.longitude },
      radius: values.radius,
      category: values.category,
      totalResults: places.length,
      placesApiStatus: placesStatus,
      ...metaExtra,
    };
    if (debug && searchDebug) {
      meta.searchDebug = searchDebug;
    }
    if (debug && debugFlow) {
      meta.debugFlow = debugFlow;
    }

    return res.json({
      meta,
      places,
    });
  } catch (err) {
    const msg = err.message || "Google Places request failed";
    console.error("ai-place-search:", msg);
    const httpStatus = err.response && err.response.status;
    const status = httpStatus && httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502;
    return res.status(status).json({
      error: "Places API error",
      message: msg,
      placesStatus: err.placesStatus || null,
    });
  }
};
