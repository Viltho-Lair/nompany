// FONTS, EMBEDDED — server only.
//
// The renderer runs Chromium with the network switched off, so a @font-face
// pointing at a URL resolves to nothing and Chromium quietly substitutes. For
// Latin that produces a document that looks wrong. For ARABIC it produces boxes,
// because the container has no Arabic face at all — and Arabic is the reason
// this product renders through a browser engine rather than a PDF library in the
// first place.
//
// So the faces are read off disk and inlined as data: URIs. Read once and held
// in module scope: a warm function renders every subsequent document without
// touching the filesystem again, and 130KB is worth keeping.

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Resolved from the working directory rather than import.meta.url: the route
// that calls this is bundled, so the module's own path at runtime says nothing
// about where the project's files ended up. `next.config.mjs` names this folder
// in outputFileTracingIncludes so the files are actually deployed alongside it.
const DIR = join(process.cwd(), "src", "fonts");

const FACES = [
  { family: "Doc Sans", file: "DocSans.woff2" },
  { family: "Doc Arabic", file: "DocArabic.woff2" },
];

let cached = null;

// The @font-face block for the export document. Returns "" for any face that
// cannot be read rather than throwing: a document rendered in a substituted
// font is a bad document, and no document at all is worse.
export function fontFaceCss() {
  if (cached !== null) return cached;

  const blocks = [];
  for (const face of FACES) {
    try {
      const data = readFileSync(join(DIR, face.file)).toString("base64");
      blocks.push(
        `@font-face{font-family:'${face.family}';`
        + `src:url(data:font/woff2;base64,${data}) format('woff2');`
        // The files are VARIABLE across this range, so one face answers for
        // both body text and bold rather than Chromium synthesising a bold by
        // smearing the regular — which on Arabic breaks the joins.
        + `font-weight:400 700;font-style:normal;font-display:block}`,
      );
    } catch {
      // Named in the console rather than swallowed: an export that silently
      // loses its Arabic face is the kind of fault nobody notices until a
      // customer opens the PDF.
      console.error(`[quality] font missing: ${face.file} — export will substitute`);
    }
  }
  cached = blocks.join("");
  return cached;
}

// Whether both faces actually loaded. The export route reports this so a
// deployment that lost the fonts is visible as a warning rather than as a
// mysteriously different-looking PDF.
export function fontsComplete() {
  return fontFaceCss().split("@font-face").length - 1 === FACES.length;
}
