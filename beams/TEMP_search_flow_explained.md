# Temporary: End-to-end AI place search flow (as implemented)

This document describes the **actual** search flow in the codebase at the time of writing. Safe to delete when no longer needed.

---

## 1. Frontend entry point

| Item | Detail |
|------|--------|
| **Page / component** | `AiPlaceDiscoveryComponent` — `beams/src/app/other-pages/ai-place-discovery/ai-place-discovery.component.ts` |
| **Template** | `ai-place-discovery.component.html` — text input + **Search** button |
| **User actions** | **Search** `(click)="search()"` or **Enter** `(keydown.enter)="search()"` |
| **First method** | `search()` on the component |

### Data collected from the UI

Inside `search()`:

1. **`searchError`** is cleared.
2. **Location guard**: if `userLat` or `userLng` is `null`, search stops with *Use “Use my location” first.*
3. **Prompt**: `this.prompt.trim()` — if empty, *Enter a search prompt.*
4. **Session**: trimmed prompt saved under `sessionStorage` key `ai-place-discovery-prompt`.
5. **UI state**: `searchLoading = true`, `places` cleared, selection/popup cleared.

**Map center is not sent** from the Angular component today: only `prompt`, `latitude`, `longitude`, `radius`, and `category` are passed to `AiPlaceSearchService.search`. The backend still accepts optional `mapCenterLat`, `mapCenterLng`, and `debug` in the JSON body.

### Constants

- `SEARCH_RADIUS = 1500` (meters)
- `SEARCH_CATEGORY = "all"`

---

## 2. Frontend request payload

### Service

- **File**: `beams/src/app/services/ai-place-search.service.ts`
- **HTTP**: `POST` → `` `${environment.apiUrl}/ai-place-search` `` (typically **`POST /api/ai-place-search`** behind the dev proxy)

### `AiPlaceSearchRequest` (current UI)

| Field | Current UI value |
|-------|------------------|
| `prompt` | Trimmed text |
| `latitude` / `longitude` | Geolocation |
| `radius` | `1500` |
| `category` | `"all"` |

---

## 3. Backend entry point

### Route

- **Routes file**: `beams/backend/routes/aiPlaceSearch.js`
- **App mount**: `beams/backend/app.js` — `app.use("/api/ai-place-search", …)`
- **Handler**: `POST /` → `aiPlaceSearchController.search`

### Controller

- **File**: `beams/backend/controllers/aiPlaceSearch.js`

### Incoming body

`pickSearchBody` reads: `prompt`, `latitude`, `longitude`, `radius`, `category`, optional `mapCenterLat`, `mapCenterLng`, `debug`.

### Validation

- **prompt**: required, max **2000** characters  
- **lat/lng**, **radius** (100–50000, default 1500), **category** (`cafe` | `restaurant` | `hotel` | `bar` | `all`)  
- **map center**: optional  
- **debug**: `true` if `body.debug === true` or `"true"`

### API key

`GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY` — missing → `500`.

### Debug flag (important)

Validation still computes `values.debug`, but the controller currently forces:

```js
const debug = true;
```

so **`meta.searchDebug`** and **`meta.debugFlow`** are always attached in this build. For production, restore a conditional (e.g. `values.debug === true` or `process.env.AI_PLACE_SEARCH_DEBUG === 'true'`) as noted in the controller comment.

### Orchestration call

After validation:

```js
await placeSearchOrchestrator.searchPlaces(apiKey, values, { debug });
```

Then the controller runs **post-processing** (not in the orchestrator): intent analysis, distance filter, optional strict-vegan filter, `scorePlace`, sort, **evaluator**, and builds **`meta.debugFlow`**.

---

## 4. Gemini step

**Runs when** `GEMINI_API_KEY` is set and non-empty in the backend environment.

### Files

- **Orchestrator**: `beams/backend/services/placeSearchOrchestrator.js` — `searchPlaces`
- **Planner**: `beams/backend/services/geminiSearchPlanner.js` — `planWithGemini(ctx)`

### SDK and model

