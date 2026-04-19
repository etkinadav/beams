const placeSearchOrchestrator = require("../services/placeSearchOrchestrator");
const { evaluateResults } = require("../services/searchResultsEvaluator");
const {
  defaultEvaluationModel,
  defaultConstraints,
} = require("../services/searchContextValidator");
const { applyStrictConstraints, scoreAllCandidates } = require("../services/searchScoringEngine");
const { haversineMeters } = require("../helpers/placePromptScoring");

const ALLOWED_CATEGORIES = ["cafe", "restaurant", "hotel", "bar", "all"];

/**
 * @param {object} p
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

/**
 * @param {object} params
 */
const DISTANCE_HARD_MULTIPLIER = 3;

function runIntelligencePipeline(params) {
  const {
    placesNormalized,
    values,
    planRadiusMeters,
    evaluationModel,
    constraints,
    skipStrict,
    skipDistance,
    centerSource,
    explicitLocationText,
  } = params;

  const explicitNamedPlace =
    centerSource === "explicit_location" ||
    (explicitLocationText != null && String(explicitLocationText).trim() !== "");

  /** @type {Array<{ placeId: string | null, name: string | null, stage: string, reason: string, distanceMeters: number | null, relevanceScoreBeforeRemoval: number | null }>} */
  const filteredOut = [];
  const constraintHandlingLog = [];

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

  const maxAllowedMeters =
    skipDistance === true || explicitNamedPlace
      ? Number.POSITIVE_INFINITY
      : Math.max(1, Number(planRadiusMeters) || 1500) * DISTANCE_HARD_MULTIPLIER;
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
        reason: "Distance exceeded allowed range (hard cap: 3× plan radius unless skipDistance)",
        distanceMeters: Math.round(dist),
        relevanceScoreBeforeRemoval: null,
      });
    }
  }

  let strictFiltered = [];
  let constraintLog = [];
  let warningsByPlaceId = {};
  let candidates = afterDist;

  const hasStrict =
    !skipStrict && constraints && Array.isArray(constraints.strict) && constraints.strict.length > 0;

  if (skipStrict && constraints && constraints.strict && constraints.strict.length > 0) {
    constraintHandlingLog.push("Strict filters skipped (zero-result fallback)");
  }
  if (skipDistance) {
    constraintHandlingLog.push("Distance hard filter skipped (sanity: all candidates were beyond 3× radius)");
  } else if (explicitNamedPlace) {
    constraintHandlingLog.push(
      "Distance hard filter skipped (explicit place in query — user GPS ring would remove valid remote results)"
    );
  }

  if (hasStrict) {
    const r = applyStrictConstraints(afterDist, constraints, values.prompt);
    candidates = r.kept;
    strictFiltered = r.filteredOut;
    constraintLog = r.constraintLog;
    warningsByPlaceId = r.warningsByPlaceId;
    filteredOut.push(...strictFiltered);
  }

  constraintHandlingLog.push(...constraintLog);

  const scoreCtx = {
    userPrompt: values.prompt,
    planRadiusMeters,
    userLat: values.latitude,
    userLng: values.longitude,
  };

  const { rows, perResultScoreBreakdown } = scoreAllCandidates(
    candidates,
    evaluationModel,
    constraints,
    scoreCtx,
    warningsByPlaceId
  );

  const places = rows.map((r) => {
    const p = r.place;
    return {
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
      relevanceScore: r.relevanceScore,
      matchReasons: r.matchReasons,
      warnings: r.warnings,
    };
  });

  return {
    places,
    filteredOut,
    afterNorm,
    afterDist,
    candidates,
    perResultScoreBreakdown,
    constraintHandlingLog,
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

  const debug = true;

  try {
    const { placesNormalized, metaExtra, placesStatus, effectiveRadiusMeters, searchDebug, searchContext } =
      await placeSearchOrchestrator.searchPlaces(apiKey, values, { debug });

    const planRadiusMeters = effectiveRadiusMeters;
    const evaluationModel =
      searchContext && searchContext.evaluationModel
        ? searchContext.evaluationModel
        : defaultEvaluationModel();
    const constraints =
      searchContext && searchContext.constraints ? searchContext.constraints : defaultConstraints();

    const centerSource =
      searchContext && searchContext.searchPlan && searchContext.searchPlan.centerSource != null
        ? searchContext.searchPlan.centerSource
        : null;
    const explicitLocationText =
      searchContext && searchContext.searchPlan && searchContext.searchPlan.explicitLocationText != null
        ? searchContext.searchPlan.explicitLocationText
        : null;

    let fallbackUsed = false;
    let distanceFallbackUsed = false;

    let skipDistance = false;
    let out = runIntelligencePipeline({
      placesNormalized,
      values,
      planRadiusMeters,
      evaluationModel,
      constraints,
      skipStrict: false,
      skipDistance: false,
      centerSource,
      explicitLocationText,
    });

    if (out.afterDist.length === 0 && out.afterNorm.length > 0) {
      distanceFallbackUsed = true;
      const prevLog = out.constraintHandlingLog.slice();
      skipDistance = true;
      out = runIntelligencePipeline({
        placesNormalized,
        values,
        planRadiusMeters,
        evaluationModel,
        constraints,
        skipStrict: false,
        skipDistance: true,
        centerSource,
        explicitLocationText,
      });
      out.constraintHandlingLog = [
        "sanity: re-ran without distance hard filter (nothing within 3× radius)",
        ...prevLog,
        ...out.constraintHandlingLog,
      ];
    }

    if (out.places.length === 0 && constraints.strict && constraints.strict.length > 0) {
      fallbackUsed = true;
      const prevLog = out.constraintHandlingLog.slice();
      out = runIntelligencePipeline({
        placesNormalized,
        values,
        planRadiusMeters,
        evaluationModel,
        constraints,
        skipStrict: true,
        skipDistance,
        centerSource,
        explicitLocationText,
      });
      out.constraintHandlingLog = [
        "fallback: re-ran pipeline without strict filters (zero results)",
        ...prevLog,
        ...out.constraintHandlingLog,
      ];
    }

    const places = out.places;
    const filteredOut = out.filteredOut;
    const perResultScoreBreakdown = out.perResultScoreBreakdown;
    const constraintHandlingLog = out.constraintHandlingLog;

    const googleResultsRawCount = placesNormalized.length;
    const afterNormalizationCount = out.afterNorm.length;
    const afterDistanceFilterCount = out.afterDist.length;
    const afterStrictFilterCount = out.candidates.length;
    const afterScoringCount = places.length;
    const finalResultsCount = places.length;

    console.log("[DEBUG] Google raw results count:", googleResultsRawCount);
    console.log("[DEBUG] After normalization (valid lat/lng):", afterNormalizationCount);
    console.log("[DEBUG] After distance filter:", afterDistanceFilterCount);
    console.log("[DEBUG] After strict filter:", afterStrictFilterCount);
    console.log("[DEBUG] After scoring:", afterScoringCount);
    console.log("[DEBUG] Final results count:", finalResultsCount);

    let debugFlow = null;
    if (debug) {
      const pipelineWarningCount = (constraintHandlingLog || []).filter((line) =>
        String(line).toLowerCase().includes("warning")
      ).length;

      const evalOut = evaluateResults({
        userPrompt: values.prompt,
        geminiPlan: searchDebug && searchDebug.geminiPlan != null ? searchDebug.geminiPlan : null,
        placesResults: places,
        planRadiusMeters: planRadiusMeters,
        pipelineWarningCount,
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
        evaluationModelUsed: evaluationModel,
        searchContext: searchContext || null,
        googleRequestSummary,
        googleResultsRawCount,
        afterNormalizationCount,
        afterDistanceFilterCount,
        afterStrictFilterCount,
        afterScoringCount,
        finalResultsCount,
        filteredOut,
        keptResults,
        perResultScoreBreakdown,
        constraintHandlingLog,
        fallbackUsed,
        distanceFallbackUsed,
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
