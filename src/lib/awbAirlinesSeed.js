// Seed registry of airline AWB prefixes — client-safe (no imports).
//
// Each row: { prefix (3-digit string), name, iata (2-letter, "" if none) }.
// The live registry lives in the `awbAirlines` Redis collection and is
// admin-editable (add/edit prefixes, tracking URLs, flags). This array is only
// the first-run seed + a fallback for prefix→airline lookup. Gulf carriers
// (Saudia, Emirates, Qatar, Etihad, Gulf Air, Oman Air, Turkish, Royal
// Jordanian) matter most for MegaTech and are all included.
//
// Compiled from the IATA airline-prefix directory. `trackUrlTemplate` (Tier-1
// deep link) is filled per-airline in a later segment; tokens {AWB} {PREFIX}
// {SERIAL} are substituted at click time.
export const AWB_AIRLINES_SEED = [
  { prefix: "001", name: "American Airlines Cargo", iata: "AA" },
  { prefix: "003", name: "CMA CGM Air Cargo", iata: "" },
  { prefix: "006", name: "Delta Cargo", iata: "DL" },
  { prefix: "014", name: "Air Canada Cargo", iata: "AC" },
  { prefix: "016", name: "United Cargo", iata: "UA" },
  { prefix: "020", name: "Lufthansa Cargo", iata: "LH" },
  { prefix: "023", name: "FedEx", iata: "FX" },
  { prefix: "027", name: "Alaska Air Cargo", iata: "AS" },
  { prefix: "045", name: "LATAM Cargo", iata: "LA" },
  { prefix: "047", name: "TAP Air Cargo", iata: "TP" },
  { prefix: "055", name: "ITA Airways Cargo", iata: "AZ" },
  { prefix: "057", name: "Air France-KLM Cargo", iata: "AF" },
  { prefix: "065", name: "Saudia Cargo", iata: "SV" },
  { prefix: "071", name: "Ethiopian Cargo", iata: "ET" },
  { prefix: "072", name: "Gulf Air", iata: "GF" },
  { prefix: "074", name: "KLM Cargo", iata: "KL" },
  { prefix: "075", name: "British Airways / IAG Cargo", iata: "BA" },
  { prefix: "077", name: "EgyptAir Cargo", iata: "MS" },
  { prefix: "079", name: "Philippine Airlines Cargo", iata: "PR" },
  { prefix: "081", name: "Qantas Freight", iata: "QF" },
  { prefix: "083", name: "South African Airways Cargo", iata: "SA" },
  { prefix: "086", name: "Air New Zealand Cargo", iata: "NZ" },
  { prefix: "098", name: "Air India Cargo", iata: "AI" },
  { prefix: "105", name: "Finnair Cargo", iata: "AY" },
  { prefix: "112", name: "China Cargo Airlines", iata: "" },
  { prefix: "114", name: "El Al Cargo", iata: "LY" },
  { prefix: "117", name: "SAS Cargo", iata: "SK" },
  { prefix: "125", name: "IAG Cargo", iata: "" },
  { prefix: "126", name: "Garuda Indonesia Cargo", iata: "GA" },
  { prefix: "131", name: "Japan Airlines Cargo", iata: "JL" },
  { prefix: "132", name: "Aeromexico Cargo", iata: "AM" },
  { prefix: "134", name: "Avianca Cargo", iata: "AV" },
  { prefix: "139", name: "Cargojet Airways", iata: "" },
  { prefix: "145", name: "LOT Polish Cargo", iata: "LO" },
  { prefix: "147", name: "Royal Air Maroc Cargo", iata: "AT" },
  { prefix: "155", name: "DHL Aviation", iata: "" },
  { prefix: "157", name: "Qatar Airways Cargo", iata: "QR" },
  { prefix: "160", name: "Cathay Cargo", iata: "CX" },
  { prefix: "172", name: "Cargolux", iata: "CV" },
  { prefix: "173", name: "Hawaiian Airlines Cargo", iata: "HA" },
  { prefix: "176", name: "Emirates SkyCargo", iata: "EK" },
  { prefix: "180", name: "Korean Air Cargo", iata: "KE" },
  { prefix: "205", name: "ANA Cargo", iata: "NH" },
  { prefix: "214", name: "Pakistan International (PIA)", iata: "PK" },
  { prefix: "217", name: "Thai Airways Cargo", iata: "TG" },
  { prefix: "230", name: "Copa Airlines Cargo", iata: "CM" },
  { prefix: "232", name: "MASkargo", iata: "MH" },
  { prefix: "235", name: "Turkish Cargo", iata: "TK" },
  { prefix: "250", name: "Hainan Airlines Cargo", iata: "HU" },
  { prefix: "279", name: "Kuwait Airways Cargo", iata: "KU" },
  { prefix: "297", name: "China Airlines Cargo", iata: "CI" },
  { prefix: "298", name: "Middle East Airlines Cargo", iata: "ME" },
  { prefix: "312", name: "IndiGo CarGo", iata: "6E" },
  { prefix: "369", name: "Atlas Air", iata: "5Y" },
  { prefix: "403", name: "Polar Air Cargo", iata: "PO" },
  { prefix: "406", name: "UPS Airlines", iata: "5X" },
  { prefix: "421", name: "Air Astana Cargo", iata: "KC" },
  { prefix: "434", name: "Azul Cargo", iata: "AD" },
  { prefix: "465", name: "Icelandair Cargo", iata: "FI" },
  { prefix: "512", name: "Royal Jordanian", iata: "RJ" },
  { prefix: "543", name: "Vietjet Air Cargo", iata: "VJ" },
  { prefix: "555", name: "Aeroflot Cargo", iata: "SU" },
  { prefix: "580", name: "AirBridgeCargo", iata: "RU" },
  { prefix: "589", name: "Bangkok Airways", iata: "PG" },
  { prefix: "603", name: "SriLankan Cargo", iata: "UL" },
  { prefix: "607", name: "Etihad Cargo", iata: "EY" },
  { prefix: "615", name: "DHL Aero Expreso", iata: "D5" },
  { prefix: "618", name: "Singapore Airlines Cargo", iata: "SQ" },
  { prefix: "623", name: "Flydubai Cargo", iata: "FZ" },
  { prefix: "672", name: "Royal Brunei Cargo", iata: "BI" },
  { prefix: "695", name: "EVA Air Cargo", iata: "BR" },
  { prefix: "706", name: "Kenya Airways Cargo", iata: "KQ" },
  { prefix: "724", name: "Swiss WorldCargo", iata: "LX" },
  { prefix: "728", name: "Air Arabia", iata: "G9" },
  { prefix: "732", name: "Virgin Atlantic Cargo", iata: "VS" },
  { prefix: "738", name: "Vietnam Airlines Cargo", iata: "VN" },
  { prefix: "745", name: "Nippon Cargo Airlines", iata: "KZ" },
  { prefix: "781", name: "China Eastern Cargo", iata: "MU" },
  { prefix: "784", name: "China Southern Cargo", iata: "CZ" },
  { prefix: "807", name: "Uzbekistan Airways Cargo", iata: "HY" },
  { prefix: "880", name: "Hainan Airlines Cargo", iata: "HU" },
  { prefix: "910", name: "Oman Air", iata: "WY" },
  { prefix: "932", name: "Vietnam Airlines", iata: "VN" },
  { prefix: "933", name: "Nippon Cargo Airlines", iata: "KZ" },
  { prefix: "976", name: "LATAM Cargo Colombia", iata: "" },
  { prefix: "988", name: "Asiana Airlines Cargo", iata: "OZ" },
  { prefix: "996", name: "Air Europa Cargo", iata: "UX" },
  { prefix: "999", name: "Air China Cargo", iata: "CA" },
];

