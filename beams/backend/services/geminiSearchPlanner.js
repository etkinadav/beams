const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Default model for query planning (Gemini API / AI Studio).
 * Use a current GA Flash-Lite class model: fast, low cost, JSON-friendly.
 * Override with GEMINI_MODEL in .env if needed.
 */
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = 14000;

const SYSTEM_INSTRUCTION = `You are a strict search query planner for a maps "places" product.
You NEVER call external APIs, invent URLs, or output secrets.
You ONLY output a single JSON object matching the schema described in the user message — no markdown, no prose outside JSON.

Rules for interpreting natural language (apply when reasonable; if unsure, leave fields null rather than guessing):
- "walking distance" / "walkable" → radiusMeters often 800–1200, locationMode "bias", centerSource "user_location".
- "nearby" / "near me" / "around here" / "in this area" → radiusMeters often 2000–5000, prefer locationBias.
- "driving" / "short drive" → radiusMeters often ≥ 10000, still usually bias unless user insists on strict bounds.
- If the user names a different city/area/country than the device location (e.g. "in Bangkok", "Makati not near me", "London"), set centerSource to "explicit_location", put the geographic nuance into textQuery (and explicitLocationText if helpful). Do NOT assume coordinates.
- "open now" / "currently open" → openNow true.
- "cheap" / "budget" / "affordable" → priceLevels like [0,1] or [1].
- "luxury" / "premium" / "high-end" / "fine dining" → priceLevels like [3,4] or [4].
- "great" / "high quality" / "recommended" / "best" → consider minRating 4.0–4.5 when not over-constraining.
- If place type is unclear or the query is broad, set includedType null and keep nuance in textQuery.
- Prefer locationMode "bias" by default; use "restriction" only when the user clearly wants results strictly inside an area (e.g. "only within", "must be inside").
- textQuery must stay human-readable and preserve nuanced wording when it helps semantic matching.
- maxResultCount: integer 1–20 (typical 12–20).
- reasoningSummary: one short sentence explaining your choices.
- notes: optional short strings for caveats.

Return JSON keys exactly:
textQuery, includedType, locationMode, centerSource, explicitLocationText, radiusMeters, priceLevels, minRating, openNow, maxResultCount, reasoningSummary, notes
`;

/**
 * @typedef {object} RawSearchPlan
 * @property {string} [textQuery]
 * @property {string | null} [includedType]
 * @property {"bias" | "restriction" | null} [locationMode]
 * @property {"user_location" | "explicit_location" | "map_center" | null} [centerSource]
 * @property {string | null} [explicitLocationText]
 * @property {number | null} [radiusMeters]
 * @property {number[] | null} [priceLevels]
 * @property {number | null} [minRating]
 * @property {boolean | null} [openNow]
 * @property {number} [maxResultCount]
 * @property {string} [reasoningSummary]
 * @property {string[]} [notes]
 */

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (m) return m[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function buildUserPayload(ctx) {
  const lines = [
    "Schema (types describe intent; use null when unknown):",
    "{",
    '  "textQuery": string,',
    '  "includedType": string | null,',
    '  "locationMode": "bias" | "restriction" | null,',
    '  "centerSource": "user_location" | "explicit_location" | "map_center" | null,',
    '  "explicitLocationText": string | null,',
    "  \"radiusMeters\": number | null,",
    "  \"priceLevels\": number[] | null,   // each 0-4: 0 free ... 4 very expensive",
    "  \"minRating\": number | null,      // 0-5 step 0.5",
    "  \"openNow\": boolean | null,",
    "  \"maxResultCount\": number,        // 1-20",
    '  "reasoningSummary": string,',
    "  \"notes\": string[]",
    "}",
    "",
    `User prompt: ${ctx.userPrompt}`,
    `User device location (lat,lng): ${ctx.userLat},${ctx.userLng}`,
    `Client default search radius (meters, hint): ${ctx.clientRadiusMeters}`,
    `Frontend category hint (may be "all"): ${ctx.categoryHint}`,
  ];
  if (ctx.mapCenterLat != null && ctx.mapCenterLng != null) {
    lines.push(`Map center (lat,lng) if user refers to map: ${ctx.mapCenterLat},${ctx.mapCenterLng}`);
  }
  lines.push("", "Output JSON only.");
  return lines.join("\n");
}

/**
 * @param {object} ctx
 * @param {string} ctx.userPrompt
 * @param {number} ctx.userLat
 * @param {number} ctx.userLng
 * @param {number} ctx.clientRadiusMeters
 * @param {string} ctx.categoryHint
 * @param {number | null} [ctx.mapCenterLat]
 * @param {number | null} [ctx.mapCenterLng]
 * @returns {Promise<{ ok: true, raw: RawSearchPlan } | { ok: false, error: string }>}
 */
async function planWithGemini(ctx) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return { ok: false, error: "missing_gemini_key" };
  }

  const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  console.log("[DEBUG] Using Gemini model:", modelName);

  const genAI = new GoogleGenerativeAI(String(apiKey).trim());
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 1536,
      responseMimeType: "application/json",
    },
  });

  const userText = buildUserPayload(ctx);

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("gemini_timeout")), GEMINI_TIMEOUT_MS)
  );

  console.log("[DEBUG] Calling Gemini planner...");
  let result;
  try {
    result = await Promise.race([model.generateContent(userText), timeout]);
    console.log("[DEBUG] Gemini planner response received");
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { ok: false, error: msg.includes("timeout") ? "gemini_timeout" : `gemini_error:${msg}` };
  }

  let text;
  try {
    text = result.response.text();
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    return { ok: false, error: `gemini_error:${msg}` };
  }

  let raw;
  try {
    raw = JSON.parse(extractJsonObject(text));
  } catch (e) {
    return { ok: false, error: "gemini_invalid_json" };
  }

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "gemini_empty_plan" };
  }

  return { ok: true, raw };
}

module.exports = {
  planWithGemini,
  buildUserPayload,
  SYSTEM_INSTRUCTION,
  DEFAULT_MODEL,
};
