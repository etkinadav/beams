const { planWithGemini } = require("./geminiSearchPlanner");
const { validateAndSanitizeSearchPlan } = require("./searchPlanValidator");
const { buildSearchTextRequest } = require("./placesRequestBuilder");
const { searchTextNew, newPlaceToLegacyShape, legacyShapeToNormalized } = require("./placesNewTextSearch");
const { searchPlacesLegacy, countBarsNearby } = require("./googlePlacesSearch");
const { normalize, mentionsNightlifeArea } = require("../helpers/placePromptScoring");
const { normalizeIncludedType } = require("../config/allowedPlaceTypes");

const CATEGORY_MERGE = {
  cafe: "cafe",
  restaurant: "restaurant",
  hotel: "lodging",
  bar: "bar",
};

/**
 * TEMPORARY DEBUG — set to `false` to restore normal flow (Gemini → Places New → optional legacy).
 * While `true`:
 * - No Google API calls at all (no Places New, no legacy text/nearby, no countBarsNearby).
 * - Only Gemini planning runs; response is empty places + searchDebug.geminiPlan when validation succeeds.
 */
const TEMP_DEBUG_HARD_STOP_AFTER_GEMINI_PLAN = true;

/**
 * @param {object} values
 * @param {boolean} debug
 * @param {object} partial - extra searchDebug fields
 */
function emptyResultWithDebug(values, debug, partial) {
  const effectiveRadiusMeters = partial.effectiveRadiusMeters ?? values.radius;
  const searchDebug = debug
    ? {
        plannerSource: partial.plannerSource ?? "gemini",
        fallbackReason: partial.fallbackReason ?? null,
        geminiPlan: partial.geminiPlan ?? null,
        sanitizedPlan: partial.sanitizedPlan ?? partial.geminiPlan ?? null,
        googleRequestSummary: partial.googleRequestSummary ?? null,
        effectiveRadiusMeters,
        debugStoppedBeforeGoogle: partial.debugStoppedBeforeGoogle === true,
        ...partial.extra,
      }
    : null;
  return {
    placesNormalized: [],
    placesStatus: "OK",
    metaExtra: {},
    effectiveRadiusMeters,
    searchDebug,
  };
}

/**
 * @param {object} values - validated controller body
 * @param {{ debug?: boolean }} [options]
 */
