// THE STUDIO BAND, PURELY. No store, no routes, no model call.
//
// `shared/greeting` decides three things a studio sees and each fails silently
// in its own way:
//
//   cleanConfig   turns whatever is stored into a usable list. Its failure mode
//                 is a MIGRATION THAT LOSES A MESSAGE — the first version stored
//                 one message under a different shape, and reading it wrong
//                 means every studio's band goes blank on deploy with nothing
//                 raised anywhere.
//   bandCss       builds the two `linear-gradient()` values. Two failure modes:
//                 a one-stop gradient is INVALID CSS, so the declaration is
//                 dropped, the opaque fill disappears and the border ramp shows
//                 through the whole box — the exact bug the `.greeting-band`
//                 comment already paid for once. And anything accepted as a
//                 "colour" is CSS injected into every studio in the product.
//   resolveBand   picks today's words. Its failure mode is a band of automated
//                 messages all falling back to the SAME line, which reads as a
//                 broken rotation rather than a missing key.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const G = await import("@/shared/greeting");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what is stored becomes a usable list");

// THE MIGRATION, BOTH WAYS. `default` meant the built-in rotation, which is what
// an automated message shows when there is no key — so it becomes automated and
// a studio with no key set reads exactly what it read yesterday. `custom` meant
// typed words, which is manual. Getting either backwards silently rewrites what
// every studio sees.
const fromDefault = G.cleanConfig({ mode: "default", greeting: "", quote: "", author: "" });
ok("the old default mode becomes one automated message",
  fromDefault.messages.length === 1 && fromDefault.messages[0].source === "ai");

const fromCustom = G.cleanConfig({ mode: "custom", greeting: "Hello.", quote: "Q", author: "A" });
ok("the old custom mode becomes one written message, words intact",
  fromCustom.messages.length === 1
  && fromCustom.messages[0].source === "manual"
  && fromCustom.messages[0].greeting === "Hello."
  && fromCustom.messages[0].author === "A");

ok("nothing stored still yields a band", G.cleanConfig(null).messages.length === 1);
ok("an empty list is not an empty band", G.cleanConfig({ messages: [] }).messages.length === 1);

// AN ID ADDRESSES THE DAY'S GENERATIONS. Two messages sharing one id means the
// second overwrites the first's words and both show the same line.
const dupes = G.cleanConfig({ messages: [{ id: "a" }, { id: "a" }, { id: "a" }] });
ok("duplicate ids are made unique", new Set(dupes.messages.map((m) => m.id)).size === 3,
  dupes.messages.map((m) => m.id).join(", "));

const many = G.cleanConfig({ messages: Array.from({ length: 20 }, (_, i) => ({ id: `m${i}` })) });
ok(`the list is capped at ${G.MAX_MESSAGES}`, many.messages.length === G.MAX_MESSAGES, String(many.messages.length));

console.log("\n== a colour is a hex literal and nothing else");

// THE INJECTION. These strings are substituted into a `linear-gradient()` that
// renders in every studio; only /super can write them, which lowers the odds and
// not the cost.
const attack = "red); } body { display: none; } .x { color: #fff";
ok("a CSS payload is refused", !G.isHexColor(attack));
ok("and falls back to the house ramp rather than through",
  G.cleanStops([attack]).join() === G.BRAND_STOPS.join(), G.cleanStops([attack]).join());
ok("named colours are refused", !G.isHexColor("red"));
ok("rgb() is refused", !G.isHexColor("rgb(0,0,0)"));
ok("var() is refused", !G.isHexColor("var(--x)"));
ok("three, four, six and eight digit hex are accepted",
  ["#abc", "#abcd", "#a1b2c3", "#a1b2c3d4"].every(G.isHexColor));
ok("a good stop survives beside a bad one",
  G.cleanStops(["#112233", attack]).join() === "#112233");
ok(`stops are capped at ${G.MAX_STOPS}`,
  G.cleanStops(Array.from({ length: 12 }, () => "#112233")).length === G.MAX_STOPS);

console.log("\n== the gradient is always valid CSS");

// ONE STOP IS INVALID AND SILENT. `linear-gradient(90deg, #fff)` drops the whole
// declaration, taking the opaque fill with it — the band then renders as the
// full-strength border ramp across the entire box.
const solid = G.bandCss({ mode: "custom", background: ["#123456"], border: ["#654321"] });
ok("one background colour is doubled into two stops", solid.background === "#123456, #123456", solid.background);
ok("one border colour is doubled too", solid.border === "#654321, #654321", solid.border);
ok("every gradient value has at least two stops",
  solid.background.split(",").length >= 2 && solid.border.split(",").length >= 2);

const three = G.bandCss({ mode: "custom", background: ["#111111", "#222222", "#333333"], border: ["#444444", "#555555"] });
ok("three background colours stay three", three.background.split(",").length === 3, three.background);
ok("the shadow takes the first border stop", three.glow === "#444444", three.glow);

