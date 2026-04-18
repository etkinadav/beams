# Temporary: End-to-end AI place search flow (as implemented)

This document describes the **actual** search flow in the codebase at the time of writing. Safe to delete when no longer needed.

---

## 1. Frontend entry point

| Item | Detail |
|------|--------|
| **Page / component** | `AiPlaceDiscoveryComponent` — `beams/src/app/other-pages/ai-place-discovery/ai-place-discovery.component.ts` |
| **Template** | `ai-place-discovery.component.html` — text input + **Search** button |
| **User actions** | **Search** button `(click)="search()"` or **Enter** in the input `(keydown.enter)="search()"` |
| **First method** | `search()` on the component |

### Data collected from the UI

Inside `search()`:

1. **`searchError`** is cleared.
2. **Location guard**: if `userLat` or `userLng` is `null`, search stops with the message *Use “Use my location” first.* (location comes from `useMyLocation()`, not from this request).
3. **Prompt**: `this.prompt.trim()` — if empty, error *Enter a search prompt.*
4. **Session**: trimmed prompt saved under `sessionStorage` key `ai-place-discovery-prompt`.
5. **UI state**: `searchLoading = true`, `places` cleared, selection/popup cleared.

**Map center is not sent today** from the Angular component: only `prompt`, `latitude`, `longitude`, `radius`, and `category` are passed to the service (see §2). The backend *accepts* optional `mapCenterLat`, `mapCenterLng`, and `debug` (see §3), but the current UI does not populate them.

### Constants used in the request

From the top of the same file:

- `SEARCH_RADIUS = 1500` (meters)
- `SEARCH_CATEGORY: AiPlaceCategory = "all"`

```366:392:beams/src/app/other-pages/ai-place-discovery/ai-place-discovery.component.ts
  search(): void {
    this.searchError = null;
    if (this.userLat == null || this.userLng == null) {
      this.searchError = "Use “Use my location” first.";
      return;
    }
    const trimmed = this.prompt.trim();
    if (!trimmed) {
      this.searchError = "Enter a search prompt.";
      return;
    }

    sessionStorage.setItem(SESSION_PROMPT_KEY, trimmed);
    this.searchLoading = true;
    this.places = [];
    this.selectedPlaceId = null;
    this.activePopup?.remove();
    this.activePopup = null;

    this.aiPlaceSearch
      .search({
        prompt: trimmed,
        latitude: this.userLat,
        longitude: this.userLng,
        radius: SEARCH_RADIUS,
        category: SEARCH_CATEGORY,
      })
```

---

## 2. Frontend request payload

### Service

- **File**: `beams/src/app/services/ai-place-search.service.ts`
- **Method**: `search(body: AiPlaceSearchRequest)`
- **HTTP**: `POST` to `` `${environment.apiUrl}/ai-place-search` ``

With default `environment.apiUrl === '/api'`, the path is **`POST /api/ai-place-search`** (relative to the app origin; dev proxy forwards to Express).

```7:15:beams/src/app/services/ai-place-search.service.ts
@Injectable({ providedIn: "root" })
export class AiPlaceSearchService {
  private readonly url = `${environment.apiUrl}/ai-place-search`;

  constructor(private http: HttpClient) {}

  search(body: AiPlaceSearchRequest): Observable<AiPlaceSearchResponse> {
    return this.http.post<AiPlaceSearchResponse>(this.url, body);
  }
}
```

### TypeScript shape (`AiPlaceSearchRequest`)

From `beams/src/app/models/ai-place-search.model.ts`:

| Field | Type | Current UI value |
|-------|------|-------------------|
| `prompt` | `string` | Trimmed free text |
| `latitude` | `number` | Geolocation lat |
| `longitude` | `number` | Geolocation lng |
| `radius` | `number` | `1500` |
| `category` | `AiPlaceCategory` | `"all"` |

The **raw user prompt** is sent as `prompt`, together with fixed radius/category — not “only prompt”; location is always the device location used for the map pin.

### Example JSON body (typical from current UI)

```json
{
  "prompt": "quiet cafe open now",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "radius": 1500,
  "category": "all"
}
```

---

## 3. Backend entry point

### Route

- **File**: `beams/backend/routes/aiPlaceSearch.js`
- **Mount**: `beams/backend/app.js` — `app.use("/api/ai-place-search", aiPlaceSearchRoutes);`
- **Route definition**: `router.post("/", aiPlaceSearchController.search);`

