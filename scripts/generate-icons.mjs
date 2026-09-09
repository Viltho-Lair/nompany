// EXTRACTS PHOSPHOR ARTWORK INTO THE REPO'S OWN ICON SET.
//
// WHY A GENERATOR AND NOT A DEPENDENCY. `@phosphor-icons/react` is the obvious
// answer and it is the wrong one here. Tree-shaken to the ~130 marks this
// product uses it still lands around 30-40 KB gz, and the client bundle has six
// kilobytes of headroom (scripts/bundle-budget.mjs: 1638 of 1644). The artwork
// itself is a few hundred bytes an icon; everything else in that package is a
// component wrapper, a weight switch and a React context this codebase already
// has its own answer for. So we take the paths and leave the machinery — which
// is also the only shape that keeps `<Icon name="…" />` working at every one of
// its call sites without touching a single one of them.
//
// `@phosphor-icons/core` is a devDependency for exactly this reason: it is read
// at generation time and ships nothing.
//
// WEIGHT IS PER ICON, AND THAT IS THE WHOLE DESIGN DECISION. Duotone draws a
// 20%-opacity backdrop under a solid foreground, which gives a section mark
// depth and a tint to carry. On a UI control it is wrong: `x-duotone` is a
// filled rounded SQUARE behind the cross, so a close button drawn duotone reads
// as a button inside a button. Section and feature marks are duotone; chevrons,
// arrows, checks and the rest are regular. One family, two weights, chosen by
// what the mark is FOR.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// THE ASSETS ARE FOUND BY WALKING UP, NOT BY ASSUMING THEY SIT UNDER ROOT.
//
// This read `join(ROOT, "node_modules", …)` and therefore could not run in a
// git WORKTREE at all: a worktree has no `node_modules` of its own — Node
// resolves the repo's by walking up the directory chain, which is exactly why
// eslint, tsc and the tests all work there — but a hand-built path does not
// walk. The generator failed with a missing-assets list naming every icon,
// which reads as a broken install rather than as the wrong directory.
//
// So it walks the same way Node does. `createRequire().resolve` was the other
// candidate and is worse here: it needs the package to export the subpath it is
// asked for, and `@phosphor-icons/core` exports no `./assets`, so resolving it
// would depend on a field the package has no reason to keep.
function findAssets(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", "@phosphor-icons", "core", "assets");
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) break;
  }
  throw new Error("@phosphor-icons/core is not installed anywhere above " + from);
}
const ASSETS = findAssets(ROOT);

// name -> phosphor slug. Regular weight; these are controls, not marks.
const REGULAR = {
  arrowDown: "arrow-down", arrowLeft: "arrow-left", arrowRight: "arrow-right",
  arrowUp: "arrow-up", check: "check", checkDouble: "checks",
  chevronDown: "caret-down", chevronLeft: "caret-left",
  chevronRight: "caret-right", chevronUp: "caret-up",
  close: "x", x: "x", plus: "plus", minus: "minus", more: "dots-three",
  search: "magnifying-glass", filter: "funnel", refresh: "arrows-clockwise",
  download: "download-simple", upload: "upload-simple",
  external: "arrow-square-out", send: "paper-plane-tilt", edit: "pencil-simple",
  copy: "copy", trash: "trash", eye: "eye", eyeOff: "eye-slash",
  dot: "dot-outline", menu: "list", list: "list-bullets", play: "play",
  type: "text-aa", moon: "moon", sun: "sun", info: "info", help: "question",
  helpCircle: "question", alert: "warning", link: "link-simple",
  logout: "sign-out", grid: "grid-four", table: "table", code: "code",
  trendUp: "trend-up", trendDown: "trend-down",
};

// name -> phosphor slug. Duotone; these carry meaning and a section's accent.
const DUOTONE = {
  activity: "pulse", assets: "cube", award: "medal", bank: "bank",
  bell: "bell", bitcoin: "currency-btc",
  blueprint: "blueprint", book: "book-open", box: "package",
  briefcase: "briefcase", building: "building", calendar: "calendar-dots",
  call: "phone-call", camera: "camera", cart: "shopping-cart", cash: "money",
  chart: "chart-bar", chat: "chat-circle-dots", clients: "users-three",
  clock: "clock", cloud: "cloud", contract: "scroll", dashboard: "squares-four",
  database: "database", email: "envelope-simple", engineering: "hard-hat",
  engineeringDocs: "compass-tool",
  file: "file-text", flag: "flag", folder: "folder", form: "clipboard-text",
  gallery: "images", gears: "gear-six", globe: "globe", group: "users-three",
  heart: "heart", home: "house", hse: "first-aid-kit", image: "image",
  invoice: "receipt",
  kanban: "kanban", key: "key", layers: "stack", ledger: "notebook",
  live: "broadcast",
  location: "map-pin", locations: "map-trifold", lock: "lock-simple",
  mail: "envelope", manufacturing: "factory", mapPin: "map-pin",
  megaphone: "megaphone", money: "coins",
  monitor: "monitor", overtime: "timer", package: "package", palette: "palette",
  person: "user", phone: "phone", pie: "chart-pie-slice",
  procurement: "shopping-bag-open", projects: "buildings",
  // THE SIX THAT WERE DRAWING A DOT. Every one is a real section in the sidebar
  // — the whole Procurement group and Sales' order register — and `dot-outline`
  // is the fallback for a key nobody mapped, not a design. Five identical dots
  // stacked under one parent is a list that says nothing about what is in it.
  //
  // Each is chosen against its NEIGHBOUR rather than in isolation, because they
  // are read as a column: `salesOrders` is the closed bag to Procurement's open
  // one (goods going out against goods coming in); `requisitions` is a document
  // being raised; `supplierQuotes` is an envelope, which also separates it from
  // Engineering's RFQ screen (`rfp`, a magnifying glass over a file) — two
  // screens, both called RFQ, that must not share a mark; `expediting` is an
  // alarm, because expediting is entirely about lateness; `subcontracts` is a
  // signature rather than `contract`'s scroll, so the sub-agreement is not the
  // main one; and `receiving` is a tray, goods landing.
  salesOrders: "shopping-bag", requisitions: "file-plus",
  supplierQuotes: "envelope-open", expediting: "alarm",
  subcontracts: "signature", receiving: "tray",
  readyStock: "warehouse", registeredItems: "barcode", report: "file-doc",
  reports: "presentation-chart",
  rfp: "file-magnifying-glass", rocket: "rocket-launch", sales: "handshake",
  selection: "truck", server: "hard-drives", services: "wrench",
  settings: "gear", sheets: "files", shield: "shield-check", smile: "smiley",
  star: "star", tag: "tag", target: "target", tasks: "list-checks",
  team: "users", teamwork: "identification-badge", techService: "screwdriver",
  technicalSupport: "headset", tender: "gavel", ticket: "ticket",
  tool: "wrench",
  tools: "toolbox", tracking: "gps-fix", user: "user", users: "users",
  vendors: "storefront", verified: "seal-check", wallet: "wallet",
  wifiOff: "wifi-slash", wizard: "magic-wand", zap: "lightning",
};