// DEFAULT IGNORES WHAT WAS PICKED, on purpose: switching back to house colours
// must not half-apply the custom ones somebody left in the form.
const housed = G.bandCss({ mode: "default", background: ["#111111"], border: ["#222222"] });
ok("house mode ignores stored custom stops", !housed.background.includes("#111111"), housed.background);
ok("house mode tints the fill over the page",
  housed.background.includes("color-mix") && housed.background.includes("var(--geex-page)"));
ok("house mode's border is the ramp at full strength",
  housed.border === G.BRAND_STOPS.join(", "), housed.border);

// CUSTOM IS TAKEN LITERALLY. Somebody who chose a background chose a background;
// tinting it to 14% of itself would silently ignore them.
ok("custom fill is not tinted", !three.background.includes("color-mix"), three.background);

ok("a missing theme still paints", G.bandCss(undefined).border === G.BRAND_STOPS.join(", "));

console.log("\n== today's words");

const cfg = G.cleanConfig({
  messages: [
    { id: "a", source: "ai", active: true },
    { id: "b", source: "ai", active: true },
    { id: "c", source: "manual", active: true, greeting: "Typed." },
    { id: "d", source: "manual", active: false, greeting: "Hidden." },
    { id: "e", source: "manual", active: true, greeting: "", quote: "" },
  ],
});
const day = new Date(Date.UTC(2026, 8, 9));
const band = G.resolveBand(cfg, null, day);

ok("an inactive message does not show", !band.messages.some((m) => m.id === "d"));
ok("a written message left blank does not show", !band.messages.some((m) => m.id === "e"));
ok("the written one shows its words", band.messages.find((m) => m.id === "c")?.greeting === "Typed.");
ok("the day travels with the band", band.day === "2026-09-09", band.day);

// TWO AUTOMATED MESSAGES WITH NO GENERATION MUST NOT READ AS ONE REPEATED. The
// fallback is offset by position for exactly this.
const a = band.messages.find((m) => m.id === "a");
const b = band.messages.find((m) => m.id === "b");
ok("two fallbacks on one day differ", a.greeting !== b.greeting, `${a.greeting} / ${b.greeting}`);
ok("a fallback is not marked as generated", a.generated === false);

const withGen = G.resolveBand(cfg, { a: { greeting: "Written today.", quote: "Q", author: "A" } }, day);
const gen = withGen.messages.find((m) => m.id === "a");
ok("a generation wins over the fallback", gen.greeting === "Written today.");
ok("and is marked as generated", gen.generated === true);
ok("the other automated message still falls back",
  withGen.messages.find((m) => m.id === "b").generated === false);

// AN EMPTY GENERATION IS NOT AN ANSWER — a blank band is worse than the rotation.
const blankGen = G.resolveBand(cfg, { a: { greeting: "", quote: "", author: "" } }, day);
ok("an empty generation falls back rather than blanking the band",
  blankGen.messages.find((m) => m.id === "a").greeting.length > 0);

// EVERY MESSAGE CARRIES ITS OWN PAINT, or the band would recolour every message
// to whichever one happened to be first.
ok("each resolved message carries its own css",
  band.messages.every((m) => m.css && m.css.background && m.css.border && m.css.glow));

console.log("\n== the fallback rotation");

// THE PAIRING MUST NOT REPEAT WEEKLY. Seven greetings against eight quotations
// is fifty-six distinct pairs; one shared index would repeat every seven days
// and be noticed in the second week.
const pairs = new Set(Array.from({ length: 56 }, (_, i) => JSON.stringify(G.rotationFor(i))));
ok("fifty-six distinct pairs before one repeats", pairs.size === 56, String(pairs.size));
ok("and it does repeat at fifty-six",
  JSON.stringify(G.rotationFor(0)) === JSON.stringify(G.rotationFor(56)));
ok("a negative index is still a real pair", G.rotationFor(-1).greeting.length > 0);
ok("every fallback greeting is non-empty",
  Array.from({ length: 56 }, (_, i) => G.rotationFor(i)).every((r) => r.greeting && r.quote && r.author));

// THE DAY IS THE SERVER'S AND UTC, so everybody in a studio turns over together
// whatever timezone they are in.
ok("the day key is the UTC date", G.dayKey(new Date(Date.UTC(2026, 0, 1, 23, 59))) === "2026-01-01");
ok("consecutive days advance the number by one",
  G.dayNumber(new Date(Date.UTC(2026, 8, 10))) - G.dayNumber(new Date(Date.UTC(2026, 8, 9))) === 1);

console.log(fails ? `\n${fails} FAILED\n` : "\ngreeting model: all passed\n");
process.exit(fails ? 1 : 0);