async function searchPlaces(apiKey, values, options = {}) {
  const debug = options.debug === true;

  const ctxBuilder = {
    userLat: values.latitude,
    userLng: values.longitude,
    clientRadiusMeters: values.radius,
    categoryHint: values.category,
    mapCenterLat: values.mapCenterLat != null ? Number(values.mapCenterLat) : null,
    mapCenterLng: values.mapCenterLng != null ? Number(values.mapCenterLng) : null,
  };

  // ---------------------------------------------------------------------------
  // TEMPORARY: isolated path — zero Google HTTP calls (see TEMP_DEBUG_HARD_STOP_*)
  // ---------------------------------------------------------------------------
  if (TEMP_DEBUG_HARD_STOP_AFTER_GEMINI_PLAN) {
    console.log("[DEBUG] Hard stop mode active — Google Places will not be called");

    const hasGemini = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());
    if (!hasGemini) {
      console.log("[DEBUG] Gemini skipped: missing GEMINI_API_KEY");
      return emptyResultWithDebug(values, debug, {
        plannerSource: "fallback",
        fallbackReason: "missing_gemini_key",
        geminiPlan: null,
        debugStoppedBeforeGoogle: true,
      });
    }

    console.log("[DEBUG] Calling Gemini planner…");
    const gemini = await planWithGemini({
      userPrompt: values.prompt,
      userLat: values.latitude,
      userLng: values.longitude,
      clientRadiusMeters: values.radius,
      categoryHint: values.category,
      mapCenterLat: ctxBuilder.mapCenterLat,
      mapCenterLng: ctxBuilder.mapCenterLng,
    });

    if (!gemini.ok) {
      console.log("[DEBUG] Gemini failed:", gemini.error);
      return emptyResultWithDebug(values, debug, {
        plannerSource: "fallback",
        fallbackReason: gemini.error || "gemini_failed",
        geminiPlan: null,
        debugStoppedBeforeGoogle: true,
        extra: { rawGeminiError: gemini.error },
      });
    }

    console.log("[DEBUG] Gemini returned OK, validating plan…");
    const v = validateAndSanitizeSearchPlan(gemini.raw, { userPrompt: values.prompt });
    if (!v.ok) {
      console.log("[DEBUG] Plan validation failed:", v.reason);
      return emptyResultWithDebug(values, debug, {
        plannerSource: "fallback",
        fallbackReason: `plan:${v.reason}`,
        geminiPlan: null,
        debugStoppedBeforeGoogle: true,
        extra: { rawGeminiOutput: gemini.raw },
      });
    }

    let plan = { ...v.plan };
    if (!plan.includedType && values.category && values.category !== "all") {
      const hint = CATEGORY_MERGE[values.category];
      const inc = normalizeIncludedType(hint);
      if (inc) plan.includedType = inc;
    }
    if (plan.radiusMeters == null) {
      plan.radiusMeters = values.radius;
    }

    console.log("[DEBUG] Sanitized Gemini plan created");
    const { summary } = buildSearchTextRequest(plan, ctxBuilder);
    console.log("[DEBUG] Sanitized plan:", JSON.stringify(plan, null, 2));
    console.log("[DEBUG] Forced stop before Google — not calling searchTextNew or legacy");

    const effectiveRadiusMeters =
      plan.radiusMeters != null && Number.isFinite(plan.radiusMeters) ? plan.radiusMeters : values.radius;

    const searchDebug = debug
      ? {
          plannerSource: "gemini",
          fallbackReason: null,
          geminiPlan: plan,
          sanitizedPlan: plan,
          googleRequestSummary: summary,
          effectiveRadiusMeters,
          debugStoppedBeforeGoogle: true,
        }
      : null;

    return {
      placesNormalized: [],
      placesStatus: "OK",
      metaExtra: {},
      effectiveRadiusMeters,
      searchDebug,
    };
  }

  // ---------------------------------------------------------------------------
  // Production path (Places New + legacy fallback)
  // ---------------------------------------------------------------------------
  let metaExtra = {};
  const promptLower = normalize(values.prompt);
  if (values.category === "hotel" && mentionsNightlifeArea(promptLower)) {
    console.log("[DEBUG] Google Places call starting: countBarsNearby (hotel meta)");
    const barInfo = await countBarsNearby(apiKey, values.latitude, values.longitude, values.radius);
    metaExtra = {
      nearbyBarsSampleCount: barInfo.count,
      nearbyBarsNote:
        barInfo.count != null
          ? "Approximate bar venues in range (first API page only; not exhaustive)."
          : null,
    };
  }

  let placesNormalized = [];
  let placesStatus = "OK";
  let plannerSource = "fallback";
  let fallbackReason = null;
  let sanitizedPlan = null;
  let googleRequestSummary = null;
  let debugStoppedBeforeGoogle = false;

  let geminiSucceeded = false;

  const hasGemini = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());

  if (hasGemini) {
    const gemini = await planWithGemini({
      userPrompt: values.prompt,
      userLat: values.latitude,
      userLng: values.longitude,
      clientRadiusMeters: values.radius,
      categoryHint: values.category,
      mapCenterLat: ctxBuilder.mapCenterLat,
      mapCenterLng: ctxBuilder.mapCenterLng,
    });

    if (gemini.ok) {
      const v = validateAndSanitizeSearchPlan(gemini.raw, { userPrompt: values.prompt });
      if (v.ok) {
        const plan = { ...v.plan };
        if (!plan.includedType && values.category && values.category !== "all") {
          const hint = CATEGORY_MERGE[values.category];
          const inc = normalizeIncludedType(hint);
          if (inc) plan.includedType = inc;
        }
        if (plan.radiusMeters == null) {
          plan.radiusMeters = values.radius;
        }

        console.log("[DEBUG] Sanitized Gemini plan created");
        const { body, summary } = buildSearchTextRequest(plan, ctxBuilder);
        googleRequestSummary = summary;
        sanitizedPlan = plan;

        try {
          console.log("[DEBUG] Google Places call starting: searchTextNew (Places API New)");
          const { resultsLegacyLike } = await searchTextNew(apiKey, body);
          placesNormalized = resultsLegacyLike.map((p) =>
            legacyShapeToNormalized(
              newPlaceToLegacyShape(p, values.latitude, values.longitude),
              values.latitude,
              values.longitude
            )
          );
          placesStatus = "OK";
          plannerSource = "gemini";
          geminiSucceeded = true;
        } catch (e) {
          const msg = e && e.message ? e.message : String(e);
          fallbackReason = `places_new:${msg}`;
        }
      } else {
        fallbackReason = `plan:${v.reason}`;
      }
    } else {
      fallbackReason = gemini.error || "gemini_failed";
    }
  } else {
    fallbackReason = "missing_gemini_key";
  }

  if (!geminiSucceeded) {
    console.log("[DEBUG] Google Places call starting: searchPlacesLegacy (text search + optional nearby)");
    const leg = await searchPlacesLegacy(apiKey, values);
    placesNormalized = leg.placesNormalized;
    placesStatus = leg.placesStatus;
    plannerSource = "fallback";
    metaExtra = { ...leg.metaExtra, ...metaExtra };
  }

  const effectiveRadiusMeters =
    sanitizedPlan && sanitizedPlan.radiusMeters != null ? sanitizedPlan.radiusMeters : values.radius;

  const searchDebug = debug
    ? {
        plannerSource,
        fallbackReason: geminiSucceeded ? null : fallbackReason,
        sanitizedPlan: sanitizedPlan || null,
        geminiPlan: sanitizedPlan || null,
        googleRequestSummary: googleRequestSummary || null,
        effectiveRadiusMeters,
        debugStoppedBeforeGoogle,
      }
    : null;

  return {
    placesNormalized,
    placesStatus,
    metaExtra,
    effectiveRadiusMeters,
    searchDebug,
  };
}

module.exports = {
  searchPlaces,
  TEMP_DEBUG_HARD_STOP_AFTER_GEMINI_PLAN,
};