// name -> phosphor slug. Bold weight, and there are only two of them.
//
// These replace the `strokeWidth={3}` the old stroked set took: a regular-weight
// check inside a 10px status dot is a smudge, and with fill artwork there is no
// stroke to thicken — the weight IS the asset. So the two places that asked for
// a heavier line ask for the heavier drawing instead.
const BOLD = { checkBold: "check", xBold: "x" };

// Every `d` in the file, in document order. Phosphor's assets are uniform —
// only <path> elements, and the backdrop is the one carrying opacity="0.2" — so
// this ASSERTS that shape rather than trusting it. An icon that does not match
// is a generator failure, not a silently half-drawn glyph.
function paths(file) {
  const svg = readFileSync(file, "utf8");
  const out = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
    const attrs = m[1];
    const d = /\bd="([^"]+)"/.exec(attrs);
    if (!d) throw new Error(`path with no d in ${file}`);
    out.push({ d: d[1], back: /opacity="0\.2"/.test(attrs) });
  }
  if (!out.length) throw new Error(`no paths in ${file}`);
  if (/<(circle|rect|ellipse|polygon|line)\b/.test(svg)) {
    throw new Error(`non-path geometry in ${file}`);
  }
  return out;
}

const missing = [];
const entries = [];

for (const [name, slug] of Object.entries(REGULAR)) {
  const file = join(ASSETS, "regular", `${slug}.svg`);
  if (!existsSync(file)) { missing.push(`regular/${slug} (${name})`); continue; }
  const p = paths(file);
  if (p.length !== 1) throw new Error(`regular ${slug}: expected 1 path, got ${p.length}`);
  entries.push([name, "", p[0].d]);
}

for (const [name, slug] of Object.entries(BOLD)) {
  const file = join(ASSETS, "bold", `${slug}-bold.svg`);
  if (!existsSync(file)) { missing.push(`bold/${slug} (${name})`); continue; }
  const p = paths(file);
  if (p.length !== 1) throw new Error(`bold ${slug}: expected 1 path, got ${p.length}`);
  entries.push([name, "", p[0].d]);
}

for (const [name, slug] of Object.entries(DUOTONE)) {
  const file = join(ASSETS, "duotone", `${slug}-duotone.svg`);
  if (!existsSync(file)) { missing.push(`duotone/${slug} (${name})`); continue; }
  const p = paths(file);
  const back = p.filter((x) => x.back).map((x) => x.d).join("");
  const fore = p.filter((x) => !x.back).map((x) => x.d).join("");
  if (!fore) throw new Error(`duotone ${slug}: no foreground path`);
  entries.push([name, back, fore]);
}

if (missing.length) {
  console.error("Missing Phosphor assets:\n  " + missing.join("\n  "));
  process.exit(1);
}

// A NAME IN TWO MAPS IS A SILENT OVERWRITE, so it is a failure instead: they are
// separate objects and nothing else would notice the same key in more than one.
const seen = new Set();
for (const [name] of entries) {
  if (seen.has(name)) throw new Error(`"${name}" is in both REGULAR and DUOTONE`);
  seen.add(name);
}

entries.sort((a, b) => a[0].localeCompare(b[0]));

const body = entries
  .map(([name, back, fore]) => `  ${name}: [${JSON.stringify(back)}, ${JSON.stringify(fore)}],`)
  .join("\n");

const out = `// GENERATED FILE — run \`node scripts/generate-icons.mjs\` to rebuild it.
// Do not edit by hand; the mapping from our names to Phosphor's lives in that
// script, and an edit here is lost the next time it runs.
//
// Artwork: Phosphor Icons (https://phosphoricons.com), MIT — see LICENSES.md.
// Each entry is [backdrop, foreground] on a 256 viewBox. The backdrop is the
// duotone layer, drawn at 20% opacity; it is "" for the regular-weight marks,
// which have no second layer.
export const ART = {
${body}
};
`;

const dest = join(ROOT, "src", "components", "studio2", "icons.art.js");
writeFileSync(dest, out.replace(/\n/g, "\r\n"), "utf8");
const duo = entries.filter((e) => e[1]).length;
console.log(
  `icons.art.js: ${entries.length} marks (${duo} duotone, ${entries.length - duo} regular), ` +
  `${(out.length / 1024).toFixed(1)} KB raw`
);
