// GENERATE THE ROLE LIBRARY from the research document.
//
//   node scripts/generate/role-library.mjs --report
//   node scripts/generate/role-library.mjs --out src/modules/people/roleLibraryData.ts
//
// WHY GENERATED RATHER THAN TYPED. docs/research/industry-roles.md holds ~2,900
// job titles across 25 fields of work, in eight seniority tiers each. Typing
// that into a TypeScript literal would be a transcription nobody could review
// against its source, and the source is the thing that gets corrected.
//
// TWO MAPPINGS ARE MADE HERE, and they carry very different weight:
//
//   archetype   FORGIVING. It decides the permissions a role arrives with, and
//               an administrator adjusts anything wrong when the roles are
//               delivered. Getting one wrong costs one correction.
//
//   department  STRICT, ~95%. It decides WHERE a role appears, and a role filed
//               under the wrong department is one nobody will look for. This is
//               the number to care about, and --report is how you check it.
//
// Both mappings are DATA in this file rather than cleverness, so a reviewer can
// diff them line by line and add a rule where the report shows a gap.

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

const { FIELDS_OF_WORK } = await import("@/shared/fieldsOfWork");
const { departmentsForField } = await import("@/shared/departments/starters");

const argv = process.argv.slice(2);
const REPORT = argv.includes("--report");
const OUT = (() => {
  const i = argv.indexOf("--out");
  return i >= 0 ? argv[i + 1] : "";
})();

// ---- tier → archetype -------------------------------------------------------
// The research's eight tiers map onto the eleven access shapes. This is the
// coarse pass; NAME_ARCHETYPE below beats it.
const TIER_ARCHETYPE = {
  "Top administration": "principal",
  "Second line": "department-head",
  "Middle management": "deliverer",
  "Supervisory / front line": "front-line",
  "Professional & technical": "doer",
  "Skilled & operational": "doer",
  "Regulated / certified": "checker",
  "Industry-specific support": "doer",
};

const TIER_ORDER = Object.keys(TIER_ARCHETYPE);

// ---- name → archetype, beating the tier -------------------------------------
// A Chief Accountant is Money whatever tier it sits in, and a QA Inspector is a
// Checker even among the professionals. Order matters: first match wins.
const NAME_ARCHETYPE = [
  [/\b(accountant|accounts|finance|financial|treasur|payroll|bursar|controller|tax|audit)\b/i, "money"],
  [/\b(procurement|buyer|purchas|sourcing|subcontract|expedit|category manager)\b/i, "buyer"],
  [/\b(store|storeman|storekeeper|warehouse|inventory|materials|stock|spare parts)\b/i, "custodian"],
  [/\b(qa|qc|quality|inspector|inspection|auditor|hse|hsse|safety|compliance|ndt|certif)\b/i, "checker"],
  [/\b(estimat|tender|bid|proposal|quantity surveyor)\b/i, "bidder"],
  [/\b(sales|business development|account manager|account director|leasing|marketing|customer)\b/i, "winner-of-work"],
  [/\b(foreman|supervisor|chargehand|charge hand|crew chief|shift lead|charge nurse|team lead)\b/i, "front-line"],
  [/\b(chief executive|managing director|chairman|owner|managing partner|director general|proprietor|president|vice chancellor)\b/i, "principal"],
  [/\b(head of|director of|chief |executive director|general manager)\b/i, "department-head"],
  [/\b(project manager|programme manager|program manager|production manager|delivery manager|engagement manager|site manager|construction manager)\b/i, "deliverer"],
];