- **Package**: `@google/generative-ai` (see `beams/backend/package.json`, e.g. **^0.24.1**)
- **Client**: `GoogleGenerativeAI` → `getGenerativeModel({ model, systemInstruction, generationConfig })` → **`model.generateContent(userText)`** (string user turn)
- **Default model**: **`gemini-2.5-flash-lite`** (`DEFAULT_MODEL` in `geminiSearchPlanner.js`)
- **Override**: env **`GEMINI_MODEL`**
- **Timeout**: ~14s race (`GEMINI_TIMEOUT_MS`)

### System instruction & user payload

- **`SYSTEM_INSTRUCTION`**: long fixed prompt in `geminiSearchPlanner.js` (query planner rules, JSON-only output; includes strict-constraint behavior such as preserving “only vegan” style intent in `textQuery`).
- **`buildUserPayload(ctx)`**: single text block with schema hints + `User prompt`, device location, radius hint, category, optional map center line.

### Generation config

`temperature: 0.25`, `maxOutputTokens: 1536`, **`responseMimeType: "application/json"`**.

### Output handling

`result.response.text()` → `JSON.parse(extractJsonObject(text))`.

### Plan validation

- **File**: `beams/backend/services/searchPlanValidator.js` — `validateAndSanitizeSearchPlan`
- **Types whitelist**: `beams/backend/config/allowedPlaceTypes.js`

### After validation (orchestrator)

- Category merge for `includedType` when `category !== "all"`.
- If `plan.radiusMeters == null` → set to client `values.radius`.
- **`buildSearchTextRequest`** → **Places API (New)** `searchTextNew` — on success, `geminiSucceeded = true`.
- If anything fails → **legacy** `searchPlacesLegacy` (see §5).

### Flow note

There is **no** “hard stop after Gemini only” path anymore: after a valid plan, **Google Places (New) is always called** when the New API call succeeds.

---

## 5. Google Places step

### 5.1 Primary: Places API (New) — Text Search

- **File**: `beams/backend/services/placesNewTextSearch.js`
- **URL**: `POST https://places.googleapis.com/v1/places:searchText`
- **Request body**: `beams/backend/services/placesRequestBuilder.js` — `buildSearchTextRequest(plan, ctx)`

### 5.2 Fallback: legacy Text Search (+ optional Nearby)

- **File**: `beams/backend/services/googlePlacesSearch.js` — `searchPlacesLegacy`
- Used when Gemini is missing, plan invalid, or New API throws.

Behavior matches the earlier design: legacy uses **raw client `prompt`** for text search; optional nearby when category ≠ `all` and few results, etc.

### Hotel meta

`countBarsNearby` in the orchestrator when category is `hotel` and prompt matches nightlife heuristic (`mentionsNightlifeArea`).

---

## 6. Post-processing (controller, after orchestrator)

**File**: `beams/backend/controllers/aiPlaceSearch.js`

Order:

1. **`analyzePromptIntent(values.prompt)`** — `beams/backend/helpers/placePromptScoring.js`  
   - e.g. `isStrictQuery`, `isStrictVeganQuery`, `mentionsVeganIntent` (strict markers include **`must`** among others).

2. **Plan radius**: `planRadiusMeters = effectiveRadiusMeters` (from orchestrator: Gemini plan `radiusMeters` when present, else client radius).

3. **Candidates** = normalized places with valid lat/lng.

4. **Distance filter**: drop places with distance **> `planRadiusMeters * 1.5`** (distance from `distanceMeters` or haversine).

5. **Strict vegan filter**: if `isStrictVeganQuery`, keep only places passing **`placeMatchesStrictVeganIntent`**.

6. **`scorePlace(ctx, place)`** with extended `ctx` (`isStrictQuery`, `isStrictVeganQuery`, `mentionsVeganIntent`, `radiusMeters`, …). Sort by **`relevanceScore`** descending.

7. **Evaluator** (when `debug`): **`evaluateResults`** in `beams/backend/services/searchResultsEvaluator.js` — produces `overallQuality`, `confidence`, `strictViolations`, `summary`, **`perResult`**.

8. **`meta.debugFlow`** (when `debug`): `userPrompt`, `geminiPlan`, `googleResultsRawCount`, `finalResultsCount`, `evaluator`, `perResultEvaluation`.

---

## 7. Response handling (backend)

### HTTP body

Still **`{ meta, places }`** — unchanged shape.

### `places`

