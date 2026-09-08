// THE SCREENSHOT PIPELINE — realistic data, then every screen, in both languages.
//
//   node scripts/screenshots.mjs --seed     seed example data into the sandbox
//   node scripts/screenshots.mjs --capture  drive a browser and write the images
//   node scripts/screenshots.mjs            both
//
// WHY IT SEEDS THROUGH THE REAL SERVICES. A fixture file of hand-written rows is
// a second definition of what a client, a deal and a project are, and it drifts
// the first time either shape changes — which is exactly how a marketing page
// ends up showing a screen the product no longer renders. Every record below is
// created by the same function a route calls, so a screenshot cannot show a
// shape the product would refuse.
//
// AND WHY IT SEEDS AT ALL. An empty studio photographs as an empty state, which
// is honest and useless: the platform page needs to show what a department looks
// like with work in it. The data is deliberately GENERIC — no industry, no
// region, no invented customer names that could be mistaken for real ones (the
// site carried four of those until August). "Northwind Contracting" reads as a
// sample; a plausible local company name does not.
//
// NO REAL TENANT IS TOUCHED. Everything runs under NOMPANY_KEY_PREFIX in the
// sandbox namespace, swept by `npm run dev:sandbox:clean` — whose tenant sweep
// must run BEFORE the key-prefix delete, because the registry naming the sandbox
// studios is itself under the prefix.

import { readFileSync, mkdirSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
const PORT = process.env.PORT || "3010";
const SLUG = "sandbox";
const EMAIL = "sandbox@nompany.test";
const OUT = "public/screens";

const want = (flag) => process.argv.includes(flag);
const doSeed = want("--seed") || (!want("--seed") && !want("--capture"));
const doCapture = want("--capture") || (!want("--seed") && !want("--capture"));

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* already exported */ }

// SET BEFORE ANY PROJECT MODULE IS IMPORTED, for the reason dev-sandbox.mjs
// gives: keys.ts reads the prefix at import time, so setting it afterwards
// lands the seeding in the LIVE key space.
process.env.NOMPANY_KEY_PREFIX = PREFIX;

if (doSeed) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — seeding needs a Postgres to talk to.");
    process.exit(1);
  }
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../tests/loader.mjs", import.meta.url), { data: { root } });
  await seed();
}

if (doCapture) await capture();

async function seed() {
  const { getUserByEmail } = await import("@/platform/auth/users");
  const sales = await import("@/modules/sales/sales");

  const user = await getUserByEmail(EMAIL);
  if (!user) {
    console.error(`No sandbox account. Run \`npm run dev:sandbox\` once first.`);
    process.exit(1);
  }

  const ctx = await sales.salesContext(user, SLUG);
  if (!ctx || ctx.error) {
    console.error(`Could not open the sandbox studio: ${ctx?.error || "unknown"}`);
    process.exit(1);
  }

  // GENERIC ON PURPOSE. These read as samples rather than as customers — see the
  // note at the top. No sector, no city, no real-looking company.
  const CLIENTS = [
    { name: "Northwind Contracting", email: "hello@northwind.example" },
    { name: "Meridian Facilities", email: "hello@meridian.example" },
    { name: "Ardent Industrial", email: "hello@ardent.example" },
  ];

  // IDEMPOTENT BY NAME. Re-running must not produce a fourth Northwind — a
  // screenshot run happens whenever the UI changes, which is often.
  const existing = await sales.listClients(ctx);
  const byName = new Map((existing?.clients || existing || []).map((c) => [c.name, c]));

  let made = 0;
  for (const c of CLIENTS) {
    if (byName.has(c.name)) continue;
    const res = await sales.createClient(ctx, c);
    if (res?.error) console.warn(`  ! client ${c.name}: ${res.error}`);
    else made += 1;
  }

  console.log(`  clients seeded: ${made} new, ${byName.size} already there`);
  console.log("  (deals, projects and tenders are next — see the note in this file)");
}

async function capture() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    // NOT A DEPENDENCY OF THIS PROJECT, deliberately. Playwright pulls browser
    // binaries that every developer and every CI run would otherwise download
    // for a script that runs when the UI changes — which is not most days. It is
    // installed by whoever is regenerating the screenshots, and only then.
    console.error(
      "Capturing needs Playwright, which this project does not depend on.\n" +
      "  npm i -D playwright && npx playwright install chromium\n" +
      "Then run this again. Seeding (--seed) works without it.",
    );
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });

  // BOTH LANGUAGES, EVERY SCREEN. An Arabic screenshot is not a nicety: the
  // product's claim is that Arabic is not a second-class copy, and a marketing
  // page that only ever shows English screens quietly says the opposite.
  const SCREENS = [
    { name: "main", path: `/${SLUG}` },
    { name: "crm-sales", path: `/${SLUG}/crm-sales-tickets` },
    { name: "projects", path: `/${SLUG}/projects` },
    { name: "procurement", path: `/${SLUG}/procurement-requisitions` },
    { name: "finance", path: `/${SLUG}/finance-receivables` },
  ];

  const browser = await chromium.launch();
  // A FIXED VIEWPORT AND deviceScaleFactor: 2. The images land on a marketing
  // page beside each other, so one captured at a different width is obvious;
  // and a 1x screenshot of a text-dense screen is unreadable on any modern
  // display, which is the whole reason for showing it.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // THE SANDBOX SIGN-IN DOOR, which exists precisely so this is possible without
  // an OTP round trip. It is git-ignored and refuses to exist outside the
  // sandbox namespace.
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/api/dev-login?email=${encodeURIComponent(EMAIL)}`);

  let written = 0;
  for (const locale of ["en", "ar"]) {
    // The `lang` cookie is what a person's own choice writes, and the studio
    // reads it before falling back to the tenant's default — so this is the same
    // door a visitor uses rather than a test-only override.
    await context.addCookies([{ name: "lang", value: locale, url: `http://localhost:${PORT}` }]);
    for (const screen of SCREENS) {
      await page.goto(`http://localhost:${PORT}${screen.path}`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${OUT}/${screen.name}-${locale}.png` });
      written += 1;
    }
  }

  await browser.close();
  console.log(`  ${written} screenshots written to ${OUT}/`);
}
