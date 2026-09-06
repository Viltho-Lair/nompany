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
    return Buffer.byteLength(json, "utf8") <= RSC_PAYLOAD_CEILING_BYTES;
  } catch {
    return false;
  }
}