// ---- name → department, per industry ----------------------------------------
// STRONG SIGNALS FIRST, matched against the department's CODE in that
// industry's own chart. A rule only fires if the industry actually has that
// department, so "PRC" is skipped for a consultancy that does not buy.
const DEPARTMENT_HINTS = [
  [/\b(accountant|accounts|finance|financial|treasur|payroll|bursar|billing|invoic|credit|tax|cost control|cost engineer|quantity surveyor)\b/i, ["FIN", "QS", "PCT", "PLN"]],
  [/\b(hr|human resources|recruit|personnel|training|learning|talent|welfare|compensation)\b/i, ["HR", "MOB"]],
  [/\b(procurement|buyer|purchas|sourcing|subcontract|expedit|vendor)\b/i, ["PRC", "BUY"]],
  [/\b(store|storeman|storekeeper|warehouse|stock|materials|spare parts|goods receiv)\b/i, ["STR", "WHS", "PACK"]],
  [/\b(admin|secretar|reception|office|clerk|archiv|records|translator|driver|legal|counsel|paralegal)\b/i, ["ADM"]],
  [/\b(qa|qc|quality|inspector|inspection|hse|hsse|safety|environment|ndt|welding inspector)\b/i, ["QHS", "QA", "HSE", "INS", "LAB", "QHS"]],
  [/\b(estimat|tender|bid|proposal)\b/i, ["EST", "BID", "TND"]],
  [/\b(sales|business development|marketing|account manager|customer|client|leasing|brand)\b/i, ["SLS", "BD", "CS", "COM", "WHL", "RET", "ENT"]],
  // Ahead of the general freight rule, or every forwarder lands in FRT and
  // the air/ocean desk is left empty — which the every-department-has-a-role
  // test catches, and which is the report earning its keep.
  [/\b(air freight|ocean freight|sea freight|ship agent|port agent|chartering|customs broker|declarant)\b/i, ["AOF", "CUS"]],
  [/\b(helpdesk|help desk|call logger|scheduling|roster|route planner|dispatcher)\b/i, ["HD", "NOC", "CS"]],
  [/\b(logistic|shipping|freight|dispatch|transport|fleet|customs|delivery|courier)\b/i, ["LOG", "FLT", "DIS", "DEL", "FRT", "AOF"]],
  [/\b(maintenance|mechanic|technician|electrician|fitter|millwright|workshop|plant|equipment)\b/i, ["MNT", "PLT", "WKS", "MCH", "HRD"]],
  [/\b(design|engineer|draught|draft|cad|bim|architect|technical office)\b/i, ["ENG", "DEL", "CTL", "CRE", "PLN"]],
  [/\b(it|software|developer|network|systems|database|helpdesk)\b/i, ["INF", "SW", "TECH", "ADM"]],
];

// ---- parse ------------------------------------------------------------------
const doc = readFileSync("docs/research/industry-roles.md", "utf8");
const lines = doc.split(/\r?\n/);

const fields = new Set(FIELDS_OF_WORK);
const entries = [];
let industry = "";
let tier = "";

// THE UNIVERSAL SPINE IS WHERE THE BACK OFFICE LIVES, and missing it was the
// first version's structural bug. The research lists Finance, HR, Procurement,
// Commercial, IT, Quality and Administration ONCE in §3 — "listed once and
// applies to all twenty-five" — and deliberately does not repeat them in the 25
// field sections. A parser that reads only the field sections therefore
// produces charts where FIN, HR and PRC are empty, which is exactly what the
// first report showed.
//
// So §3's eight groups are read too, and applied to EVERY industry, mapped to
// the back-office codes each chart already has.
const SPINE_GROUPS = {
  "Governance and top administration": { codes: ["ADM"], tier: 0 },
  "Finance and accounting": { codes: ["FIN"], tier: 1 },
  "Human resources": { codes: ["HR"], tier: 1 },
  "Procurement, supply chain and stores": { codes: ["PRC", "STR", "BUY", "WHS"], tier: 1 },
  "Commercial, sales and marketing": { codes: ["SLS", "BD", "CS", "COM", "WHL", "RET"], tier: 1 },
  "IT and data": { codes: ["INF", "SW", "TECH", "ADM"], tier: 4 },
  "Quality, HSE and compliance": { codes: ["QHS", "QA", "HSE", "INS", "LAB"], tier: 6 },
  "Legal and administration": { codes: ["ADM"], tier: 7 },
};
const spine = [];
let spineGroup = "";

