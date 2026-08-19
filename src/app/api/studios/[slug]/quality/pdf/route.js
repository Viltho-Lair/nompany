import { qualityGuard, openDraft, listTypes, mergeValuesFor, watermarkFor, resolveBlocks, letterheadFor } from "@/lib/quality";
import { renderPdf, inlineImages } from "@/lib/qualityPdf";
import { directionOf } from "@/lib/qualityDocuments";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Chromium's cold start is seconds before a single byte of HTML is parsed, and
// a long document with images is seconds more. The default would cut the export
// off part-way and report it as a failure.
export const maxDuration = 60;

// EXPORTING IS A READ. It produces a copy of what the document already says, so
// it asks for the view right and nothing more — a person who may read a
// procedure may take it away with them, which is the entire purpose of a
// controlled document.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const opened = await openDraft(g, id);
  if (opened.error) {
    return Response.json({ error: opened.error }, { status: opened.error === "notfound" ? 404 : 400 });
  }

  const types = await listTypes(g);
  const values = await mergeValuesFor(g, opened.document, { types, rev: opened.draft?.rev });
  // Blocks resolve here too, through the same permission gate — the exporter
  // must not become a way to print rows the requester may not read.
  const blocks = await resolveBlocks(g, opened.document);

  // The studio's mark, read out of the media store and inlined. Puppeteer's
  // header template renders in a document of its own with no network and no
  // access to the page — an external image there does not load, whatever the
  // src says, so it has to arrive as data.
  let logoDataUri = "";
  const logoId = String(g.studio.logo || "").split("/").pop();
  if (/^[a-f0-9]{32}$/i.test(logoId)) {
    const media = await getMedia(logoId).catch(() => null);
    if (media?.buffer) logoDataUri = `data:${media.contentType};base64,${media.buffer.toString("base64")}`;
  }

  const images = await inlineImages(opened.sections, getMedia);

  // Signature graphics come through the same door as document images: read from
  // our own media store and inlined, because the render has no network and a
  // signature that fails to load is a blank where the evidence should be.
  for (const sig of [opened.draft?.review, opened.draft?.approval]) {
    const sigId = String(sig?.signatureUrl || "").split("/").pop();
    if (!/^[a-f0-9]{32}$/i.test(sigId)) continue;
    const media = await getMedia(sigId).catch(() => null);
    if (media?.buffer) images[sig.signatureUrl] = `data:${media.contentType};base64,${media.buffer.toString("base64")}`;
  }

  const result = await renderPdf({
    sections: opened.sections,
    values,
    template: letterheadFor(g),
    watermark: watermarkFor(opened.document),
    title: `${opened.document.code} ${opened.document.title}`,
    dir: directionOf(opened.document.language),
    images,
    logoDataUri,
    revision: opened.draft,
    blocks,
    inputs: opened.draft?.inputs || {},
  });

  if (result.error === "no-chromium") {
    // A configuration fault, said as one. Reading like a bug in the exporter is
    // how somebody spends an afternoon debugging a missing environment variable.
    return Response.json({
      error: "no-chromium",
      detail: "Set CHROMIUM_PACK_URL to a hosted @sparticuz/chromium pack, or install Chrome locally for development.",
    }, { status: 503 });
  }
  if (result.error) return Response.json({ error: result.error, detail: result.detail }, { status: 500 });

  const filename = `${opened.document.code}-rev${opened.draft?.rev ?? 0}.pdf`;
  return new Response(result.pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // `inline` so the browser opens it rather than dropping it in Downloads.
      // The reader screen asks for a download explicitly when that is wanted.
      "Content-Disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${filename}"`,
      // A controlled document is never cached: what it says depends on which
      // revision is current, and that changes underneath any cached copy.
      "Cache-Control": "no-store, must-revalidate",
      "X-Quality-Fonts": result.fontsComplete ? "embedded" : "substituted",
    },
  });
}
