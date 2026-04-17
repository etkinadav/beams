const placeSearchOrchestrator = require("../services/placeSearchOrchestrator");
const { scorePlace } = require("../helpers/placePromptScoring");

const ALLOWED_CATEGORIES = ["cafe", "restaurant", "hotel", "bar", "all"];

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

  const debug =
    values.debug === true ||
    String(process.env.AI_PLACE_SEARCH_DEBUG || "").toLowerCase() === "true";

  try {
    const { placesNormalized, metaExtra, placesStatus, effectiveRadiusMeters, searchDebug } =
      await placeSearchOrchestrator.searchPlaces(apiKey, values, { debug });

    const ctx = {
      prompt: values.prompt,
      category: values.category,
      userLat: values.latitude,
      userLng: values.longitude,
      radiusMeters: effectiveRadiusMeters,
    };

    const places = placesNormalized
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => {
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