So the full path is **`POST /api/ai-place-search`**.

### Controller

- **File**: `beams/backend/controllers/aiPlaceSearch.js`
- **Handler**: `exports.search`

### Incoming body (`pickSearchBody`)

Fields read from `req.body`:

- `prompt`, `latitude`, `longitude`, `radius`, `category`
- **Optional** (not sent by current Angular): `mapCenterLat`, `mapCenterLng`, `debug`

### Validation (`validate`)

- **prompt**: required, trimmed, max **2000** characters  
- **latitude / longitude**: finite, in valid ranges  
- **radius**: default **1500** if missing; must be **100–50000**  
- **category**: lowercase; must be one of `cafe`, `restaurant`, `hotel`, `bar`, `all`  
- **mapCenterLat / mapCenterLng**: optional; if present and valid, stored on `values`  
- **debug**: `true` if `body.debug === true` or `body.debug === "true"`

### API key

Google key from **`process.env.GOOGLE_MAPS_API_KEY`** or **`process.env.GOOGLE_PLACES_API_KEY`**. Missing → `500` with JSON error (no search).

### Orchestration

After validation, the controller calls:

```102:103:beams/backend/controllers/aiPlaceSearch.js
    const { placesNormalized, metaExtra, placesStatus, effectiveRadiusMeters, searchDebug } =
      await placeSearchOrchestrator.searchPlaces(apiKey, values, { debug });
```

**Debug flag**: `debug` is `true` if `values.debug === true` **or** `process.env.AI_PLACE_SEARCH_DEBUG === "true"` (case-insensitive).

---

## 4. Gemini step

**Yes — Gemini is wired into the live runtime flow** when `GEMINI_API_KEY` is set and non-empty in the backend environment.

### Where it runs

- **File**: `beams/backend/services/placeSearchOrchestrator.js` — function `searchPlaces`
- **Gemini module**: `beams/backend/services/geminiSearchPlanner.js` — `planWithGemini(ctx)`

### Gate

```54:55:beams/backend/services/placeSearchOrchestrator.js
  const hasGemini = !!(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());
```

If **no** key: the orchestrator skips Gemini and sets `fallbackReason` to `missing_gemini_key`, then runs the legacy Google path (§5.2).

### What is sent to Gemini

The app uses **`@google/generative-ai`** (`GoogleGenerativeAI`).

- **Model**: `process.env.GEMINI_MODEL` or default **`gemini-2.0-flash`**
- **System instruction**: constant `SYSTEM_INSTRUCTION` in `geminiSearchPlanner.js` (query planner rules: walking distance, nearby, explicit city, open now, price levels, `includedType` vs free text, JSON-only output).
- **User “payload”**: a **single user message** built by `buildUserPayload(ctx)` — plain text, not a separate REST body. It includes:
  - JSON schema description (expected keys)
  - `User prompt: …`
  - `User device location (lat,lng): …`
  - `Client default search radius (meters, hint): …`
  - `Frontend category hint: …`
  - Optional line for map center **only if** both `mapCenterLat` and `mapCenterLng` are non-null in context

**Generation config** (from code): `temperature: 0.25`, `maxOutputTokens: 1536`, **`responseMimeType: "application/json"`**.

### Response from Gemini

- SDK: `result.response.text()` → string parsed with `JSON.parse(extractJsonObject(text))`.
- `extractJsonObject` strips optional ```json fences``` or extracts the outermost `{…}`.

### Expected JSON shape (logical schema)

Keys (as enforced in instructions / validator):

| Key | Role |
|-----|------|
| `textQuery` | Main Places text query |
| `includedType` | Single Place type or null |
| `locationMode` | `"bias"` \| `"restriction"` \| `null` |
| `centerSource` | `"user_location"` \| `"explicit_location"` \| `"map_center"` \| `null` |
| `explicitLocationText` | Optional string |
| `radiusMeters` | number \| null |
| `priceLevels` | array of 0–4 \| null |
| `minRating` | number \| null |
| `openNow` | boolean \| null |
| `maxResultCount` | number (mapped internally to **pageSize** 1–20) |
| `reasoningSummary` | string |
| `notes` | string[] |

### Validation / sanitization of Gemini output

- **File**: `beams/backend/services/searchPlanValidator.js` — `validateAndSanitizeSearchPlan(raw, { userPrompt })`
- **Included types**: whitelist via `beams/backend/config/allowedPlaceTypes.js` — `normalizeIncludedType()`; unknown types → `null`.
- **Clamps**: `radiusMeters` clamped **100–50000** (`searchPlanValidator.js`, `RADIUS_MIN` / `RADIUS_MAX`).

