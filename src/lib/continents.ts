// Country code to continent.
//
// The edge already tells us which country a request came from
// (`x-vercel-ip-country`, a two-letter ISO code). A CONTINENT is all the
// dashboard shows, and it is the coarser, less identifying answer — so the
// country is mapped here at ingest and thrown away, and only the continent is
// ever stored.
//
// Codes are grouped as strings purely to keep the table readable; the lookup is
// built once below.

const GROUPS = {
  Africa: "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  Asia: "AE AF AM AZ BD BH BN BT CC CN CX CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE",
  Europe: "AD AL AT AX BA BE BG BY CH CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK",
  "North America": "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  "South America": "AR BO BR CL CO EC FK GF GY PE PY SR UY VE",
  Oceania: "AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
  Antarctica: "AQ BV GS HM TF",
};

// The five the dashboard shows as columns. Everything else — Antarctica, and
// any code the table does not know — falls into Others, so the four bars always
// add up to the total rather than quietly dropping traffic.
export const CONTINENTS = ["Europe", "Asia", "North America", "Africa", "South America", "Oceania", "Others"];

const BY_COUNTRY = new Map();
for (const [continent, codes] of Object.entries(GROUPS)) {
  for (const code of codes.split(" ")) BY_COUNTRY.set(code, continent);
}

// Unknown or missing codes come back as "Others" rather than null: a visit from
// somewhere unrecognised is still a visit, and losing it would make the columns
// disagree with the page-view total.
export function continentOf(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!code || code.length !== 2) return "Others";
  const found = BY_COUNTRY.get(code);
  // Always a member of CONTINENTS. Antarctica is in the table because the codes
  // exist, but it is not a column — returning it here would hand callers a name
  // that has no key and no bar.
  return found && CONTINENTS.includes(found) ? found : "Others";
}

// A short, storage-safe key per continent — these become hash fields, so they
// must not carry spaces.
export const CONTINENT_KEYS = {
  Europe: "eu", Asia: "as", "North America": "na", Africa: "af",
  "South America": "sa", Oceania: "oc", Others: "other",
};
export const CONTINENT_BY_KEY = Object.fromEntries(
  Object.entries(CONTINENT_KEYS).map(([name, key]) => [key, name]),
);
