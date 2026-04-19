const { planWithGemini } = require("./geminiSearchPlanner");
const { validateSearchContext, buildFallbackSearchContext } = require("./searchContextValidator");
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

  let metaExtra = {};
  const promptLower = normalize(values.prompt);
  if (values.category === "hotel" && mentionsNightlifeArea(promptLower)) {
    console.log("[DEBUG] countBarsNearby (hotel meta)");
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
  /** @type {object | null} */
  let searchContext = null;

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
      const v = validateSearchContext(gemini.raw, { userPrompt: values.prompt });
      if (v.ok) {
        searchContext = v.searchContext;
        const plan = { ...searchContext.searchPlan };
        if (!plan.includedType && values.category && values.category !== "all") {
          const hint = CATEGORY_MERGE[values.category];
          const inc = normalizeIncludedType(hint);
          if (inc) plan.includedType = inc;
        }
        if (plan.radiusMeters == null) {
          plan.radiusMeters = values.radius;
        }

        console.log("[DEBUG] Gemini plan created");
        const { body, summary } = buildSearchTextRequest(plan, ctxBuilder);
        googleRequestSummary = summary;
        sanitizedPlan = plan;

        try {
          console.log("[DEBUG] Sending request to Google Places");
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
    console.log("[DEBUG] Sending request to Google Places");
    const leg = await searchPlacesLegacy(apiKey, values);
    placesNormalized = leg.placesNormalized;
    placesStatus = leg.placesStatus;
    plannerSource = "fallback";
    metaExtra = { ...leg.metaExtra, ...metaExtra };
  }

  const effectiveRadiusMeters =
    sanitizedPlan && sanitizedPlan.radiusMeters != null ? sanitizedPlan.radiusMeters : values.radius;

  if (!searchContext) {
    searchContext = buildFallbackSearchContext(values);
  }
  if (!sanitizedPlan && searchContext && searchContext.searchPlan) {
    sanitizedPlan = searchContext.searchPlan;
  }

  const searchDebug = debug
    ? {
        plannerSource,
        fallbackReason: geminiSucceeded ? null : fallbackReason,
        sanitizedPlan: sanitizedPlan || null,
        geminiPlan: sanitizedPlan || null,
        searchContext: searchContext || null,
        googleRequestSummary: googleRequestSummary || null,
        effectiveRadiusMeters,
        debugStoppedBeforeGoogle: false,
      }
    : null;

  return {
    placesNormalized,
    placesStatus,
    metaExtra,
    effectiveRadiusMeters,
    searchDebug,
    searchContext,
  };
}

module.exports = {
  searchPlaces,
};
