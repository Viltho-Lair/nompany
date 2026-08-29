import os from "node:os";

/** @type {import('next').NextConfig} */

// SECURITY HEADERS.
//
// Until now this file set `reactStrictMode` and nothing else: no CSP, no HSTS,
// no framing policy, no referrer policy, and the `X-Powered-By: Next.js`
// banner on every response. For a product holding invoices, salaries and
// controlled documents that is the cheapest gap in the whole audit to close.
//
// Everything below is ENFORCED except the Content-Security-Policy, which ships
// Report-Only first — see the note on it. Report-Only is not a hedge: turning a
// CSP straight on in a codebase with an inline bootstrap script, MUI's runtime
// style injection and a dynamically injected Maps loader breaks the product in
// ways that only show up on the pages nobody clicked during review.

const isProd = process.env.NODE_ENV === "production";

// Where the app legitimately talks to. Derived from what the code actually
// references, not from a template — anything not on this list is a finding, not
// a missing entry.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the theme bootstrap in app/layout.js, which
  // must run before paint to avoid a flash and therefore cannot be deferred to
  // a file. The way OFF it is a per-request nonce set in the proxy; that is a
  // real change and belongs in its own commit, which is the main thing this
  // Report-Only pass exists to size.
  // 'unsafe-eval' is dev-only (React Refresh); production does not get it.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://maps.googleapis.com`,
  // MUI/emotion injects styles at runtime, so this one cannot be tightened
  // without replacing the styling engine. Google Fonts serves the stylesheet.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // data: and blob: cover uploaded previews and generated documents; the Google
  // hosts are map tiles; img.youtube.com is video thumbnails.
  "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com https://img.youtube.com",
  // Same-origin API plus the Maps JS API. The SSE stream is same-origin.
  "connect-src 'self' https://maps.googleapis.com",
  // YouTube embeds are the only third-party frame the product renders.
  "frame-src 'self' https://www.youtube.com",
  // Nothing may frame US — the modern equivalent of X-Frame-Options, kept
  // alongside it because both are still read by different agents.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// `upgrade-insecure-requests` is IGNORED inside a report-only policy — the
// browser says so in the console — so it ships as its own enforced header
// instead. On its own it blocks nothing: it rewrites http:// subresource
// requests to https://, which is the behaviour we want immediately and which
// does not need a reporting period to be safe.
const CSP_ENFORCED = "upgrade-insecure-requests";

const securityHeaders = [
  // Two years, subdomains included. `preload` is deliberately NOT set: it is a
  // commitment to browser vendors that is slow and painful to reverse, and it
  // should be a decision somebody makes on purpose rather than a default that
  // arrived with a config change.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Stops a browser second-guessing a Content-Type — the reason an uploaded
  // file served as image/png cannot be talked into executing as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full path same-site. Studio URLs carry the
  // tenant slug and record ids, and neither belongs in somebody else's logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The product asks for none of these; saying so stops an embedded frame or a
  // future dependency from asking on its behalf.
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // REPORT-ONLY, on purpose. It logs violations to the browser console without
  // blocking anything, so the real source list can be finished from evidence
  // rather than from reading imports. Flip the key to
  // "Content-Security-Policy" once a full pass over the studio, the console and
  // the public pages reports clean.
  { key: "Content-Security-Policy-Report-Only", value: CSP },
  { key: "Content-Security-Policy", value: CSP_ENFORCED },
];

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // ONE WORKER PER FOUR CORES, NOT ONE PER CORE.
    //
    // Next sizes its build pool from the CPU count, which on a 20-thread
    // Windows box is nineteen workers for "Collecting page data" and nineteen
    // more for "Generating static pages". Each one reserves its own V8 heap,
    // and the machine fast-failed the pool three builds running — exit
    // 0xC0000409, with the dying worker reporting an allocation failure at
    // 22 MB while 18 GB of the machine was free. It is a spawn problem, not a
    // memory one, and it reproduced on an unmodified tree.
    //
    // Four is enough to keep the step parallel and few enough that the pool
    // comes up. The build is not the bottleneck here; a build that dies once a
    // day is.
    cpus: Math.max(1, Math.min(4, (os.cpus()?.length || 4))),
  },
  // jsPDF DRAGS THREE PACKAGES IT ONLY NEEDS FOR doc.html() AND SVG.
  //
  // They are optionalDependencies, so they are installed and therefore
  // resolvable, and Turbopack emitted them as lazy chunks: html2canvas at
  // 44 KB gz and canvg — which depends on core-js — at 48 KB. Nothing loads
  // them. lib/chatTranscript is the only jsPDF caller, and it draws with
  // text(), line(), splitTextToSize() and addImage().
  //
  // The alias target throws if anything ever does reach those paths, so this
  // is a deliberate omission rather than a silent one. See
  // src/lib/jspdfOptional.ts.
  turbopack: {
    resolveAlias: {
      html2canvas: "./src/lib/jspdfOptional.ts",
      canvg: "./src/lib/jspdfOptional.ts",
      dompurify: "./src/lib/jspdfOptional.ts",
    },
  },
  // "Which framework and version is this" is free reconnaissance and buys us
  // nothing in return.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
