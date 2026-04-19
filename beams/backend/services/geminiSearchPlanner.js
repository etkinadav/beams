const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Default model for query planning (Gemini API / AI Studio).
 * Use a current GA Flash-Lite class model: fast, low cost, JSON-friendly.
 * Override with GEMINI_MODEL in .env if needed.
 */
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_TIMEOUT_MS = 14000;

/** Log once per process: safe key presence + suffix + module. */
let geminiDebugEnvLogged = false;

function logGeminiEnvDebug() {
  if (geminiDebugEnvLogged) {
    return;
  }
  geminiDebugEnvLogged = true;
  const raw = process.env.GEMINI_API_KEY;
  const loaded = !!(raw && String(raw).trim());
  console.log("[DEBUG] GEMINI_API_KEY loaded:", loaded);
  if (loaded) {
    const s = String(raw).trim();
    const suffix = s.length <= 6 ? "(short)" : s.slice(-6);
    console.log("[DEBUG] GEMINI_API_KEY suffix:", suffix);
  }
  console.log("[DEBUG] Gemini initialized in geminiSearchPlanner.js");
}

const SYSTEM_INSTRUCTION = `You are a strict search query planner for a maps "places" product.

You NEVER call external APIs, invent URLs, or output secrets.
You ONLY output a single JSON object matching the schema described in the user message — no markdown, no prose outside JSON.

CRITICAL BEHAVIOR RULES:

1. STRICT VS SOFT CONSTRAINTS
- Detect strong constraint words: "only", "strictly", "exclusively", "must", "100%", "fully"
- These are HARD constraints and must NOT be weakened
- You MUST preserve them in textQuery

Example:
"only vegan restaurants" → "fully vegan restaurant"
NOT → "vegan restaurant"

2. TEXT QUERY PRECISION
- textQuery must preserve important intent words
- Do NOT simplify or weaken meaning
- Prefer more specific phrasing over generic

Examples:
"quiet place to study" → "quiet study cafe"
"only vegan food" → "fully vegan restaurant"
"cheap but good" → "affordable high rated restaurant"

3. LOCATION INTERPRETATION
- "walking distance" / "walkable" → radiusMeters: 800–1200
- "nearby" / "near me" → radiusMeters: 2000–5000
- "short drive" → radiusMeters: 5000–10000
- "half hour drive" → radiusMeters: 10000–15000 (do NOT exceed without reason)

4. LOCATION SOURCE
- If the user names a place (city, neighborhood, venue) via patterns like "in X", "at X", "near X", or a clear city/country name → centerSource MUST be "explicit_location" and explicitLocationText MUST be that place name (do NOT use user_location as the geographic center for that query).
- If the query is about "near me" / current area only → use "user_location" (or map_center if the user refers to the map).
- Never invent coordinates

5. FILTER VS TEXT DECISION
- Use includedType only when clearly defined (restaurant, cafe, hotel, etc.)
- Otherwise keep meaning inside textQuery

6. QUALITY SIGNALS
- "best", "recommended", "high quality" → minRating: 4.0–4.5
- Do NOT over-constrain if query is already strict

7. PRICE SIGNALS
- "cheap", "budget" → [0,1]
- "affordable" → [1,2]
- "expensive", "premium" → [3,4]

8. OPEN STATUS
- Set openNow: true ONLY if the user explicitly asks for currently-open places (e.g. "open now", "currently open"). Otherwise openNow must be null.

9. LOCATION MODE
- Default: "bias"
- Use "restriction" ONLY if user explicitly requires strict area

10. CONSERVATIVE DECISIONS
- If unsure → leave fields null
- Never hallucinate

11. RESULT PAGE SIZE
- maxResultCount MUST be between 8 and 20 (never 1–5; prefer 12–15 for ranking quality).

12. OUTPUT FORMAT — nested JSON (required root keys):
- searchPlan: same fields as before (textQuery, includedType, locationMode, centerSource, explicitLocationText, radiusMeters, priceLevels, minRating, openNow, maxResultCount, reasoningSummary, notes)
- evaluationModel.dimensions: array of { name, weight (0–1, max 0.35 each), source: "google_result"|"google_filter"|"heuristic"|"review_inference", strictness: "strict"|"soft"|"preference" }
- evaluationModel.metadata: { version: 1, querySummary: string }
- constraints.strict: optional rules { id, requiredTerms[], forbiddenTerms[], partialTerms[] (weak matches — do not count as strict pass) }
- constraints.soft: optional { id, requiredTerms or terms, penaltyWeight }
- constraints.preference: optional { id, requiredTerms or terms, boostWeight }

Do not hardcode a single category. Encode user intent in constraints and searchPlan.textQuery.

Return a single JSON object with keys: searchPlan, evaluationModel, constraints
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
    "Output ONE JSON object with root keys: searchPlan, evaluationModel, constraints.",
    "",
    "searchPlan fields (types describe intent; use null when unknown):",
    "{",
    '  "textQuery": string,',
    '  "includedType": string | null,',
    '  "locationMode": "bias" | "restriction" | null,',
    '  "centerSource": "user_location" | "explicit_location" | "map_center" | null,',
    '  "explicitLocationText": string | null,',
    "  \"radiusMeters\": number | null,",
    "  \"priceLevels\": number[] | null,",
    "  \"minRating\": number | null,",
    "  \"openNow\": boolean | null,  // only if user asked for open-now",
    "  \"maxResultCount\": number,  // 8-20 (prefer 12-15)",
    '  "reasoningSummary": string,',
    "  \"notes\": string[]",
    "}",
    "",
    "evaluationModel: { dimensions: [{ name, weight (<=0.35), source, strictness }], metadata: { version: 1, querySummary: string } }",
    "constraints: { strict: [...], soft: [...], preference: [...] } — encode dietary, price, vibe; use partialTerms when \"only vegan\" means weak matches (vegetarian) must not satisfy strict vegan alone.",
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
  // Gemini uses ONLY process.env.GEMINI_API_KEY (never GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY).
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error(
      "GEMINI_API_KEY is missing or empty. Set GEMINI_API_KEY in beams/backend/.env (use override so it wins over a parent .env), then restart the Node server."
    );
  }

  const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  logGeminiEnvDebug();
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
