/**
 * MapTiler vector style URL (key/id from Angular environment only).
 * @see https://docs.maptiler.com/cloud/api/maps/
 */
const MAPTILER_DEFAULT_STYLE = "streets-v2";

/** Treat empty, whitespace, or template placeholders as missing. */
export function isConfiguredMapTilerApiKey(key: string | null | undefined): boolean {
  const k = (key ?? "").trim();
  return k.length > 0 && !k.includes("{{") && !k.includes("}}");
}

export function sanitizeMapTilerMapId(id: string | null | undefined): string | null {
  const t = (id ?? "").trim();
  if (!t || t.includes("{{") || t.includes("}}")) {
    return null;
  }
  return t;
}

export function buildMapTilerStyleUrl(apiKey: string, mapId?: string | null): string {
  const key = encodeURIComponent(apiKey.trim());
  const id = sanitizeMapTilerMapId(mapId ?? null);
  if (id) {
    return `https://api.maptiler.com/maps/${encodeURIComponent(id)}/style.json?key=${key}`;
  }
  return `https://api.maptiler.com/maps/${MAPTILER_DEFAULT_STYLE}/style.json?key=${key}`;
}
