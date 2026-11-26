/** One frozen resource order for an editing pass. Updates never reshuffle it.
 *  Entries are content ids, or `ws:<workspace id>` for work not yet saved to
 *  the library. `review` marks a pass started from a dashboard queue: the
 *  editor then shows progress and publishing moves on to the next entry. */
export type CuratorNavigation = { id: string; ids: string[]; query: string; review?: { title: string } };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const prefix = "curator-navigation:";
export function saveNavigation(storage: Storage, id: string, ids: string[], query = "", review?: { title: string }): CuratorNavigation {
  const navigation: CuratorNavigation = { id, ids: [...new Set(ids)], query, ...(review ? { review } : {}) };
  storage.setItem(`${prefix}${id}`, JSON.stringify(navigation));
  return navigation;
}
export function readNavigation(storage: Storage, id: string): CuratorNavigation | null {
  const raw = storage.getItem(`${prefix}${id}`);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value.id === id && Array.isArray(value.ids) && value.ids.every((v: unknown) => typeof v === "string") && typeof value.query === "string" ? value : null;
  } catch { return null; }
}
export function nextResourceIds(navigation: CuratorNavigation, currentId: string): string[] {
  const index = navigation.ids.indexOf(currentId);
  return index < 0 ? [] : navigation.ids.slice(index + 1);
}
export function navigationHref(href: string, navigationId: string) {
  return `${href}${href.includes("?") ? "&" : "?"}nav=${encodeURIComponent(navigationId)}`;
}
/** The key an entry is listed under: its content id, or its workspace id when unsaved. */
export function navigationKey(entry: { contentId?: string | null; id: string }) {
  return entry.contentId || `ws:${entry.id}`;
}
