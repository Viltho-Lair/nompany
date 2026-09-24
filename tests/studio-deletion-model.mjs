// WHEN A DELETED STUDIO IS ACTUALLY DELETED, purely. The job that acts on this
// removes a tenant's data for good, so every block here is a way it could take
// a studio it should not: early, after a cancellation, or on a bad date.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const D = await import("@/shared/studioDeletion");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const asked = "2026-09-01T10:00:00.000Z";
const at = (iso) => Date.parse(iso);
const studios = [
  { id: "a", name: "Asked", slug: "asked", deletionRequestedAt: asked },
  { id: "b", name: "Never asked", slug: "never", deletionRequestedAt: "" },
  { id: "c", name: "Cancelled", slug: "cancelled" },
  { id: "d", name: "Garbled", slug: "garbled", deletionRequestedAt: "not a date" },
  { id: "e", name: "Asked earlier", slug: "earlier", deletionRequestedAt: "2026-08-20T00:00:00.000Z" },
];

console.log("\n== thirty days, not a minute fewer");

ok("the grace is thirty days", D.STUDIO_DELETION_GRACE_DAYS === 30);
ok("it finalises thirty days after the request", D.deletionFinalisesAt(asked) === "2026-10-01T10:00:00.000Z");
ok("a minute before, the studio is not due",
  !D.dueForDeletion(studios, at("2026-10-01T09:59:00.000Z")).some((s) => s.id === "a"));
ok("at the moment itself it is", D.dueForDeletion(studios, at("2026-10-01T10:00:00.000Z")).some((s) => s.id === "a"));

console.log("\n== nothing is due that was not asked for");

const due = D.dueForDeletion(studios, at("2027-01-01T00:00:00.000Z")).map((s) => s.id);
ok("a studio never asked for is never due", !due.includes("b"));
ok("a cancelled request (no date) is never due", !due.includes("c"));
ok("AN UNREADABLE DATE KEEPS THE STUDIO — it fails towards keeping data", !due.includes("d"));
ok("no request answers no finalising date", D.deletionFinalisesAt("") === "" && D.deletionFinalisesAt("nonsense") === "");
ok("the oldest request goes first", due.join(",") === "e,a", due.join(","));

console.log("\n== the job cannot delete by accident");

// REPORT UNLESS SWITCHED ON: invariant 17's second confirmation is the switch.
const job = readFileSync(new URL("../src/app/api/cron/studio-deletions/route.ts", import.meta.url), "utf8");
ok("the job deletes only when STUDIO_DELETIONS is exactly \"on\"", /process\.env\.STUDIO_DELETIONS === "on"/.test(job));
ok("...and otherwise returns a report before touching anything",
  job.indexOf('mode: "report"') > -1 && job.indexOf('mode: "report"') < job.indexOf("cascadeDeleteStudio(studio.id)"));
ok("it deletes through the cascade, one explicit id at a time", /cascadeDeleteStudio\(studio\.id\)/.test(job));
ok("it names no prefix and sweeps nothing", !/delPrefix|scanPrefix|sweepOrphans/.test(job));
ok("it looks again at each studio right before deleting it", /THE SECOND LOOK/.test(job));

// ITS FILES AND ITS BILLING EXPIRY COME BEFORE THE CASCADE, while the studio is
// still in the registry — so a run that dies part-way leaves it due tomorrow.
const files = job.indexOf("deleteMedia(id)");
const billing = job.indexOf("touchTTL(BILLING.subscription(studio.id), BILLING_RETENTION_SEC)");
const cascade = job.indexOf("cascadeDeleteStudio(studio.id)");
ok("its uploaded files are deleted before the studio", files > -1 && files < cascade);
ok("its billing record is set to expire before the studio goes", billing > -1 && billing < cascade);
ok("...ten years out", /BILLING_RETENTION_SEC = 10 \* 365 \* 24 \* 60 \* 60/.test(job));
ok("the report says how many files each studio would lose", /files: \(await listMediaForStudio\(studio\.id\)\)\.length/.test(job));

// UNPAID DELETION IS A SECOND DECISION WITH ITS OWN SWITCH (invariant 17): the
// owner turned on deleting studios whose OWNER asked; deleting for non-payment
// waits on UNPAID_DELETIONS, and on the last warning having gone out.
ok("unpaid deletion has its own switch", /process\.env\.UNPAID_DELETIONS === "on"/.test(job));
ok("...and asks whether the studio was warned before deleting it", /unpaidDeletionDue\(/.test(job));
ok("...and looks again right before deleting it", /paid-or-changed/.test(job));

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