- **priceLevels**: only integers 0–4, deduped, max 5 entries  
- **minRating**: 0–5, snapped to 0.5 steps  
- **textQuery**: if empty after trim, falls back to **original** `userPrompt`; max length **500** chars (truncated)  
- **pageSize**: from `maxResultCount`, clamped **1–20**

If validation fails (`ok: false`, `reason`), the orchestrator does **not** call Places (New) with that plan; it falls through to legacy.

### Post-validation merge (orchestrator)

- If `category !== "all"` but plan has no `includedType`, server merges: cafe→`cafe`, restaurant→`restaurant`, hotel→**`lodging`**, bar→`bar` (after `normalizeIncludedType`).
- If `plan.radiusMeters == null`, it is set to **`values.radius`** (client radius, typically 1500).

---

## 5. Google Places / Google Maps step

There are **two** possible paths.

### 5.1 Primary path (when Gemini succeeded end-to-end)

**API**: **Places API (New)** — **Text Search (New)**  
**File**: `beams/backend/services/placesNewTextSearch.js`

| Item | Value |
|------|--------|
| **URL** | `POST https://places.googleapis.com/v1/places:searchText` |
| **Method** | `POST` |
| **Auth** | Header `X-Goog-Api-Key: <same server Google key>` |
| **Field mask** | Header `X-Goog-FieldMask` = comma-separated list of `places.*` fields (see `SEARCH_TEXT_FIELD_MASK` in the same file) |

**JSON body** is built in `beams/backend/services/placesRequestBuilder.js` — `buildSearchTextRequest(plan, ctx)`:

| Field | Source |
|-------|--------|
| `textQuery` | From **sanitized Gemini** `plan.textQuery` (not the raw user string unless Gemini echoed it / validator fell back) |
| `pageSize` | From plan (`maxResultCount` → clamped `pageSize`) |
| `includedType` | Optional; `strictTypeFiltering: false` when set |
| `openNow` | If plan says `true` |
| `minRating` | If set |
| `priceLevels` | API enums `PRICE_LEVEL_*` mapped from numeric 0–4 |
| `locationBias` | Optional **circle**: `center.latitude/longitude`, `radius` (meters), when mode is `bias` and a geo center exists |
| `locationRestriction` | Optional **rectangle** (bounding box from center+radius), when mode is `restriction` |

**Geo center** (`resolveGeoCenter` in the same file):

- `explicit_location` → **no** circle/rectangle (rely on text in `textQuery`)
- `map_center` → map center if both coordinates valid on context; else falls through
- Otherwise → **user** lat/lng

**User prompt vs Google**: the string Google receives as **`textQuery`** is the **planned** query from Gemini (validated/truncated), which usually **incorporates** the user intent but is **not** guaranteed to be byte-identical to the raw `prompt` field from the client.

### 5.2 Fallback path

Runs when **any** of the following holds:

- No `GEMINI_API_KEY`
- Gemini error / timeout / invalid JSON / empty plan object
- Plan validation fails (`plan:…` reason)
- **Places (New)** `searchTextNew` throws (HTTP error, API error object, etc.)

**File**: `beams/backend/services/googlePlacesSearch.js` — `searchPlacesLegacy(apiKey, body)`

| Step | API | Method | URL |
|------|-----|--------|-----|
| Primary | **Legacy** Place Text Search | **GET** | `https://maps.googleapis.com/maps/api/place/textsearch/json` |
| Optional merge | **Legacy** Nearby Search | **GET** | `https://maps.googleapis.com/maps/api/place/nearbysearch/json` |

**Legacy Text Search query params** (from `runLegacyTextSearch`):

- `query` ← **original** `prompt` from the client (trimmed string) — **direct user text**
- `location` ← `"lat,lng"` from client `latitude` / `longitude`
- `radius` ← client radius, clamped 1–50000
- `key` ← API key
- `type` ← only if `category` maps to a legacy type (`cafe`, `restaurant`, `lodging` for hotel, `bar`); for **`all`**, `type` is **omitted**

**Nearby fallback** (only if the primary legacy text search returned **fewer than 6** results **and** `category !== "all"`):

- `location`, `radius`, `type`, `key`
- `keyword` ← first up to **6** words from prompt with length **&gt; 2** (joined by spaces), if any

