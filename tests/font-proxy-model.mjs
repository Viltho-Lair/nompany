// THE DOCUMENT EDITOR'S FONTS NEVER SEND A READER TO GOOGLE. Pure, no network.
//
// THE DEFECT: `loadFonts` linked fonts.googleapis.com from the reader's browser,
// so opening a document sent their IP address to Google — the exact act a
// Munich court fined in 2022. The proxy fixes it only if the stylesheet it
// hands back names NO Google URL at all, so that is asserted first; and it is
// only safe if the file route cannot be steered at another host or path, so
// that is asserted second.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const P = await import("@/lib/docs/fontProxy");
const F = await import("@/lib/docs/fonts");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

// A trimmed css2 answer, in the shape Google serves to a modern browser.
const GOOGLE_CSS = `/* latin-ext */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZJhiI2B.woff2) format('woff2');
  unicode-range: U+0100-02BA;
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
@font-face {
  font-family: 'Evil';
  src: url(https://evil.example/s/x/v1/a.woff2) format('woff2');
}`;

console.log("\n== the stylesheet the browser receives names no Google host");

const out = P.rewriteStylesheet(GOOGLE_CSS);
ok("no fonts.gstatic.com left", !out.includes("fonts.gstatic.com"));
ok("no googleapis left", !out.includes("googleapis"));
ok("both Inter faces survive, pointed at our file route",
  (out.match(/url\(\/api\/fonts\/file\?p=/g) || []).length === 2);
ok("the path is carried encoded",
  out.includes("p=s%2Finter%2Fv20%2FUcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZJhiI2B.woff2"));
ok("a face on any other host is dropped whole, not left pointing away",
  !out.includes("evil.example") && !out.includes("'Evil'"));
ok("the unicode ranges are kept", out.includes("U+0100-02BA") && out.includes("U+0000-00FF"));

console.log("\n== the browser is sent to us, never to Google");

ok("a family's stylesheet is same-origin",
  P.proxyCssUrl("Noto Sans Arabic") === "/api/fonts/css?family=Noto%20Sans%20Arabic");
ok("fonts.ts no longer names a Google host",
  !(await import("node:fs")).readFileSync("src/lib/docs/fonts.ts", "utf8").match(/https:\/\/fonts\.(googleapis|gstatic)/));
ok("loadFonts is still exported", typeof F.loadFonts === "function");

console.log("\n== the server's own fetch cannot be steered");

ok("a real family is accepted", P.validFamily("IBM Plex Sans Arabic"));
ok("a null family is refused", !P.validFamily(null));
ok("an empty family is refused", !P.validFamily(""));
ok("a family carrying a parameter is refused", !P.validFamily("Inter&family=Roboto"));
ok("a family carrying a colon is refused", !P.validFamily("Inter:wght@900"));
ok("padding is refused rather than trimmed", !P.validFamily(" Inter"));
ok("the server URL spaces a family with +",
  P.googleCssUrl("Open Sans", "400;700") === "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap");
ok("the retry asks for no weight",
  P.googleCssUrl("Open Sans", null) === "https://fonts.googleapis.com/css2?family=Open+Sans&display=swap");

ok("a css2 file path is accepted", P.validFilePath("s/inter/v20/UcCO3Fwr-_K.woff2"));
ok("a null path is refused", !P.validFilePath(null));
ok("a traversal is refused", !P.validFilePath("s/inter/v20/../../etc/passwd.woff2"));
ok("a dot segment is refused", !P.validFilePath("s/inter/v20/.woff2"));
ok("another host is refused", !P.validFilePath("//evil.example/s/a/v1/b.woff2"));
ok("an absolute URL is refused", !P.validFilePath("https://evil.example/s/a/v1/b.woff2"));
ok("a non-font file is refused", !P.validFilePath("s/inter/v20/page.html"));
ok("a query smuggled in is refused", !P.validFilePath("s/inter/v20/a.woff2?x=1"));
ok("a path outside s/ is refused", !P.validFilePath("l/font/v1/a.woff2"));

ok("woff2 is served as font/woff2", P.fontContentType("s/a/v1/b.woff2") === "font/woff2");
ok("ttf is served as font/ttf", P.fontContentType("s/a/v1/b.ttf") === "font/ttf");

console.log(fails === 0 ? "\nfont proxy: all passed" : `\nfont proxy: ${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
