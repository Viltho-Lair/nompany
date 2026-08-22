// Extracts a YouTube video ID from watch/share/short/embed URL formats.
// Returns null for anything that isn't a recognizable YouTube URL.
export function youtubeVideoId(url) {
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    return u.pathname.slice(1).split("/")[0] || null;
  }
  if (host === "youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const match = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
    if (match) return match[2];
  }
  return null;
}

export function youtubeEmbedUrl(url) {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function youtubeThumbnailUrl(url) {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
