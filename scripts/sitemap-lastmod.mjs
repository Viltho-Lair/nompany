#!/usr/bin/env node
// RECOMPUTE THE SITEMAP'S lastmod FROM PAGE CONTENT.
//
//   node scripts/sitemap-lastmod.mjs           check (exit 1 when stale)
//   node scripts/sitemap-lastmod.mjs --write   update the committed answer
//
// The date a page last changed is the date its SOURCES last changed, and the
// only reliable witness to that is a hash of them. This holds the hash beside
// the date: when the hash moves, the date becomes today; when it does not, the
// date is left exactly where it was, however many times this runs.
//
// THE DATE ONLY EVER MOVES FORWARD WHEN THE CONTENT DID, which is what makes it
// a signal rather than noise. A `lastmod` a crawler catches being wrong is
// discounted, and for an ordinary page it is the only general freshness signal
// there is — so spending it on a guess costs the one thing the sitemap provides.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SITEMAP_SOURCES } from "../src/shared/marketing/sitemapSources.ts";

const OUT = "src/app/sitemap-lastmod.json";

export function hashesForTree() {
  const out = {};
  for (const [path, files] of Object.entries(SITEMAP_SOURCES)) {
    const h = createHash("sha256");
    for (const f of files) {
      if (!existsSync(f)) throw new Error(`${path}: source file is missing: ${f}`);
      // The PATH goes into the hash as well as the bytes, so renaming a source
      // file counts as a change — it usually is one, and a rename that changes
      // nothing costs a single re-crawl.
      h.update(f).update("\0").update(readFileSync(f));
    }
    out[path] = h.digest("hex").slice(0, 16);
  }
  return out;
}

export function readCommitted() {
  return existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
}

/** What the committed file should hold, given the tree and today's date. */
export function reconcile(committed, hashes, today) {
  const next = {};
  for (const [path, hash] of Object.entries(hashes)) {
    const prev = committed[path];
    next[path] = prev && prev.hash === hash ? prev : { hash, date: today };
  }
  return next;
}

export function staleEntries(committed, hashes) {
  return Object.entries(hashes)
    .filter(([path, hash]) => !committed[path] || committed[path].hash !== hash)
    .map(([path]) => path);
}

// Not run when imported by the test, which asserts `reconcile` directly.
if (process.argv[1] && process.argv[1].endsWith("sitemap-lastmod.mjs")) {
  const hashes = hashesForTree();
  const committed = readCommitted();
  const stale = staleEntries(committed, hashes);

  if (process.argv.includes("--write")) {
    const today = new Date().toISOString().slice(0, 10);
    writeFileSync(OUT, JSON.stringify(reconcile(committed, hashes, today), null, 2) + "\n");
    console.log(stale.length
      ? `sitemap lastmod: updated ${stale.length} — ${stale.map((p) => p || "/").join(", ")}`
      : "sitemap lastmod: already current, nothing changed");
  } else if (stale.length) {
    console.error(
      `sitemap lastmod is STALE for: ${stale.map((p) => p || "/").join(", ")}\n` +
      "The page content changed and the sitemap still advertises the old date.\n" +
      "Run: node scripts/sitemap-lastmod.mjs --write");
    process.exit(1);
  } else {
    console.log("sitemap lastmod: current");
  }
}
