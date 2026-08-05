// CargoAi Track & Trace adapter (server-only). Pull an AWB's status and
// normalise it into our canonical milestone events.
//
// CONFIG (Vercel env vars — set by the account owner, never committed):
//   CARGOAI_API_KEY   required — enables the provider.
//   CARGOAI_API_BASE  optional — override the API base URL.
//
// NOTE ON THE CONTRACT: CargoAi's exact endpoint path and JSON field names come
// with the developer account. The request/response mapping below targets the
// standard air-cargo (Cargo-IMP) event shape and is intentionally isolated in
// `normalize()` so it can be confirmed/adjusted against a real response in one
// place once the key is live. Until CARGOAI_API_KEY is set, the provider is
// inactive and `isConfigured()` returns false.

const API_BASE = process.env.CARGOAI_API_BASE || "https://api.cargoai.co";

export function isConfigured() {
  return !!process.env.CARGOAI_API_KEY;
}

// Map a provider status code to our canonical milestone code. CargoAi surfaces
// standard Cargo-IMP codes (RCS/DEP/ARR/RCF/NFD/DLV…), which are already our
// codes — pass through, upper-cased. Unknown codes are kept as-is so nothing is
// dropped (they simply won't have a friendly label).
function mapCode(code) {
  return String(code || "").trim().toUpperCase();
}

// Normalise a CargoAi tracking payload → our shipment shape.
// { status, origin, destination, pieces, weight, events:[{code,station,flightNo,pieces,weight,at}] }
// The field paths here are the part to confirm against a live response.
function normalize(payload) {
  const p = payload || {};
  const rawEvents = Array.isArray(p.events) ? p.events
    : Array.isArray(p.milestones) ? p.milestones
    : Array.isArray(p.statusHistory) ? p.statusHistory
    : [];
  const events = rawEvents.map((e) => ({
    code: mapCode(e.statusCode || e.code || e.status),
    station: String(e.station || e.airport || e.location || "").toUpperCase(),
    flightNo: String(e.flightNumber || e.flight || e.flightNo || "").toUpperCase(),
    pieces: e.pieces == null ? null : Number(e.pieces),
    weight: e.weight == null ? null : Number(e.weight),
    at: e.eventDate || e.datetime || e.timestamp || e.date || "",
  })).filter((e) => e.code);
  return {
    origin: String(p.origin || p.departureStation || "").toUpperCase(),
    destination: String(p.destination || p.arrivalStation || "").toUpperCase(),
    pieces: p.pieces == null ? null : Number(p.pieces),
    weight: p.weight == null ? null : Number(p.weight),
    events,
  };
}

// Fetch + normalise the status for one AWB. Throws on config/HTTP errors so the
// caller can surface a clear message.
export async function fetchStatus({ prefix, serial }) {
  if (!isConfigured()) throw new Error("CargoAi is not configured (set CARGOAI_API_KEY).");
  const url = `${API_BASE}/tracking/awb/${prefix}-${serial}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.CARGOAI_API_KEY}`, Accept: "application/json" },
    // Never cache live tracking.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CargoAi ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
  return normalize(await res.json().catch(() => ({})));
}
