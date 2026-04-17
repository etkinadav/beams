/**
 * MapTiler vector style URL (no secrets in this module — key/id come from Angular environment).
 * @see https://docs.maptiler.com/cloud/api/maps/
 */
const MAPTILER_DEFAULT_STYLE = "streets-v2";

export function buildMapTilerStyleUrl(apiKey: string, mapId?: string | null): string {
  const key = encodeURIComponent(apiKey.trim());
  const id = mapId?.trim();
  if (id) {
    return `https://api.maptiler.com/maps/${encodeURIComponent(id)}/style.json?key=${key}`;
  }
  return `https://api.maptiler.com/maps/${MAPTILER_DEFAULT_STYLE}/style.json?key=${key}`;
}
