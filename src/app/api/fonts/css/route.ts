import { googleCssUrl, rewriteStylesheet, validFamily } from "@/lib/docs/fontProxy";

/**
 * One family's stylesheet, fetched by our server and rewritten so its font
 * files are ours too — the reader's browser never talks to Google.
 * `lib/docs/fontProxy.ts` says why.
 *
 * ONE FAMILY PER REQUEST, deliberately: "Inter" is then the same URL for every
 * reader of every document, so the CDN and the fetch cache answer it after the
 * first time. A batch URL would almost never repeat.
 */

const WEIGHTS = "400;700";
const DAY = 60 * 60 * 24;

// css2 picks the file format from the user agent, and anything it does not
// recognise gets TTF. A current browser's string gets woff2, which is what
// every browser this product supports can read.
const MODERN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchCss(url: string) {
  return fetch(url, {
    headers: { "User-Agent": MODERN_UA },
    next: { revalidate: DAY },
  });
}

export async function GET(request: Request) {
  const family = new URL(request.url).searchParams.get("family");
  if (!validFamily(family)) {
    return Response.json({ error: "invalid-family" }, { status: 400 });
  }

  // css2 refuses the WHOLE request with a 400 when the family lacks one of the
  // weights asked for (a display face that ships 400 only). Ask again for the
  // family's default rather than let the face fall back to sans-serif.
  let response = await fetchCss(googleCssUrl(family, WEIGHTS));
  if (response.status === 400) response = await fetchCss(googleCssUrl(family, null));

  if (!response.ok) {
    return Response.json(
      { error: `Google Fonts returned ${response.status}` },
      { status: response.status === 400 ? 404 : 502 },
    );
  }

  return new Response(rewriteStylesheet(await response.text()), {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": `public, max-age=${DAY}, stale-while-revalidate=${DAY * 7}`,
    },
  });
}
