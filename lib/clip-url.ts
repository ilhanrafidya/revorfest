export type ClipProvider = "youtube" | "streamable" | "tiktok";

/** Extracts provider + id from a YouTube / Streamable / TikTok link. */
export function parseClipUrl(raw: string): { provider: ClipProvider; id: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && parts[0]) return { provider: "youtube", id: parts[0].slice(0, 20) };
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return { provider: "youtube", id: v.slice(0, 20) };
    if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && parts[1]) return { provider: "youtube", id: parts[1].slice(0, 20) };
  }
  if (host === "streamable.com" && parts.length) {
    const id = parts[0] === "e" || parts[0] === "o" ? parts[1] : parts[0];
    if (id && /^[a-z0-9]+$/i.test(id)) return { provider: "streamable", id };
  }
  if (host.endsWith("tiktok.com")) {
    const i = parts.indexOf("video");
    if (i >= 0 && parts[i + 1] && /^\d+$/.test(parts[i + 1])) return { provider: "tiktok", id: parts[i + 1] };
  }
  return null;
}

export function embedUrl(provider: string, id: string) {
  if (provider === "youtube") return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
  if (provider === "streamable") return `https://streamable.com/e/${id}?autoplay=1`;
  return `https://www.tiktok.com/embed/v2/${id}`;
}

export function thumbUrl(provider: string, id: string) {
  return provider === "youtube" ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export const PROVIDER_LABEL: Record<string, string> = { youtube: "YouTube", streamable: "Streamable", tiktok: "TikTok" };
