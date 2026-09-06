// HOW BIG A SERVER-RENDERED FIRST PAYLOAD IS ALLOWED TO BE.
//
// A screen whose first payload is rendered on the server costs one HTTP request
// fewer: the page composes it and hands it down, instead of the browser mounting
// an empty screen and fetching a route that re-resolves the user, the studio,
// the collaborator, the roles and the sections from scratch. That saving is one
// round trip. The price is bytes on the RSC stream.
//
// DERIVED, NOT PICKED. One round trip to Frankfurt is ~75ms, and that is
// conservative because it ignores the dependent waves the API request makes on
// top of it. At a deliberately pessimistic 5 Mbps effective downlink, 75ms
// carries ~47 KB. Below this the bytes are cheaper than the trip; above it they
// are not. RE-DERIVE IT IF THE FUNCTION REGION MOVES — the whole argument is
// what a round trip costs, and that is a distance.
//
// AND IT IS CHECKED AT REQUEST TIME, not at build time, because the size depends
// on the tenant's data. scripts/bundle-budget.mjs measures CLIENT JS and cannot
// see the RSC stream at all, so without this a screen that renders a 500-row
// list regresses the wire invisibly — no gate would fail and nobody would know.
export const RSC_PAYLOAD_CEILING_BYTES = 49_152; // 48 KiB

// `TextEncoder`, NOT `Buffer.byteLength`, AND THE DIFFERENCE IS A REAL BUG.
//
// This file lives in src/shared, which this repo defines as pure values with no
// dependants — the folder a CLIENT component may safely import from. `Buffer` is
// Node-only, so the first client component to import this would throw
// `Buffer is not defined` in the browser, and NEITHER `tsc` NOR `next build`
// would say a word: the types resolve because @types/node is installed, and the
// build has no idea which runtime the importer ends up in. It is the same class
// as a `.jsx` reading an unbound `tr` — a runtime ReferenceError that every
// static gate waves through.
//
// TextEncoder is on both runtimes and gives the identical UTF-8 byte count.
// Constructed once: it is stateless, and building one per call on a list read is
// waste on the exact path this file exists to make cheap.
const UTF8 = new TextEncoder();

/**
 * Whether `value` is small enough to hand down as a server-rendered payload.
 *
 * BYTES, NOT CHARACTERS. `String.length` counts UTF-16 code units, so an Arabic
 * tenant's rows — which this studio has by design, not by accident — would
 * measure at roughly half of what actually crosses the wire.
 *
 * INCLUSIVE, so the constant names the largest payload allowed rather than the
 * smallest refused. A payload that cannot be serialised at all is not a payload
 * and does not fit; answering `false` rather than throwing is what lets the
 * caller fall back to fetch-on-mount instead of taking the screen down over a
 * size check.
 */
export function fitsInRscPayload(value: unknown): boolean {
  try {
    const json = JSON.stringify(value);
    // `undefined` stringifies to `undefined` rather than to text — the one case
    // that neither throws nor yields a string. A page that composed nothing must
    // fall back, not hand the screen a payload that is not one.
    if (typeof json !== "string") return false;
    return UTF8.encode(json).length <= RSC_PAYLOAD_CEILING_BYTES;
  } catch {
    return false;
  }
}
