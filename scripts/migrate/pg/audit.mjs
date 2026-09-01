// THE CATALOGUE'S BLIND SPOT, MADE LOUD. export.mjs, load.mjs and verify.mjs
// all walk SECTION_COLLECTIONS — the explicit, hand-maintained map of which
// collections belong to which section key. Anything a studio's Redis keys
// actually hold OUTSIDE that map is invisible to all three by construction:
// `SECTION_COLLECTIONS[section.key] || []` cannot report what it was never
// told to look for. Fix round 1 (reviewer) proved this concretely: a row
// planted in `salesServices` — a collection keys.ts's own comment records as
// DELIBERATELY REMOVED from the map, and which "may still hold rows in
// studios created before the removal" — survived export, load and verify
// with a reported "0 mismatched" and the row silently left behind in Redis.
// A migration that reports perfect while silently dropping data is the worst
// outcome this task can produce, because every checkpoint looks green.
//
// THIS IS A SCAN, AND THAT LOOKS LIKE THE THING export.mjs'S OWN HEADER
// REJECTS ("enumerate by the explicit SECTION_COLLECTIONS catalogue, never a
// prefix scan") — but it is the OPPOSITE use. That rule is about using a scan
// to CHOOSE WHAT TO READ AND MIGRATE, which is wrong because "found by SCAN"
// only proves which backend is live, not that a collection is empty (or that
// its absence from the catalogue was ever a deliberate decision). This scan
// asks a narrower, purely NEGATIVE question — "does anything exist under
// this one section's own prefix that the catalogue does not name?" — and
// only ever REPORTS the answer. It never reads a row's contents, never
// selects what to migrate, and never writes anything. It is bounded to one
// section's own prefix (SEC.prefix(studioId, sectionId) — never an empty or
// top-level prefix) and goes through scanPrefix's own assertScopedPrefix
// guard exactly like every other scoped read in this codebase. Invariant
// 17's hazard is a broad-prefix DELETE; this issues neither a delete nor a
// broad prefix.
//
// TWO BLIND SPOTS ARE CLOSED HERE:
//   1. A CATALOGUED section holding an UNCATALOGUED collection — the
//      salesServices case above. keys.ts names `departments` and `positions`
//      as the same class of risk.
//   2. A section whose KEY is not in ALL_SECTION_KEYS at all —
//      SECTION_COLLECTIONS[section.key] is then undefined for every
//      collection under it, the identical silent gap through a different
//      door: appendSection can mint an arbitrary key (nothing in this
//      codebase currently calls it, but nothing stops it either), and the
//      P0 restructure (restructure-sections.mjs) can leave a stale key
//      behind if a rename map ever misses one.
//
// A THIRD BLIND SPOT — REGISTRY DRIFT — IS NAMED BUT NOT CLOSED HERE.
// listStudios() reads g:studios once, and studios.ts's own comment (on
// listUserCollaborations, where an id in the ix:collab back-pointer set can
// have no matching g:studios row — "drift the sweeper cleans, not something
// a caller has to handle") acknowledges that a derived index and the
// registry can disagree. The equivalent risk here would be a studio whose
// real keys (s:<id>:sections and beyond) exist with no g:studios row at all,
// which this function's caller — listStudios() — would never surface a
// studio for in the first place, so this pass never even gets a chance to
// scan it. Closing THAT would mean a top-level scan for s:<id>:* prefixes and
// cross-checking against g:studios — a different, broader operation than
// scanning one already-known studio's one already-known section, and a
// genuinely separate finding from the two above. Left alone deliberately
// rather than smuggled in here as a third, weaker check — recorded so it is
// not "found" a second time by someone auditing registry integrity later.
import { SEC, ALL_SECTION_KEYS, SECTION_COLLECTIONS } from "@/platform/db/keys";
import { scanPrefix } from "@/platform/db/store";

const COLLECTION_KEY_RE = /:c:([^:]+)$/;

/**
 * Audits every section of ONE studio against the catalogue. `sections` is
 * whatever `listSections(studioId)` returned — passed in rather than
 * re-fetched, so a caller already holding it (export.mjs, verify.mjs) pays no
 * extra round trip for that half.
 *
 * Returns an array of findings, empty when this studio's Redis keys hold
 * nothing the catalogue doesn't already know about.
 */
export async function auditStudioSections(studioId, sections) {
  const findings = [];
  for (const section of sections) {
    if (!ALL_SECTION_KEYS.includes(section.key)) {
      findings.push({
        kind: "unknown-section-key", studioId, sectionId: section.id, sectionKey: section.key,
      });
      // Falls through to the scan below anyway — an unrecognised key can
      // still hold real collections, and naming them is strictly more useful
      // than stopping at the key.
    }
    const declared = new Set(SECTION_COLLECTIONS[section.key] || []);
    const keys = await scanPrefix(SEC.prefix(studioId, section.id));
    const present = new Set();
    for (const k of keys) {
      const m = COLLECTION_KEY_RE.exec(k);
      if (m) present.add(m[1]);
    }
    for (const name of present) {
      if (!declared.has(name)) {
        findings.push({
          kind: "uncatalogued-collection", studioId, sectionId: section.id, sectionKey: section.key, collection: name,
        });
      }
    }
  }
  return findings;
}

/**
 * Prints every finding, loudly, and returns true iff there were none. Used
 * identically by export.mjs and verify.mjs so the two can never again drift
 * apart on what "complete" means.
 */
export function reportAudit(findings) {
  if (!findings.length) return true;
  console.error(`\n!!! AUDIT: ${findings.length} thing(s) the catalogue does not name !!!`);
  for (const f of findings) {
    if (f.kind === "unknown-section-key") {
      console.error(
        `  studio=${f.studioId} section=${f.sectionId} key="${f.sectionKey}" is NOT in ALL_SECTION_KEYS (keys.ts)`,
      );
    } else {
      console.error(
        `  studio=${f.studioId} section=${f.sectionId} key="${f.sectionKey}" collection="${f.collection}" ` +
          "is NOT in SECTION_COLLECTIONS (keys.ts)",
      );
    }
  }
  console.error(
    "These rows exist in Redis right now and will be SILENTLY LEFT BEHIND by this migration " +
      "unless SECTION_COLLECTIONS or ALL_SECTION_KEYS is corrected to name them, or --allow-incomplete " +
      "is passed to proceed with this run treated as a known, acknowledged gap.\n",
  );
  return false;
}
