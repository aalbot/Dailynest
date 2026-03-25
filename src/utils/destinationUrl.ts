/**
 * Normalizes "Destination URL" for storage and href: keeps http(s) and // URLs,
 * preserves same-site paths starting with "/", otherwise prepends https://.
 */
export function normalizeDestinationUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return s;
  if (s.startsWith("/")) return s;
  return `https://${s}`;
}

/** True if this custom app path should open as a real browser navigation (destination URL), not in-app routing. */
export function isCustomAppExternalDestination(path: string, type?: string): boolean {
  const p = path || "";
  if (type === "url") return true;
  if (/^https?:\/\//i.test(p) || p.startsWith("//")) return true;
  return !p.startsWith("/");
}