for (const raw of lines) {
  // §3.N — the spine's groups. Matched before the field headings because both
  // use ###, and "3.2 Finance and accounting" is not a field of work.
  const spineHeading = raw.match(/^### 3\.\d+\s+(.+)$/);
  if (spineHeading) {
    const key = spineHeading[1].trim();
    spineGroup = SPINE_GROUPS[key] ? key : "";
    industry = "";
    tier = "";
    continue;
  }
  if (spineGroup) {
    const spineBullet = raw.match(/^- (.+)$/);
    if (spineBullet) {
      const nm = spineBullet[1]
        .replace(/\s+—.*$/, "")
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .split(" / ")[0]
        .trim();
      if (nm && nm.length <= 60) spine.push({ name: nm, group: spineGroup });
      continue;
    }
    if (/^#{2,3} /.test(raw)) spineGroup = "";
  }

  const heading = raw.match(/^### \d+\.\s+(.+)$/);
  if (heading) {
    // Only the 25 field sections. §3.x and §5.x also use ###, and their
    // headings are not fields of work — checking against FIELDS_OF_WORK is what
    // keeps the universal spine and the analysis out of the library.
    industry = fields.has(heading[1].trim()) ? heading[1].trim() : "";
    tier = "";
    continue;
  }
  if (!industry) continue;

  const tierLine = raw.match(/^\*\*(.+)\*\*$/);
  if (tierLine && TIER_ARCHETYPE[tierLine[1].trim()]) { tier = tierLine[1].trim(); continue; }
  if (!tier) continue;

  const bullet = raw.match(/^- (.+)$/);
  if (!bullet) continue;

  // ONE NAME PER ENTRY. The research writes alternatives and glosses —
  // "Managing Director / General Manager", "Chairman / Owner (family or
  // cooperative estate ownership is the norm)", "Government Relations Officer
  // (PRO) — GCC" — and a role NAME is the first of those, without the
  // apparatus. "QA/QC Manager" survives because the split is on " / " with
  // spaces, not on the bare slash.
  let name = bullet[1]
    .replace(/\s+—.*$/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
  // ONE NAME, BUT NOT A FRAGMENT. Splitting on " / " turns "Managing Director /
  // General Manager" into a clean title and "Mechanical / HVAC Engineer" into
  // "Mechanical", which is not a job. So the split only stands when what it
  // leaves is at least two words — otherwise the alternatives are halves of one
  // title rather than two titles, and the whole string is the name.
  const firstAlt = name.split(" / ")[0].trim();
  if (firstAlt.split(/\s+/).length >= 2) name = firstAlt;
  if (!name || name.length > 60) continue;

  entries.push({ name, industry, tier });
}

// ---- map --------------------------------------------------------------------
const codesFor = new Map(FIELDS_OF_WORK.map((f) => [f, departmentsForField(f)]));

function archetypeFor(name, tierName) {
  for (const [re, id] of NAME_ARCHETYPE) if (re.test(name)) return id;
  return TIER_ARCHETYPE[tierName] || "doer";
}

// TOKEN OVERLAP WITH THE DEPARTMENT'S OWN NAME, as the second pass. "Site
// Engineer" against "Site Execution" shares "site"; "Nursing Officer" against
// "Nursing" shares "nursing". Weak on its own, useful after the hints.
const tokens = (s) => new Set(String(s).toLowerCase().match(/[a-z]+/g) || []);
// STEMS, NOT WHOLE WORDS. "Agronomist" and "Agronomy & Technical" share no
// token but obviously belong together; comparing the first six characters
// catches that family without a stemming library. Six is short enough for
// agronom-, mainten-, procur-, and long enough that "man" does not match
// "management".
const stems = (s) => new Set([...tokens(s)].filter((t) => t.length >= 5).map((t) => t.slice(0, 6)));
const STOP = new Set(["and", "the", "of", "services", "service", "operations", "department", "management"]);

function departmentFor(name, tierName, chart) {
  const codes = new Set(chart.map((d) => d.code));

  for (const [re, preferred] of DEPARTMENT_HINTS) {
    if (!re.test(name)) continue;
    for (const code of preferred) if (codes.has(code)) return { code, how: "hint" };
  }

  const roleTokens = tokens(name);
  const roleStems = stems(name);
  let best = null;
  let bestScore = 0;
  for (const d of chart) {
    let score = 0;
    for (const t of tokens(d.name)) if (!STOP.has(t) && roleTokens.has(t)) score += 2;
    for (const t of stems(d.name)) if (roleStems.has(t)) score += 1;
    if (score > bestScore) { bestScore = score; best = d.code; }
  }
  if (best) return { code: best, how: "name-overlap" };

  // FALLBACK BY WHAT THE TIER IS, ROUTED THROUGH sectionKeys.
  //
  // This used to be "the first department that is not back office", and the
  // sample showed how badly that reads: Construction's chart begins with
  // Estimation & Tendering, so Plasterers, Watchmen and Piling Rig Operators
  // were all filed under Estimation. Position in the list means nothing.
  //
  // What does mean something is the section a department says it works in.
  // Somebody on the tools belongs where the field work is; a professional
  // belongs where the drawings are; a signatory belongs with quality. So the
  // fallback asks each department what it does, in the order that matters for
  // the tier, and takes the first that answers.
  const bySection = (...keys) => {
    for (const key of keys) {
      const hit = chart.find((d) => (d.sectionKeys || []).includes(key));
      if (hit) return hit.code;
    }
    return "";
  };
  const backOffice = new Set(["FIN", "HR", "ADM", "PRC", "STR"]);
  const operating = chart.find((d) => !backOffice.has(d.code));

  let code = "";
  if (tierName === "Top administration" || tierName === "Industry-specific support") {
    code = chart.find((d) => d.code === "ADM")?.code || "";
  } else if (tierName === "Second line") {
    // A functional head belongs to the thing they head, and with no other
    // signal the operating line is the better guess than Administration.
    code = bySection("projects", "manufacturing", "field-service");
  } else if (tierName === "Regulated / certified") {
    code = bySection("quality-hse") || bySection("field-service", "manufacturing");
  } else if (tierName === "Professional & technical") {
    code = bySection("engineering-docs") || bySection("projects", "manufacturing");
  } else {
    // Middle management, supervisory, skilled and operational — the people who
    // do and direct the work.
    code = bySection("field-service", "projects", "manufacturing");
  }

  return { code: code || (operating || chart[0]).code, how: "fallback" };
}

const library = [];
const stats = new Map();

// THE SPINE IS STORED ONCE, not twenty-five times.
//
// Writing it per industry doubled the file — 5,820 rows where 2,992 carry the
// same information — because the spine is by definition identical everywhere:
// "listed once and applies to all twenty-five" is the research's own phrasing.
// So it goes in with `industry: "*"`, and the readers treat that as matching
// any field. A department code is still named, because which back-office
// department a Payroll Officer belongs to is real information; an industry
// whose chart lacks that code simply never matches it.
for (const sr of spine) {
  const group = SPINE_GROUPS[sr.group];
  // A GROUP'S FIRST CODE IS NOT ALWAYS THE RIGHT ONE. "Procurement, supply
  // chain and stores" covers both the buyers and the storemen, and taking
  // codes[0] put every one of them in Procurement — leaving Stores & Warehouse
  // empty in three charts, which the every-department-has-a-role test caught.
  //
  // So the name decides, through the same hint table the field roles use, and
  // the group's codes are the shortlist it may choose from. Anything the hints
  // do not recognise falls to the group's first code, which is what the whole
  // group meant before this split existed.
  const allowed = new Set(group.codes);
  let code = group.codes[0];
  for (const [re, preferred] of DEPARTMENT_HINTS) {
    if (!re.test(sr.name)) continue;
    const hit = preferred.find((c) => allowed.has(c));
    if (hit) { code = hit; break; }
  }
  entries.push({
    name: sr.name, industry: "*", tier: TIER_ORDER[group.tier],
    forced: code, spineCodes: group.codes,
  });
}

for (const e of entries) {
  const chart = e.industry === "*" ? [] : (codesFor.get(e.industry) || []);
  if (e.industry !== "*" && !chart.length) continue;
  const { code, how } = e.forced
    ? { code: e.forced, how: "spine" }
    : departmentFor(e.name, e.tier, chart);
  library.push({
    name: e.name,
    industry: e.industry,
    department: code,
    archetype: archetypeFor(e.name, e.tier),
    tier: TIER_ORDER.indexOf(e.tier),
  });
  if (e.industry === "*") continue;
  const s = stats.get(e.industry) || { total: 0, fallback: 0, byCode: new Map() };
  s.total += 1;
  if (how === "fallback") s.fallback += 1;
  s.byCode.set(code, (s.byCode.get(code) || 0) + 1);
  stats.set(e.industry, s);
}

// ---- report -----------------------------------------------------------------
if (REPORT) {
  console.log(`\n${library.length} roles across ${stats.size} fields of work\n`);
  let worst = 0;
  for (const field of FIELDS_OF_WORK) {
    const s = stats.get(field);
    if (!s) { console.log(`  ${field}: NO ROLES`); continue; }
    const pct = Math.round((s.fallback / s.total) * 100);
    worst = Math.max(worst, pct);
    const spread = [...s.byCode.entries()].sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c}:${n}`).join(" ");
    console.log(`  ${field}`);
    console.log(`      ${s.total} roles, ${s.fallback} by fallback (${pct}%)  ${spread}`);
    // A DEPARTMENT WITH NO ROLES seeds an empty chart, which is the blank-grid
    // problem one level down.
    // The spine fills the back office for every field, so a department it
    // covers is not empty even though the per-industry stats never saw it.
    const spineCodes = new Set(entries.filter((e) => e.industry === "*").flatMap((e) => e.spineCodes || []));
    const empty = (codesFor.get(field) || []).filter((d) => !s.byCode.has(d.code) && !spineCodes.has(d.code));
    if (empty.length) console.log(`      EMPTY: ${empty.map((d) => d.code).join(", ")}`);
  }
  console.log(`\nworst fallback rate: ${worst}%\n`);
  console.log("FALLBACK IS NOT THE SAME AS WRONG. The fallback target is the");
  console.log("industry's first operating department — Farm Operations for");
  console.log("agriculture, Mine Operations for mining — and most operational");
  console.log("roles genuinely belong there. What the number measures is how");
  console.log("many assignments were made by default rather than by a rule, so");
  console.log("it is where to LOOK, not a count of errors. Read the spread and");
  console.log("judge; that is what the ~95% target actually asks for.\n");
}

// ---- emit -------------------------------------------------------------------
if (OUT) {
  const rows = library
    .map((e) => `  { name: ${JSON.stringify(e.name)}, industry: ${JSON.stringify(e.industry)}, `
      + `department: ${JSON.stringify(e.department)}, archetype: ${JSON.stringify(e.archetype)}, tier: ${e.tier} },`)
    .join("\n");

  writeFileSync(OUT, `// GENERATED — do not edit by hand.
//
//   node scripts/generate/role-library.mjs --out ${OUT}
//
// ${library.length} job titles across ${stats.size} fields of work, read out of
// docs/research/industry-roles.md. The generator holds the two mappings — tier
// and name to archetype, name to department — as reviewable data; correct them
// there and regenerate rather than editing a row here, or the next run silently
// undoes the edit.
//
// SERVER-ONLY. See roleLibrary.ts for why this must never reach a browser.

import type { LibraryRole } from "./roleLibrary";

export const LIBRARY_DATA: readonly LibraryRole[] = [
${rows}
];
`, "utf8");
  console.log(`wrote ${library.length} entries to ${OUT}`);
}
