// THE OLD AMOUNT CHAINS, AS THEY ARE STILL READ — purely. No store, no server.
//
// Bills, bids, requisitions and stock adjustments were signed by a chain engine
// until 19/09/2026, when each moved onto the Approvals page. The engine's walker,
// validator and editor went with the last of them. What is left is the SEEDS
// (platform/approval/chains) and the studio's stored overrides
// (platform/approval/store), read for one purpose: a type's DEFAULT steps in
// Approvals settings until the studio saves it (`defaultSetting`,
// modules/approvals/model). So what is asserted here is that the defaults a
// studio meets on the day a type moves are the limits it had the day before.
//
// The loader preamble is access.test.mjs's, and it is what lets a .mjs test
// import a .ts module.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { SEEDED_CHAINS } = await import("@/platform/approval/chains");
const { approvalChainsFor } = await import("@/platform/approval/store");
const { APPROVAL_TYPES } = await import("@/modules/approvals/registry");
const M = await import("@/modules/approvals/model");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== every type that left the chain engine names the chain it left");
const moved = APPROVAL_TYPES.filter((t) => t.legacyChain);
ok("the four amount chains all moved", ["adjustment", "bill", "requisition", "tender"]
  .every((c) => moved.some((t) => t.legacyChain === c)), moved.map((t) => t.legacyChain).join());
for (const t of moved) {
  const seed = SEEDED_CHAINS[t.legacyChain];
  ok(`${t.key}: its old chain is still seeded`, Boolean(seed?.steps?.length));
  // THE REGISTRY'S OWN COPY MUST AGREE WITH THE SEED, or a studio with no
  // stored chain and one with the seed stored would meet different defaults.
  ok(`${t.key}: the registry's steps are the seed's — the same rights at the same amounts`,
    JSON.stringify(seed.steps.map((s) => [s.permission, s.from])) === JSON.stringify(t.legacy.map((s) => [s.permission, s.from])),
    JSON.stringify({ seed: seed.steps.map((s) => [s.permission, s.from]), registry: t.legacy.map((s) => [s.permission, s.from]) }));
  ok(`${t.key}: carries an amount, so its limits can apply`, t.amounted === true);
}

console.log("\n== a studio's own limits survive the move");
const people = [{ id: "own", role: "owner" }, { id: "fd", roleIds: ["fd"] }];
const roles = [{ id: "fd", permissions: ["finance.payables.approve", "finance.payables.approveHigh"] }];
const seeded = M.defaultSetting("bill", {}, people, roles);
ok("with nothing stored, a bill's default second step starts at the seed's 50,000",
  seeded.steps[1]?.from === 50000, JSON.stringify(seeded.steps));
const moved5k = { approvalChains: { bill: { type: "bill", steps: [
  { permission: "finance.payables.approve", from: 0, label: "Finance" },
  { permission: "finance.payables.approveHigh", from: 5000, label: "Director" },
] } } };
const own = M.defaultSetting("bill", moved5k, people, roles);
ok("a studio that had moved it to 5,000 keeps 5,000, and its own step names",
  own.steps[1]?.from === 5000 && own.steps[1]?.label === "Director", JSON.stringify(own.steps));
ok("the first step still starts at nothing, and names nobody's limit", own.steps[0].from === undefined);

console.log("\n== what a stored chain can and cannot do to the defaults");
ok("no studio at all still gets the built-ins", Boolean(approvalChainsFor(null).bill && approvalChainsFor(null).tender));
// A STORED CHAIN WITH NO STEPS IS A BROKEN ROW, not an override: honouring it
// would leave a type with no default steps at all.
ok("an empty stored chain does not blank the seed",
  approvalChainsFor({ approvalChains: { tender: { type: "tender", steps: [] } } }).tender.steps.length === 2);
ok("nonsense on the studio is ignored", approvalChainsFor({ approvalChains: "x" }).tender.steps.length === 2);

console.log(fails ? `\n${fails} FAILED\n` : "\napproval model: all passed\n");
process.exit(fails ? 1 : 0);