With the **current** UI (`category: "all"`), **Nearby fallback never runs** because of that condition.

**Additional legacy call** (orchestrator, not part of main search result list): `countBarsNearby` — same Nearby endpoint, `type: bar`, for **meta** when category is `hotel` and prompt matches nightlife heuristic (`mentionsNightlifeArea` in `placePromptScoring.js`).

---

## 6. Response handling (backend)

### After Google (either path)

Normalized items are **objects** with at least: `id`, `name`, `lat`, `lng`, `address`, `rating`, `userRatingsTotal`, `priceLevel`, `openNow`, `types`, `photoReference`, `googleMapsUrl`, `distanceMeters`, etc.

- **New path**: `placesNewTextSearch.js` — each Places (New) `place` → `newPlaceToLegacyShape` → `legacyShapeToNormalized` (maps new field names to this common shape).
- **Legacy path**: `normalizePlaceResult` in `googlePlacesSearch.js` (legacy Geometry/lat/lng).

### Scoring / reranking

- **File**: `beams/backend/helpers/placePromptScoring.js` — `scorePlace(ctx, p)`  
- **Called from**: `aiPlaceSearch.js` for each normalized place  
- **`ctx`**: `prompt` = **original** user prompt from request; `category`, `userLat`, `userLng`, **`radiusMeters` = `effectiveRadiusMeters`** from orchestrator (Gemini plan radius when available, else client `radius`).

Places are sorted by **`relevanceScore`** descending.

### HTTP response to frontend

```155:158:beams/backend/controllers/aiPlaceSearch.js
    return res.json({
      meta,
      places,
    });
```

- **`places`**: array of scored rows (`id`, `name`, `lat`, `lng`, …, `relevanceScore`, `matchReasons`, `warnings`, optional `smokingInfo`). **`photoUrl`** is always set to **`null`** in the controller.
- **`meta`**: includes `prompt`, `location`, `radius`, `category`, `totalResults`, `placesApiStatus`, optional hotel bar meta, and **`meta.searchDebug`** only when debug is on — see below.

### `searchDebug` (optional)

When `debug` is true, `meta.searchDebug` contains roughly:

- `plannerSource`: `"gemini"` or `"fallback"`
- `fallbackReason`: string when not using successful Gemini+New path (e.g. `missing_gemini_key`, `gemini_timeout`, `plan:…`, `places_new:…`)
- `sanitizedPlan`: the validated plan object (or `null`)
- `googleRequestSummary`: summary object from `buildSearchTextRequest` (bias/restriction, flags) — **not** the raw API key
- `effectiveRadiusMeters`

The **Gemini plan is not** exposed to the frontend unless debug is enabled (body or env).

---

## 7. Frontend response handling

### Subscription

Same `search()` method — `subscribe` on `AiPlaceSearchService.search(...)`:

```393:401:beams/src/app/other-pages/ai-place-discovery/ai-place-discovery.component.ts
      .subscribe({
        next: (res) => {
          this.searchLoading = false;
          this.places = res.places || [];
          setTimeout(() => {
            this.refreshMarkers();
            this.fitMapToResults();
          }, 50);
          this.cdr.markForCheck();
        },
```

### Rendering

- **Map**: `refreshMarkers()` adds markers per `places`; user marker remains from geolocation.
- **Bounds**: `fitMapToResults()` fits map to user + all result coordinates (or flies to user if no places).
- **List/cards**: The current template is minimal (input + Search + errors + progress); **there is no separate card list** in `ai-place-discovery.component.html` — results are primarily **map markers + popups** (popup logic exists in the component for marker clicks).

### `meta` usage

The component **does not** bind `res.meta` to the template today (no display of `searchDebug` in UI unless you add it). TypeScript interface `AiPlaceSearchMeta` in `ai-place-search.model.ts` does not include `searchDebug`; extra fields still arrive at runtime if debug is on.

---

## 8. Full flow summary (request lifecycle)

