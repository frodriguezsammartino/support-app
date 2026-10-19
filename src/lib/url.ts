/**
 * Normaliza un enlace que tipeó una persona: "portal.com/x" pasa a
 * "https://portal.com/x". Devuelve null si está vacío y undefined si no es un
 * enlace válido. Solo http y https: nada de `javascript:` en un href.
 */
export function normalizeUrl(raw: string | null | undefined): string | null | undefined {
  const value = raw?.trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (!parsed.hostname.includes(".")) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
