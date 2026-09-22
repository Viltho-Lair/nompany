// WHERE A FORM'S VISITOR CAME FROM, and which campaign gets the credit.
//
// THE DEFECT THIS WHOLE FILE GUARDS: for three days every campaign published
// tagged links and NOTHING read one back, so a form serving three campaigns
// credited every lead to whichever campaign was typed into its settings.
//
// THE PARTICULAR DEFECTS THE ASSERTIONS GUARD: a tag matched by a second slug
// implementation that drifts from the one writing it; an ambiguous tag credited
// to whichever campaign happened to be first; a full referring URL stored
// (somebody else's page, with their query string on it); and an unmatched tag
// disappearing because the form's settings supplied a campaign anyway — which
// is a live advert pointing at a deleted campaign, losing attribution on every
// click, with nothing in the product able to say so.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(new URL("./loader.mjs", import.meta.url), { data: { root: pathToFileURL(`${process.cwd()}/`).href } });

const A = await import("@/modules/marketing/arrival");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what a submission may say");
const full = A.cleanArrival({
  source: " newsletter ", medium: "email", campaign: "spring-sale", content: "hero", term: "x",
  referrer: "https://partner.example.com/blog/post?q=secret+search#frag",
});
ok("the tags are trimmed", full.source === "newsletter" && full.campaign === "spring-sale");
ok("the referrer keeps the HOST alone", full.referrer === "partner.example.com", full.referrer);
ok("...never the path or the query somebody else's page carried",
  !full.referrer.includes("secret") && !full.referrer.includes("/blog"));
ok("a non-http referrer is dropped", A.cleanArrival({ referrer: "javascript:alert(1)" }).referrer === "");
ok("...and so is rubbish", A.cleanArrival({ referrer: "not a url" }).referrer === "");
ok("nothing at all cleans to an empty arrival", A.arrivalEmpty(A.cleanArrival(undefined)));
ok("...and one tag is not empty", !A.arrivalEmpty(A.cleanArrival({ source: "x" })));
ok("a long tag is cut rather than refused", A.cleanArrival({ term: "y".repeat(500) }).term.length === 120);
ok("nonsense is an empty arrival, not a throw", A.arrivalEmpty(A.cleanArrival("newsletter")));

console.log("\n== which campaign a tag names");
const rows = [
  { id: "c1", name: "Spring Sale — Riyadh 2026!", reference: "CMP-0001", utmCampaign: "" },
  { id: "c2", name: "Winter Push", reference: "CMP-0002", utmCampaign: "winter-2026" },
  { id: "c3", name: "Café Été", reference: "CMP-0003", utmCampaign: "" },
];
// THE SAME FUNCTION THAT WRITES THE TAG READS IT: `utmOf` falls back to
// utmSlug(name) and then to the reference, and so does the match.
ok("a campaign's own typed tag", A.matchCampaign("winter-2026", rows) === "c2");
ok("a campaign's NAME as the slug that taggedLink would have written",
  A.matchCampaign("spring-sale-riyadh-2026", rows) === "c1");
ok("...accents folded the same way the writer folds them", A.matchCampaign("cafe-ete", rows) === "c3");
ok("a campaign's reference, which is the last fallback", A.matchCampaign("cmp-0002", rows) === "c2");
ok("case does not matter", A.matchCampaign("WINTER-2026", rows) === "c2");
ok("a tag naming nothing matches nothing", A.matchCampaign("autumn", rows) === "");
ok("an empty tag matches nothing", A.matchCampaign("", rows) === "");
// AN AMBIGUOUS TAG IS NOT EVIDENCE. Two campaigns may carry the same one.
const twins = [
  { id: "a", name: "Push", reference: "CMP-0009", utmCampaign: "push" },
  { id: "b", name: "Other", reference: "CMP-0010", utmCampaign: "push" },
];
ok("a tag fitting two campaigns credits neither", A.matchCampaign("push", twins) === "");

console.log("\n== who gets the credit");
const tagged = A.cleanArrival({ campaign: "winter-2026" });
const link = A.attribute(tagged, rows, "c1");
ok("the LINK beats the form's settings", link.campaignId === "c2" && link.basis === "link", JSON.stringify(link));
const untagged = A.attribute(A.cleanArrival({ source: "qr" }), rows, "c1");
ok("no tag falls back to the form's settings", untagged.campaignId === "c1" && untagged.basis === "form");
ok("...and is not reported as tagged", untagged.tagged === false && untagged.unmatched === "");
const nothing = A.attribute(null, rows, "");
ok("no tag and no setting credits nobody", nothing.campaignId === "" && nothing.basis === "none");
// THE CASE THAT FORCED `attributedBy` TO BE STORED.
const wrong = A.attribute(A.cleanArrival({ campaign: "autumn" }), rows, "c1");
ok("a tag naming nothing still falls back to the settings", wrong.campaignId === "c1" && wrong.basis === "form");
ok("...and the tag that named nothing is REPORTED, not swallowed", wrong.unmatched === "autumn");
ok("...and it is marked as having been tagged", wrong.tagged === true);
const stale = A.attribute(A.cleanArrival({ campaign: "autumn" }), rows, "");
ok("with no settings either, an unmatched tag credits nobody and still reports",
  stale.campaignId === "" && stale.basis === "none" && stale.unmatched === "autumn");
// A SETTINGS CAMPAIGN SINCE DELETED IS NOT A CREDIT.
const gone = A.attribute(null, rows, "c-deleted");
ok("a settings campaign that no longer exists credits nobody", gone.campaignId === "" && gone.basis === "none");

console.log("\n== where they came from, in one word");
ok("a tag wins", A.arrivalSource(A.cleanArrival({ source: "newsletter", referrer: "https://x.test/" })).token === "utm");
ok("...then the referring site", A.arrivalSource(A.cleanArrival({ referrer: "https://x.test/a" })).value === "x.test");
ok("nothing known is DIRECT, which is not a place", A.arrivalSource(A.cleanArrival({})).token === "direct");
ok("...and so is a missing arrival entirely", A.arrivalSource(null).token === "direct");

console.log("\n== how many came from where");
const counted = A.groupArrivals([
  { arrival: A.cleanArrival({ source: "newsletter" }) },
  { arrival: A.cleanArrival({ source: "Newsletter" }) },
  { arrival: A.cleanArrival({ referrer: "https://partner.test/x" }) },
  { arrival: null },
  {},
]);
ok("commonest first", counted[0].n === 2 && counted[0].token === "utm", JSON.stringify(counted));
ok("case does not split a source in two", counted.filter((c) => c.token === "utm").length === 1);
ok("a referring site is counted as one", counted.some((c) => c.token === "referrer" && c.value === "partner.test" && c.n === 1));
ok("every unknown arrival is one 'direct'", counted.some((c) => c.token === "direct" && c.n === 2));
ok("nothing is lost", counted.reduce((s, c) => s + c.n, 0) === 5);

console.log(`\n${fails ? `${fails} FAILED` : "all passed"}`);
process.exit(fails ? 1 : 0);
