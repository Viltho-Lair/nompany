// THE PARTS OF jsPDF WE DO NOT USE, RESOLVED TO NOTHING.
//
// jsPDF reaches for three packages through dynamic `import()`: html2canvas and
// dompurify for `doc.html()`, canvg for SVG images. They are optionalDependencies,
// so npm installs them, and a bundler bundles what it can resolve — which is how
// 92 KB gzipped of chunks nothing ever loads ended up in the client build. canvg
// is the expensive one: it depends on core-js and brought a 48 KB chunk with it.
//
// The only caller is lib/chatTranscript, and it draws a transcript with text(),
// line(), splitTextToSize() and addImage(). None of those paths touch html() or
// SVG. next.config.mjs aliases all three specifiers to this file.
//
// It THROWS rather than quietly doing nothing: if a future document reaches
// doc.html(), the failure should name the reason instead of producing a blank
// page. Un-aliasing in next.config.mjs is the fix, and it costs what it says.

const REASON =
  "jsPDF's html()/SVG support is aliased out of this bundle — see src/lib/jspdfOptional.ts. " +
  "Remove the alias in next.config.mjs if a document genuinely needs it.";

function unavailable(): never {
  throw new Error(REASON);
}

// Each package is consumed differently — html2canvas as a default function,
// dompurify as a default carrying `.sanitize`, canvg as a named `Canvg` with
// static factories — so every shape jsPDF reaches for exists here and throws.
export const Canvg = { fromString: unavailable, from: unavailable };
export const sanitize = unavailable;

export default Object.assign(unavailable, { sanitize: unavailable });