Scored rows: `relevanceScore`, `matchReasons`, `warnings`, etc.; `photoUrl` remains **`null`** in the controller.

### `meta`

- Base fields: `prompt`, `location`, `radius`, `category`, `totalResults`, `placesApiStatus`, optional hotel bar fields from `metaExtra`.

When **`debug`** is true:

- **`meta.searchDebug`**: `plannerSource`, `fallbackReason`, `sanitizedPlan`, **`geminiPlan`** (same as sanitized plan in current orchestrator), `googleRequestSummary`, `effectiveRadiusMeters`, `debugStoppedBeforeGoogle` (currently **`false`**).
- **`meta.debugFlow`**: full pipeline snapshot for inspection (see §6).

---

## 8. Frontend response handling

### `search()` subscription

1. **`this.places = res.places || []`** — map data updates **before** opening any dialog (so the map is not blocked).
2. **`console.log("DEBUG FLOW:", res?.meta?.debugFlow)`** (and other debug logs as in the component).
3. If **`res.meta.debugFlow`** is present → **`MatDialog.open(SearchDebugFlowDialogComponent, { data: { debugFlow } })`**  
   - **File**: `beams/src/app/dialog/search-debug-flow-dialog/` — sections for prompt, Gemini plan, counts, evaluator summary, per-result evaluation; **“Copy Full Debug”** copies `JSON.stringify(debugFlow, null, 2)`.
4. `setTimeout` → **`refreshMarkers()`**, **`fitMapToResults()`**.

### Legacy inline debug

`debugSearchDebugInline` may still stringify `searchDebug` for a `<pre>` on the page when used in the template.

### Types

`beams/src/app/models/ai-place-search.model.ts` includes optional **`meta.searchDebug`** and **`meta.debugFlow`** (`AiPlaceSearchDebugFlowMeta`).

---

## 9. Full flow summary (lifecycle)

```text
User → Search
  → POST /api/ai-place-search
    → placeSearchOrchestrator.searchPlaces()
        → [GEMINI_API_KEY?] planWithGemini → validate plan → buildSearchTextRequest
            → Places API (New) searchText
        → else / on failure → searchPlacesLegacy (text + optional nearby)
        → optional countBarsNearby (hotel meta)
    → Controller post-process:
        → filter distance (≤ 1.5 × plan radius)
        → strict vegan filter if needed
        → scorePlace + sort
        → [debug] evaluateResults → meta.debugFlow
    → JSON { meta, places }
  → Angular: places → markers + fitBounds
  → [debug] SearchDebugFlowDialog (non-blocking)
```

---

## Sample `meta` snippets (debug)

### `searchDebug` (illustrative)

```json
{
  "plannerSource": "gemini",
  "fallbackReason": null,
  "geminiPlan": { "textQuery": "…", "radiusMeters": 1200 },
  "googleRequestSummary": { },
  "effectiveRadiusMeters": 1200,
  "debugStoppedBeforeGoogle": false
}
```

### `debugFlow` (illustrative)

```json
{
  "userPrompt": "only vegan cafe",
  "geminiPlan": { },
  "googleResultsRawCount": 15,
  "finalResultsCount": 8,
  "evaluator": {
    "overallQuality": "medium",
    "confidence": 0.72,
    "strictViolations": 0,
    "summary": "8 result(s): …"
  },
  "perResultEvaluation": [
    { "placeId": "…", "isMatch": true, "score": 75, "reasons": ["…"] }
  ]
}
```

---

## Notes / consistency

| Topic | Observation |
|-------|-------------|
| **Dual Google stacks** | Places API (New) on success path; legacy fallback for resilience. |
| **Radius** | UI sends 1500; orchestrator may expose Gemini `radiusMeters` as `effectiveRadiusMeters`; controller filters and scores using that effective radius. |
| **Debug** | Forced `debug = true` in controller — tighten before production. |
| **Evaluator** | Quality summary only; does not change which places are returned (filtering is done in controller + scoring). |

---

## Reasonable next improvements (documentation only)

- Restore **conditional `debug`** (body / env) to avoid always sending `searchDebug` / `debugFlow`.
- Send **map center** from the client when the user pans the map.
- Optional user-visible explanation from Gemini **`reasoningSummary`** outside debug mode.

---

*End of `TEMP_search_flow_explained.md`.*