// Look up an airline row for a 3-digit prefix in a registry array (defaults to
// the seed). Returns the row or null.
export function findAirlineByPrefix(prefix, airlines) {
  const p = String(prefix || "").replace(/\D/g, "").slice(0, 3);
  const list = Array.isArray(airlines) ? airlines : AWB_AIRLINES_SEED;
  return list.find((a) => a.prefix === p) || null;
}

// Built-in Tier-1 tracking URLs (prefix → template) — the airline's own official
// cargo-tracking page (verified domains). Used as a fallback when the registry
// row has no `trackUrlTemplate`, so known carriers deep-link out of the box even
// before an admin curates exact query-param links. Tokens (substituted at click
// time): {AWB} = 176-12345675 · {AWBRAW} = 17612345675 · {PREFIX} = 176 ·
// {SERIAL} = 1234567 · {SERIALCHECK} = 12345675. A template with no token just
// opens the carrier's tracking landing page (user pastes the AWB).
export const AWB_TRACK_TEMPLATES = {
  "065": "https://www.saudiacargo.com/en/digital-services?tab=trackShipment", // Saudia Cargo
  "157": "https://www.qrcargo.com/s/track-your-shipment",                     // Qatar Airways Cargo
  "176": "https://www.skycargo.com/",                                         // Emirates SkyCargo
  "607": "https://www.etihadcargo.com/",                                      // Etihad Cargo
  "235": "https://www.turkishcargo.com/en/cargo-tracking",                    // Turkish Cargo
  "020": "https://lufthansa-cargo.com/",                                      // Lufthansa Cargo
  "057": "https://www.afklcargo.com/",                                        // Air France-KLM Cargo
  "074": "https://www.afklcargo.com/",                                        // KLM Cargo
  "075": "https://www.iagcargo.com/",                                         // British Airways / IAG
  "125": "https://www.iagcargo.com/",                                         // IAG Cargo
  "160": "https://www.cathaycargo.com/",                                      // Cathay Cargo
  "172": "https://www.cargolux.com/",                                         // Cargolux
  "180": "https://cargo.koreanair.com/",                                      // Korean Air Cargo
  "618": "https://www.siacargo.com/",                                         // Singapore Airlines Cargo
  "023": "https://www.fedex.com/",                                            // FedEx
  "406": "https://www.ups.com/",                                              // UPS
};

// Resolve the URL to open for an AWB. Order: the registry row's own
// `trackUrlTemplate` (admin-curated) → the built-in template → a web-search
// fallback (always resolves, lands on the right carrier). `parsed` is the object
// from parseAwb(). Returns { url, direct } where direct=false means the fallback.
export function resolveTrackUrl(airline, parsed) {
  const tmpl = (airline && airline.trackUrlTemplate) || AWB_TRACK_TEMPLATES[parsed?.prefix] || "";
  if (!tmpl) {
    const name = airline?.name || "air cargo";
    const q = encodeURIComponent(`${parsed?.formatted || parsed?.digits || ""} ${name} tracking`);
    return { url: `https://www.google.com/search?q=${q}`, direct: false };
  }
  const url = tmpl
    .split("{AWBRAW}").join(parsed?.digits || "")
    .split("{AWB}").join(parsed?.formatted || "")
    .split("{PREFIX}").join(parsed?.prefix || "")
    .split("{SERIALCHECK}").join((parsed?.serial || "") + (parsed?.check ?? ""))
    .split("{SERIAL}").join(parsed?.serial || "");
  return { url, direct: true };
}
