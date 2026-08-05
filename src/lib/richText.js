// Very small HTML sanitiser + plain-text detector for the rich-text field used
// by job descriptions. Only used for content authored by admin users, but we
// still strip anything outside a strict allowlist so a stray paste can't smuggle
// in <script> / event handlers / javascript: URLs.

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "ul", "ol", "li", "br", "p", "span"]);

export function isProbablyHtml(value) {
  if (typeof value !== "string") return false;
  return /<(b|strong|i|em|u|ul|ol|li|br|p|span)\b[^>]*>/i.test(value);
}

// Strip everything except our allowlist; drop attributes entirely.
export function sanitizeRichHtml(value) {
  if (!value) return "";
  let s = String(value);
  // Kill script / style blocks in one shot.
  s = s.replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, "");
  // Rewrite each tag: keep only if allowed; always drop attributes.
  s = s.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (m, tag) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return "";
    return m.startsWith("</") ? `</${t}>` : `<${t}>`;
  });
  return s;
}