```text
User: Enter prompt → (optional) “Use my location” for lat/lng
        → Click “Search” or Enter
          → AiPlaceDiscoveryComponent.search()
            → Validates location + non-empty prompt
              → AiPlaceSearchService.search(POST /api/ai-place-search)
                → Express POST /api/ai-place-search
                  → aiPlaceSearch.js validate + API key check
                    → placeSearchOrchestrator.searchPlaces()
                      → [If GEMINI_API_KEY] planWithGemini()  (Gemini JSON plan)
                        → validateAndSanitizeSearchPlan()
                          → buildSearchTextRequest()
                            → POST places.googleapis.com/v1/places:searchText  (Places API New)
                      → [If that path did not succeed]
                          → searchPlacesLegacy()
                            → GET maps.googleapis.com/.../textsearch/json  (Legacy)
                            → optional GET .../nearbysearch/json  (Legacy, only if category ≠ all and fewer than 6 text results)
                    → scorePlace() per result + sort
                      → JSON { meta, places }
                        → Angular: places + markers + fitBounds
```

---

## Sample backend responses (shapes)

### Success (truncated)

```json
{
  "meta": {
    "prompt": "coffee nearby",
    "location": { "lat": 14.6, "lng": 120.98 },
    "radius": 1500,
    "category": "all",
    "totalResults": 12,
    "placesApiStatus": "OK"
  },
  "places": [
    {
      "id": "ChIJ…",
      "name": "Example Cafe",
      "lat": 14.601,
      "lng": 120.985,
      "address": "…",
      "rating": 4.5,
      "userRatingsTotal": 120,
      "priceLevel": 2,
      "openNow": true,
      "types": ["cafe", "food", "point_of_interest"],
      "photoReference": "places/ChIJ…/photos/…",
      "photoUrl": null,
      "googleMapsUrl": "https://www.google.com/maps/…",
      "distanceMeters": 240,
      "relevanceScore": 78,
      "matchReasons": ["…"],
      "warnings": []
    }
  ]
}
```

### With debug (`debug: true` or `AI_PLACE_SEARCH_DEBUG=true`)

`meta` may additionally include:

```json
"searchDebug": {
  "plannerSource": "gemini",
  "fallbackReason": null,
  "sanitizedPlan": { "textQuery": "…", "pageSize": 15, "…": "…" },
  "googleRequestSummary": { "textQuery": "…", "locationBias": { "circle": { … } }, "…": null },
  "effectiveRadiusMeters": 1200
}
```

---

## Notes on clarity / legacy / consistency (as observed)

| Topic | Observation |
|-------|----------------|
| **Dual Google stacks** | **Places API (New)** when Gemini path wins; **Legacy Text Search (+ optional Nearby)** on fallback. Same env key is reused for both; the key must be enabled for the New API in Google Cloud. |
| **Frontend vs backend optional fields** | Controller accepts `mapCenterLat`, `mapCenterLng`, `debug`; Angular `AiPlaceSearchRequest` type **does not** list them — they are optional at runtime only if you send them manually or extend the client. |
| **Radius semantics** | UI always sends `1500`. After Gemini, **scoring** may use `effectiveRadiusMeters` from the plan when present (`placeSearchOrchestrator.js`). |
| **Hotel bar meta** | Computed in the **orchestrator** (not in `searchPlacesLegacy` return) to avoid duplication; legacy `metaExtra` from `searchPlacesLegacy` is otherwise empty. |
| **`placesApiStatus`** | Set from legacy status string or `"OK"` for the New path in current code — not the same enum space as legacy `OK`/`ZERO_RESULTS` for New API errors (errors throw before setting). |

---

## Current architecture assessment

### What is implemented well

- **Clear separation**: controller → orchestrator → Gemini planner → plan validator → request builder → New Places client, with a **single legacy fallback** path.
- **No secrets in prompts**: Gemini is instruction-only; Google key stays server-side; URLs are fixed in code.
- **Stable client contract**: Same `POST /api/ai-place-search` body shape for the Angular app; response still `{ meta, places }` with scoring.
- **Debug hook**: Optional `searchDebug` without forcing UI changes.

### What is still legacy / transitional

- **Fallback** still uses **legacy** Text Search / Nearby (`googlePlacesSearch.js`) — important for resilience if New API or Gemini fails.
- **Frontend** still sends **fixed** `category: "all"` and **does not** send map center — Gemini context is slightly poorer than the backend allows.
- **Types**: `AiPlaceSearchMeta` in TypeScript may lag behind optional `meta.searchDebug`.

### Reasonable next improvements (documentation only — not requested to implement)

- Pass **map center** from the client when the user pans the map, to align with `centerSource: "map_center"`.
- Extend **Angular types** for optional `debug` / `searchDebug` when debugging.
- Consider exposing a **user-visible** “why these results” string from `reasoningSummary` (today it stays server-side unless debug).

---

*End of `TEMP_search_flow_explained.md`.*
