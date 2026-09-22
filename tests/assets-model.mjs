// BRAND ASSETS, AND THE REVISION CHAIN THEY SHARE WITH TENDERING.
//
// THE DEFECTS THESE GUARD:
//   * a replaced asset DELETED rather than kept, so "which logo was on the
//     autumn adverts" stops being answerable the moment somebody uploads a
//     new one;
//   * a cycle written into the chain (A←B←C←A), which no reader can untangle
//     afterwards — refused at the write instead;
//   * an asset vanishing from the library because its campaign was deleted,
//     which would lose artwork somebody paid a designer for;
//   * and a SECOND copy of the chain logic, which would agree with Tendering's
//     on the day it was written and on no other. The last block asserts the
//     two are literally the same functions.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const A = await import("@/modules/marketing/assets");
const R = await import("@/lib/revisions");
const D = await import("@/modules/tendering/documents");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const asset = (id, over = {}) => ({
  id, campaignId: "c1", kind: "artwork", name: id, version: "",
  mediaId: `m_${id}`, supersededById: "", createdAt: "2026-01-01T00:00:00.000Z", ...over,
});

console.log("\n== what refuses an asset");
ok("a good one is accepted", A.assetProblem({ name: "Autumn hero", kind: "artwork", mediaId: "m1" }) === "");
ok("it needs a name", A.assetProblem({ name: " ", kind: "artwork", mediaId: "m1" }) === "name");
ok("...and a kind it recognises", A.assetProblem({ name: "x", kind: "psd", mediaId: "m1" }) === "kind");
ok("...and a file", A.assetProblem({ name: "x", kind: "artwork", mediaId: "" }) === "file");
// A CAMPAIGN IS NOT REQUIRED: the studio's own logo belongs to no campaign.
ok("a campaign is not required", A.assetProblem({ name: "Logo", kind: "logo", mediaId: "m1" }) === "");

// THE COERCION MUST NOT ANSWER THE QUESTION THE RULE ASKS. Mapping any unknown
// kind straight to "other" made the kind refusal unreachable — found by opening
// the API, where a body carrying kind "psd" got past the kind check and failed
// on the file instead. The same shape as Events' capacity bug an hour earlier.
ok("nothing said becomes the catch-all", A.cleanKind("") === "other" && A.cleanKind(undefined) === "other");
ok("a real kind is kept", A.cleanKind("logo") === "logo");
ok("an unknown kind is KEPT so the rule can refuse it", A.cleanKind("psd") === "psd");
ok("...and the rule does refuse it",
  A.assetProblem({ name: "x", kind: A.cleanKind("psd"), mediaId: "m" }) === "kind");

console.log("\n== versions");
const chain = [asset("a", { supersededById: "b" }), asset("b", { supersededById: "c" }), asset("c")];
ok("the current list is what has not been replaced",
  A.currentAssets(chain).map((x) => x.id).join() === "c");
// REPLACED IS NOT DELETED.
ok("an asset knows every version before it, newest first",
  A.versionsOf(chain, "c").map((x) => x.id).join() === "b,a");
ok("the oldest replaced nothing", A.versionsOf(chain, "a").length === 0);

console.log("\n== what may replace what");
const b = asset("b");
const c = asset("c");
ok("a current asset may replace another", A.replaceProblem([b, c], "b", "c") === null);
ok("nothing replaces itself", A.replaceProblem([b, c], "b", "b") === "self");
ok("an already-replaced asset is not replaced twice", A.replaceProblem(chain, "a", "c") === "already-superseded");
// THE RULE THAT MAKES A CHAIN A CHAIN — no cycle can be written.
ok("...and a replaced asset may not be the replacement",
  A.replaceProblem(chain, "c", "a") === "superseded-replacement");
ok("an unknown asset is missing, not permitted", A.replaceProblem([b], "b", "nope") === "missing");
// AND THE ONE PLACE THIS DIFFERS FROM A TENDER'S DOCUMENTS: an asset genuinely
// moves between campaigns, so the campaign is not a boundary.
ok("an asset from another campaign MAY be the next version",
  A.replaceProblem([b, asset("z", { campaignId: "c2" })], "b", "z") === null);

console.log("\n== what may be deleted");
ok("a replaced asset may not be deleted", A.assetDeleteProblem(chain, "a") === "in-chain");
ok("...nor the one that replaced it", A.assetDeleteProblem(chain, "b") === "in-chain");
ok("a loose asset may be", A.assetDeleteProblem([b, asset("q")], "q") === null);
ok("an unknown one is missing", A.assetDeleteProblem([b], "nope") === "missing");

console.log("\n== the library");
const names = new Map([["c1", "CMP-0001 · Autumn"], ["c2", "CMP-0002 · Winter"]]);
const library = A.libraryOf([
  asset("hero", { campaignId: "c1", createdAt: "2026-03-02T00:00:00.000Z" }),
  asset("banner", { campaignId: "c1", createdAt: "2026-03-05T00:00:00.000Z" }),
  asset("winter", { campaignId: "c2" }),
  asset("logo", { campaignId: "", kind: "logo" }),
  asset("orphan", { campaignId: "deleted-campaign" }),
  asset("old", { campaignId: "c1", supersededById: "hero" }),
], names);
// THE STUDIO'S OWN FIRST: a logo is what somebody opening the library wants.
ok("the unattached group comes first", library[0].campaignId === "", JSON.stringify(library.map((g) => g.campaignId)));
// AN ASSET WHOSE CAMPAIGN WAS DELETED IS NOT LOST.
ok("...and holds the asset whose campaign was deleted",
  library[0].assets.map((a) => a.id).sort().join() === "logo,orphan");
ok("campaign groups are named", library[1].name === "CMP-0001 · Autumn");
ok("...newest first inside a group", library[1].assets.map((a) => a.id).join() === "banner,hero");
ok("a replaced asset is not in the library", !library.some((g) => g.assets.some((a) => a.id === "old")));
ok("nonsense is an empty library", A.libraryOf(null, names).length === 0);

console.log("\n== the counts");
const sum = A.assetSummary([asset("x"), asset("y", { kind: "logo" }), asset("z", { supersededById: "x" })]);
ok("current, replaced and the total agree",
  sum.total === 3 && sum.current === 2 && sum.superseded === 1, JSON.stringify(sum));
ok("...counted by kind, current only", sum.byKind.artwork === 1 && sum.byKind.logo === 1);

console.log("\n== one chain, not two");
// THE WHOLE POINT OF THE EXTRACTION. Asserted by identity rather than by
// behaviour: two implementations that agree today are exactly what this
// prevents, and only sameness rules that out.
ok("marketing's delete rule IS lib/revisions'", A.assetDeleteProblem === R.deleteProblem);
ok("tendering answers from the same module", D.deleteProblem(chain, "a") === R.deleteProblem(chain, "a"));
ok("...and agrees with marketing on the same rows",
  D.deleteProblem(chain, "b") === A.assetDeleteProblem(chain, "b"));
// TENDERING KEEPS ITS OWN TOKEN, which is what let the logic move without
// changing a string anybody reads.
ok("tendering still says `other-tender`, not `other-parent`",
  D.supersedeProblem([asset("p"), asset("z", { tenderId: "t2" })].map((d) => ({ ...d, tenderId: d.tenderId || "t1" })), "p", "z") === "other-tender");

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
