// THE SCREENSHOT PIPELINE — a demo company with work in it, then every screen,
// in both languages and both themes.
//
//   node scripts/screenshots.mjs --seed     build the demo company in the sandbox
//   node scripts/screenshots.mjs --capture  photograph its screens (needs `npm run dev:sandbox` running)
//   node scripts/screenshots.mjs            both
//
// WHY IT SEEDS THROUGH THE REAL SERVICES. A fixture file of hand-written rows is
// a second definition of what a client, a deal and a project are, and it drifts
// the first time either shape changes — which is exactly how a marketing page
// ends up showing a screen the product no longer renders. Every record is
// created by the function a route calls (scripts/lib/demo-seed.mjs), so a
// screenshot cannot show a shape the product would refuse.
//
// AND WHY THE DATA IS A PLACE NOW. This file used to seed three generic clients
// with no sector and no city, so nothing could be mistaken for a real customer.
// The owner chose a contracting and trading company in Jordan (26/09/2026) so
// the product looks like it does for the people it is sold to. The names are
// local in flavour and INVENTED; addresses end in `.example`; no brand appears;
// and the site captions every image as sample data.
//
// WHY EDGE, NOT PLAYWRIGHT. Playwright is deliberately not a dependency — its
// browser download is paid by every install for a script that runs when the UI
// changes. scripts/lib/edge-capture.mjs drives the Edge or Chrome already on
// the machine over the DevTools protocol, with Node's own WebSocket.
//
// NO REAL TENANT IS TOUCHED. Everything runs under NOMPANY_KEY_PREFIX in the
// sandbox namespace, swept by `npm run dev:sandbox:clean` — whose tenant sweep
// must run BEFORE the key-prefix delete, because the registry naming the sandbox
// studios is itself under the prefix.

import { readFileSync, mkdirSync, statSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
const PORT = process.env.PORT || "3010";
const ORIGIN = `http://localhost:${PORT}`;
const OUT = "public/screens";

const want = (flag) => process.argv.includes(flag);
const doSeed = want("--seed") || (!want("--seed") && !want("--capture"));
const doCapture = want("--capture") || (!want("--seed") && !want("--capture"));
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);

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

const { DEMO, seedDemo } = await import("./lib/demo-seed.mjs");
const OWNER_EMAIL = "lina.haddad@qimam.example";

if (doSeed) {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — seeding needs a Postgres to talk to.");
    process.exit(1);
  }
  const root = pathToFileURL(`${process.cwd()}/`).href;
  register(new URL("../tests/loader.mjs", import.meta.url), { data: { root } });
  await seedDemo();
}

if (doCapture) await capture();
process.exit(0);

async function capture() {
  const { launch } = await import("./lib/edge-capture.mjs");
  mkdirSync(OUT, { recursive: true });

  const browser = await launch();
  try {
    // A FIXED VIEWPORT AT 2x. The images land on a page beside each other, so
    // one captured at a different width is obvious, and a 1x screenshot of a
    // text-dense screen is unreadable on any modern display.
    await browser.viewport({ width: 1440, height: 900, scale: 2, scheme: "light" });

    // THE SANDBOX SIGN-IN DOOR, which exists precisely so this is possible
    // without an OTP round trip. It refuses to exist outside the sandbox.
    await browser.open(`${ORIGIN}/api/dev-login?email=${encodeURIComponent(OWNER_EMAIL)}&next=/${DEMO.slug}`);

    // THE IDS ONLY THE SEED KNOWS, read back through the product's own API as
    // the signed-in owner, so nothing is kept in a side file that could go stale.
    const ids = await browser.evaluate(`(async () => {
      const r = await fetch('/api/studios/${DEMO.slug}/projects', { cache: 'no-store' });
      const d = await r.json();
      const list = d.projects || d.items || d || [];
      const tower = list.find((p) => /Tower B/.test(p.title)) || list[0];
      if (!tower) return {};
      const pr = await fetch('/api/studios/${DEMO.slug}/projects/' + tower.id + '/plans', { cache: 'no-store' });
      const pd = pr.ok ? await pr.json() : {};
      const plan = (pd.plans || pd.items || pd || [])[0] || pd.plan || null;
      return { tower: tower.id, plan: plan && (plan.id || plan.planId) || '' };
    })()`);
    if (!ids?.tower) console.warn("  ! no projects found — was the demo seeded?");

    const S = `/${DEMO.slug}`;
    const SCREENS = [
      { name: "main", path: S },
      { name: "pipeline", path: `${S}/crm-sales-pipeline` },
      { name: "clients", path: `${S}/crm-sales-clients` },
      { name: "quotations", path: `${S}/quotations-register` },
      { name: "projects", path: `${S}/projects-list` },
      ids?.tower && { name: "project", path: `${S}/projects-list/${ids.tower}` },
      ids?.tower && { name: "project-costs", path: `${S}/projects-list/${ids.tower}/costs` },
      ids?.tower && ids?.plan && { name: "gantt", path: `${S}/projects-list/${ids.tower}/plans/${ids.plan}` },
      { name: "stock", path: `${S}/inventory-stock` },
      { name: "items", path: `${S}/inventory-items` },
      { name: "orders", path: `${S}/procurement-orders` },
      { name: "requisitions", path: `${S}/procurement-requisitions` },
      { name: "receivables", path: `${S}/finance-receivables` },
    ].filter(Boolean)
      // `--only=main,pipeline` retakes just those screens, for a fix to one.
      .filter((s) => !ONLY.length || ONLY.includes(s.name));

    let written = 0;
    // BOTH LANGUAGES AND BOTH THEMES. An Arabic screenshot is not a nicety: the
    // product's claim is that Arabic is not a second-class copy. And the site
    // swaps light and dark with its own toggle, so each image has a twin.
    for (const locale of ["en", "ar"]) {
      await browser.cookie("lang", locale, ORIGIN);
      for (const theme of ["light", "dark"]) {
        await browser.cookie("theme", theme, ORIGIN);
        await browser.viewport({ width: 1440, height: 900, scale: 2, scheme: theme });
        for (const screen of SCREENS) {
          await browser.open(`${ORIGIN}${screen.path}`);
          const file = `${OUT}/${screen.name}-${locale}-${theme}.webp`;
          await browser.shot(file);
          written += 1;
          console.log(`  ${file}  ${Math.round(statSync(file).size / 1024)} KB`);
        }
      }
    }
    console.log(`  ${written} screenshots written to ${OUT}/`);
  } finally {
    await browser.close();
  }
}
