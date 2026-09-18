/**
 * The document editor's fonts, served through nompany rather than by Google.
 *
 * WHY THIS EXISTS: the editor used to add a `<link>` to fonts.googleapis.com in
 * the reader's browser, so every person opening a document sent their IP
 * address to Google. A Munich court held exactly that to be a GDPR breach in
 * January 2022 (LG München I, 3 O 17493/20), and it set off a wave of demand
 * letters against German sites. The marketing site never had the problem —
 * `next/font/google` downloads its fonts at BUILD time — but the editor offers
 * the whole catalogue (~1,950 families), which cannot be bundled.
 *
 * So the browser asks us, and our server asks Google. Google sees a Vercel
 * address and never a person's; with the responses cached, it mostly sees
 * nothing at all.
 *
 * Pure: the two routes do the fetching, this decides what is allowed and how
 * the stylesheet is rewritten, so it can be asserted without a network.
 */

/** Where the stylesheet comes from, and where the files it names live. */
export const GOOGLE_CSS = "https://fonts.googleapis.com/css2";
export const GOOGLE_FILES = "https://fonts.gstatic.com/";

/** Same-origin addresses the browser is given instead. */
export const PROXY_CSS = "/api/fonts/css";
export const PROXY_FILE = "/api/fonts/file";

/**
 * A family name as Google spells them: letters, digits and spaces. Anything
 * else is refused rather than escaped, so a request can never steer the
 * server's own fetch at a different URL.
 */
const FAMILY = /^[A-Za-z0-9 ]{1,64}$/;

export function validFamily(family: string | null): family is string {
  return family !== null && FAMILY.test(family) && family.trim() === family;
}

/**
 * A path under fonts.gstatic.com. Only `s/<family>/<version>/<file>` with a
 * font extension — the shape css2 hands out — so this route proxies font files
 * from one host and nothing else. `..` cannot match: no segment may start with
 * a dot.
 */
const FILE_PATH = /^s\/[a-z0-9_-]+\/v\d+\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(woff2|woff|ttf|otf)$/;

export function validFilePath(path: string | null): path is string {
  return path !== null && FILE_PATH.test(path);
}

const CONTENT_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

export function fontContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1);
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** The stylesheet URL our server fetches for one family. */
export function googleCssUrl(family: string, weights: string | null): string {
  const name = encodeURIComponent(family).replace(/%20/g, "+");
  return `${GOOGLE_CSS}?family=${name}${weights ? `:wght@${weights}` : ""}&display=swap`;
}

/** The same-origin stylesheet URL the browser is given for one family. */
export function proxyCssUrl(family: string): string {
  return `${PROXY_CSS}?family=${encodeURIComponent(family)}`;
}

/**
 * Points every font file in Google's stylesheet at our file route. A URL that
 * is not a font file on fonts.gstatic.com is DROPPED, rule and all, rather
 * than left pointing at Google: a face that falls back to the generic family
 * is a cosmetic loss, and a request that leaves for Google is the thing this
 * file exists to stop.
 */
export function rewriteStylesheet(css: string): string {
  return css.replace(/@font-face\s*\{[^}]*\}/g, (rule) => {
    let dropped = false;
    const rewritten = rule.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (_, url: string) => {
      const path = url.startsWith(GOOGLE_FILES) ? url.slice(GOOGLE_FILES.length) : null;
      if (!validFilePath(path)) {
        dropped = true;
        return "url()";
      }
      return `url(${PROXY_FILE}?p=${encodeURIComponent(path)})`;
    });
    return dropped ? "" : rewritten;
  });
}
