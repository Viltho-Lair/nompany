// WHAT A PLAN LETS A STUDIO DO — lib/plans, purely.
//
// THE DEFECT THIS GUARDS, and it is one I reported wrongly before finding it.
// Auditing the public site on 22/09/2026 I grepped for `maxMembers`, found it
// only in the /super studios table, and told the owner the seat limit the site
// advertises — "free for teams of one to nine" — was enforced nowhere. It is
// enforced: `approveJoinRequest` asks `memberLimitOf` before it approves
// anybody, and refuses with `member-limit`. The check is simply named something
// my grep did not cover.
//
// What was true is that NOTHING TESTED IT. The enforcement rests on a
// convention — a package storing 0 means "no ceiling", not "nobody may join" —
// and that convention is carried in three places by hand. Inverting it would
// not fail a build; it would either lock every free studio out of its own
// invitations, or quietly sell an unlimited plan for the price of a small one.
//
// `planOf` is pure (it takes the catalogues rather than reading them), so this
// needs no database. `memberLimitOf` is the one-line wrapper that maps its
// `maxMembers` onto the null the caller checks.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { planOf } = await import("@/lib/plans");
const { PLAN_HEADCOUNTS } = await import("@/lib/pricing");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const studio = { id: "st_1", packageId: "pkg_free", tierId: "tier_basic" };
const tiers = [{ id: "tier_basic", name: "Basic" }];
const withPackage = (patch) => planOf(studio, [{ id: "pkg_free", name: "Free", ...patch }], tiers);

console.log("\n== the ceiling a package sets");
ok("a package that names a headcount carries it", withPackage({ maxEmployees: 9 }).maxMembers === 9);
ok("...and a bigger one", withPackage({ maxEmployees: 250 }).maxMembers === 250);

// THE CONVENTION, AND IT IS THE WHOLE POINT OF THIS FILE. Zero is not a
// ceiling of nobody; it is the absence of a ceiling, which `memberLimitOf`
// turns into null and `approveJoinRequest` reads as "do not check". A package
// saved with the field left blank must not lock a studio out of its own
// invitations.
ok("zero is no limit, not a limit of nought", withPackage({ maxEmployees: 0 }).maxMembers === 0);
ok("...and so is a package that never set the field", withPackage({}).maxMembers === 0);
ok("...and so is one that stored nonsense", withPackage({ maxEmployees: "many" }).maxMembers === 0);

console.log("\n== a studio pointed at nothing");
// A studio whose package was deleted still has to resolve to something. It
// falls back to the default name and to no ceiling — never to a ceiling of
// zero, which would be every member locked out by a tidy-up in /super.
const orphan = planOf({ id: "st_2", packageId: "pkg_gone" }, [], []);
ok("an orphaned studio has no ceiling", orphan.maxMembers === 0);
ok("...and still names a package", orphan.packageName.length > 0, orphan.packageName);

console.log("\n== what the site promises is what a package would have to allow");
// NOT A TEST OF THE CATALOGUE — that is runtime data and this file is pure.
// It pins the two halves against each other: the public claim comes from
// PLAN_HEADCOUNTS, and a package expressing that same free tier must produce a
// ceiling equal to it. If somebody moves the free tier and the package model
// stops being able to express it, this is where it shows.
const free = withPackage({ maxEmployees: PLAN_HEADCOUNTS.freeUpTo });
ok("a package set to the advertised free tier permits exactly that many",
  free.maxMembers === PLAN_HEADCOUNTS.freeUpTo, String(free.maxMembers));
ok("...and the tenth person is one past it",
  PLAN_HEADCOUNTS.paidFrom === free.maxMembers + 1);

console.log("\n== every package's limit, at every door (24/09/2026)");

const SEATS = await import("@/shared/seats");
const small = { type: "compound", categories: [{ maxEmployees: 9 }, { maxEmployees: 24 }, { maxEmployees: 49 }] };
// A COMPOUND PACKAGE HAD NO LIMIT AT ALL: its form carries bands, not a
// package-level maximum, so the ceiling read 0 and Small could seat anybody.
ok("a compound package's ceiling is its largest band", SEATS.packageCeiling(small) === 49);
ok("...and planOf now says so", withPackage(small).maxMembers === 49, String(withPackage(small).maxMembers));
ok("a band with no upper limit keeps the package unlimited",
  SEATS.packageCeiling({ type: "compound", categories: [{ maxEmployees: 49 }, { maxEmployees: 0 }] }) === 0);
ok("a plain package keeps its own maximum", SEATS.packageCeiling({ type: "free", maxEmployees: 4 }) === 4);
ok("THE SEATS PAID FOR WIN over the package's ceiling", SEATS.seatLimit(12, small) === 12);
ok("...and with none recorded, the package decides", SEATS.seatLimit(0, small) === 49);
ok("nothing readable is no limit, never NaN", SEATS.seatLimit("x", { maxEmployees: "abc" }) === 0);

// THE LAST SEAT WAS RACEABLE: approving counted members, then added one in a
// separate write, so two approvals at once both saw room. The count now lives
// inside addCollaborator's compare-and-set; these pin the wiring, which only a
// real race could otherwise show.
const { readFileSync } = await import("node:fs");
const collabSrc = readFileSync("src/platform/auth/collaborators.ts", "utf8");
const studiosSrc = readFileSync("src/lib/studios.ts", "utf8");
ok("adding a member counts seats inside the write",
  /if \(limit !== null && rows\.length >= limit\) return \{ result: \{ error: "member-limit" \} \}/.test(collabSrc));
ok("approving a join request hands its limit to that count", /\}, \{ limit \}\);/.test(studiosSrc));
ok("...and an approval that loses the last seat goes back to pending, not 'approved' and outside",
  /added\.error === "member-limit"[\s\S]{0,200}reopenJoinRequest\(requestId\)/.test(studiosSrc));

console.log(fails ? `\n${fails} FAILED\n` : "\nplan limits: all passed\n");
process.exit(fails ? 1 : 0);
