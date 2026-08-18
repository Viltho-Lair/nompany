// THE PDF ENGINE — server only, and deliberately the smallest thing in Phase 3.
//
// A headless browser rendering a document somebody else wrote, on our own
// infrastructure, is the single most dangerous component in this module. The
// guide this replaces made it worse in three ways at once: it passed the
// CLIENT'S HTML straight to setContent, it loaded a stylesheet over the network
// from inside the render, and it waited on `networkidle0` — which means it
// would patiently hold the page open until every request the document asked for
// had finished, including the ones aimed at the cloud metadata endpoint.
//
// This module's answer is that THE PAGE HAS NO NETWORK. Every request is
// intercepted and refused except `data:`, which is already in the document. The
// HTML is produced by our own renderer from validated JSON, the stylesheet is
// inlined, the fonts are inlined, and images were pinned to our own media store
// on the way in and resolved to data: URIs before we get here. There is nothing
// left for the page to fetch, so there is nothing an author can aim at us.

import { fontFaceCss, fontsComplete } from "@/lib/qualityFonts";
import { documentHtml, headerTemplate, footerTemplate, DEFAULT_TEMPLATE } from "@/lib/qualityRender";
import { DOCUMENT_CSS, pageCss } from "@/lib/qualityCss";

// Where the browser comes from, in the two places this runs.
//
// On Vercel: @sparticuz/chromium-min holds no binary of its own and fetches the
// pack from a URL we host, which is what keeps the function inside its size
// limit. CHROMIUM_PACK_URL is therefore not optional in production, and its
// absence is reported as a configuration fault rather than a crash — a missing
// environment variable should not read like a bug in the exporter.
//
// In development: whatever Chrome is already on the machine. Nobody should have
// to host a Chromium tarball to try the export locally.
const LOCAL_CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

async function launch() {
  // Imported dynamically so neither package is evaluated — nor pulled into any
  // other route's bundle — until somebody actually exports a document.
  const puppeteer = (await import("puppeteer-core")).default;
  const packUrl = process.env.CHROMIUM_PACK_URL;

  if (packUrl) {
    const mod = await import("@sparticuz/chromium-min");
    const chromium = mod.default || mod;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(packUrl),
      headless: true,
    });
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return { error: "no-chromium" };
  }

  const { existsSync } = await import("node:fs");
  const local = LOCAL_CHROME.find((p) => { try { return existsSync(p); } catch { return false; } });
  if (!local) return { error: "no-chromium" };
  return puppeteer.launch({ executablePath: local, headless: true });
}

// Images live in our own media store, and the render has no network to fetch
// them over. So each one is read out of Redis and inlined before the page is
// built — which also means an image that has been deleted leaves an obvious gap
// rather than a broken-image icon nobody can explain.
export async function inlineImages(sections, getMedia) {
  const wanted = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "image" && node.attrs?.src) wanted.add(node.attrs.src);
    (node.content || []).forEach(walk);
  };
  for (const s of sections || []) walk(s.body);

  const map = {};
  for (const src of wanted) {
    const id = String(src).split("/").pop();
    try {
      const media = await getMedia(id);
      if (media?.buffer) map[src] = `data:${media.contentType};base64,${media.buffer.toString("base64")}`;
    } catch { /* a missing image is a gap in the page, never a failed export */ }
  }
  return map;
}

/**
 * Render one document to PDF.
 *
 * Everything it needs arrives resolved: the caller has already decided what the
 * merge fields say, which template applies and whether the page carries a
 * watermark. This function's only job is to be a browser, safely.
 */
export async function renderPdf({ sections, values, template = DEFAULT_TEMPLATE, watermark = "", title = "", dir = "ltr", images = {}, logoDataUri = "", revision = null, blocks = {}, inputs = {} }) {
  const browser = await launch();
  if (browser?.error) return browser;

  let page;
  try {
    page = await browser.newPage();

    // THE LOCKED DOOR. Everything the page asks for is refused unless it is
    // already inside the document. `document` is the page's own setContent call;
    // `data:` is the fonts and the images we inlined ourselves. There is no
    // third case, and an http, https or file request is aborted rather than
    // followed.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("data:") || url === "about:blank") return req.continue();
      if (req.isNavigationRequest() && req.frame() === page.mainFrame() && req.resourceType() === "document") return req.continue();
      return req.abort();
    });

    // Belt and braces: JavaScript is off. Nothing the renderer emits needs it,
    // and a page that cannot run a script cannot be talked into anything.
    await page.setJavaScriptEnabled(false);

    const html = documentHtml({
      sections, values, title, dir, revision, blocks, inputs,
      css: DOCUMENT_CSS + pageCss(template),
      fonts: fontFaceCss(),
      watermark,
      image: (src) => images[src] || "",
    });

    // `domcontentloaded`, never `networkidle0`. There is no network to go idle,
    // so waiting for one is waiting for a timeout.
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluateHandle("document.fonts.ready").catch(() => {});

    const ctx = { values, template };
    const m = template?.margins || DEFAULT_TEMPLATE.margins;
    const pdf = await page.pdf({
      format: template?.pageSize === "Letter" ? "Letter" : "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate(template, ctx, logoDataUri),
      footerTemplate: footerTemplate(template, ctx),
      margin: {
        top: `${Number(m.top) || 28}mm`,
        right: `${Number(m.right) || 18}mm`,
        bottom: `${Number(m.bottom) || 22}mm`,
        left: `${Number(m.left) || 18}mm`,
      },
      preferCSSPageSize: false,
    });

    return { pdf: Buffer.from(pdf), fontsComplete: fontsComplete() };
  } catch (e) {
    return { error: "render-failed", detail: String(e?.message || e) };
  } finally {
    // Closed on every path. A browser left running in a warm function is a
    // process that outlives the request that made it.
    try { await page?.close(); } catch { /* already gone */ }
    try { await browser?.close?.(); } catch { /* already gone */ }
  }
}
