// THE BROADCAST BAND, PURELY. No store, no routes, no model call.
//
// `shared/greeting` decides what a studio reads, and each part fails silently in
// its own way:
//
//   cleanConfig   turns whatever is stored into a usable list. Its failure mode
//                 is a MIGRATION THAT LOSES A MESSAGE — this document has had
//                 three shapes now, and reading an old one wrong means every
//                 studio's band goes blank on deploy with nothing raised.
//   bandCss       builds the two `linear-gradient()` values. Two failure modes:
//                 a one-stop gradient is INVALID CSS, so the declaration is
//                 dropped, the opaque fill disappears and the border ramp shows
//                 through the whole box — the exact bug the `.greeting-band`
//                 comment already paid for once. And anything accepted as a
//                 "colour" is CSS injected into every studio in the product.
//   resolveBand   picks what a studio reads. Three failure modes, and all three
//                 SHIPPED: a dismissal key that is not per-send means closing one
//                 message hides the next one too, which is the opposite of
//                 broadcasting; a greeting generated once a day says "good
//                 morning" to somebody opening at nine at night; and any built-in
//                 text at all means a studio reads words nobody chose while every
//                 screen reports things as fine.

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const G = await import("@/shared/greeting");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

console.log("\n== what is stored becomes a usable list");

// THE FIRST MIGRATION. `default` meant a built-in rotation and `custom` meant
// typed words. Getting either backwards silently rewrites what every studio sees.
const fromDefault = G.cleanConfig({ mode: "default", greeting: "", quote: "", author: "" });
ok("the old default mode becomes one automated message",
  fromDefault.messages.length === 1 && fromDefault.messages[0].source === "ai");
ok("and it is already sent, so a live band does not go dark on deploy",
  fromDefault.messages[0].status === "Sent");

const fromCustom = G.cleanConfig({ mode: "custom", greeting: "Hello.", quote: "Q", author: "A" });
ok("the old custom mode becomes one written message, words intact",
  fromCustom.messages.length === 1
  && fromCustom.messages[0].source === "manual"
  && fromCustom.messages[0].greeting === "Hello."
  && fromCustom.messages[0].author === "A");

ok("nothing stored still yields a list", G.cleanConfig(null).messages.length === 1);
ok("an empty list is not an empty register", G.cleanConfig({ messages: [] }).messages.length === 1);

// THE SECOND MIGRATION: `active` was a checkbox, `status` is a ladder. A message
// that was showing has been sent; one switched off is a draft.
const fromActive = G.cleanConfig({ messages: [{ id: "on", active: true }, { id: "off", active: false }] });
ok("active:true becomes Sent", fromActive.messages[0].status === "Sent");
ok("active:false becomes Draft", fromActive.messages[1].status === "Draft");
ok("a draft carries no send stamp", fromActive.messages[1].sentAt === "");

// AN ID ADDRESSES THE DAY'S GENERATIONS. Two messages sharing one id means the
// second overwrites the first's words and both show the same line.
const dupes = G.cleanConfig({ messages: [{ id: "a" }, { id: "a" }, { id: "a" }] });
ok("duplicate ids are made unique", new Set(dupes.messages.map((m) => m.id)).size === 3,
  dupes.messages.map((m) => m.id).join(", "));

const many = G.cleanConfig({ messages: Array.from({ length: 20 }, (_, i) => ({ id: `m${i}` })) });
ok(`the list is capped at ${G.MAX_MESSAGES}`, many.messages.length === G.MAX_MESSAGES, String(many.messages.length));

console.log("\n== nothing is hardcoded");

/* THE ARRAYS ARE GONE, AND THIS IS WHAT KEEPS THEM GONE. Seven greetings and
   eight quotations lived in this module — first as the product, then as the
   fallback — so a studio with no key set read words typed into a source file
   months earlier and no screen said so. Asked where the greeting came from, the
   honest answer was "from an array", three times running. The next person's
   instinct will be to add one back for the empty case; that is the bug. */
ok("no rotation function survives", typeof G.rotationFor === "undefined");
// COMMENTS COME OUT FIRST, both kinds. The prose above explains at length why
// there is no built-in "Good morning." any more, and deleting that reasoning to
// satisfy a grep would throw away the only record of why. Same treatment, and
// the same `[^:]` guard against `https://`, that the native-<select> assertion
// in restructure.mjs uses.
const source = readFileSync("src/shared/greeting.ts", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");
ok("the module ships no greeting text of its own", !/good morning/i.test(source));
ok("and no quotation", !/Aristotle|Eisenhower|Drucker/i.test(source));

console.log("\n== the part of the day");

// THE BOUNDARIES, BY NAME. An hour out here is a product that says good morning
// at noon, which is the fault this whole split exists to fix.
ok("05:00 is morning", G.daypartFor(5) === "morning");
ok("11:59 is still morning", G.daypartFor(11) === "morning");
ok("12:00 is afternoon", G.daypartFor(12) === "afternoon");
ok("17:59 is still afternoon", G.daypartFor(17) === "afternoon");
ok("18:00 is evening", G.daypartFor(18) === "evening");
ok("midnight is evening, not morning", G.daypartFor(0) === "evening");
ok("04:59 is evening", G.daypartFor(4) === "evening");
ok("a nonsense hour still answers", G.daypartFor(NaN) === "evening");
ok("a nonsense daypart resolves rather than throwing", G.cleanDaypart("elevenses") === "morning");
ok("a real one survives", G.cleanDaypart("evening") === "evening");
ok("generations are addressed per message per daypart",
  G.generationKey("m1", "evening") === "m1:evening");

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

const three = G.bandCss({ mode: "custom", background: ["#111111", "#222222", "#333333"], border: ["#444444", "#555555"] });
ok("three background colours stay three", three.background.split(",").length === 3, three.background);
ok("the shadow takes the first border stop", three.glow === "#444444", three.glow);

// DEFAULT IGNORES WHAT WAS PICKED, on purpose: switching back to house colours
// must not half-apply the custom ones somebody left in the form.
const housed = G.bandCss({ mode: "default", background: ["#111111"], border: ["#222222"] });
ok("house mode ignores stored custom stops", !housed.background.includes("#111111"), housed.background);
ok("house mode tints the fill over the page",
  housed.background.includes("color-mix") && housed.background.includes("var(--geex-page,"));

// THE STUDIO TOKEN IS NOT ENOUGH ON ITS OWN. `--geex-page` exists only inside
// the studio shell; the console draws the same band as a preview, and an
// unresolvable var() invalidates the whole two-layer background — fill AND
// border. The owner saw a house-colour band with no colours at all.
ok("house mode falls back when the studio token is absent",
  housed.background.includes("var(--ad-background"), housed.background);
ok("house mode carries no ink of its own — it follows the theme", housed.ink === "");
ok("house mode's border is the ramp at full strength",
  housed.border === G.BRAND_STOPS.join(", "), housed.border);
ok("custom fill is not tinted", !three.background.includes("color-mix"), three.background);
// A CUSTOM FILL CARRIES ITS OWN INK. The owner's screenshot: a pale pink band
// in dark mode, wearing the dark theme's white text. The ink comes from the
// fill, not the theme, because the fill does not change with the theme.
ok("a pale custom fill gets dark ink", G.bandCss({ mode: "custom", background: ["#ffb3b3", "#ff9999"], border: ["#ff5555"] }).ink === "#0f172a");
ok("a dark custom fill gets light ink", G.bandCss({ mode: "custom", background: ["#0f172a"], border: ["#334155"] }).ink === "#ffffff");
ok("three-digit hex is read too", G.inkFor(["#fff"]) === "#0f172a" && G.inkFor(["#000"]) === "#ffffff");
ok("nothing readable gives no ink rather than a guess", G.inkFor([]) === "");

ok("a missing theme still paints", G.bandCss(undefined).border === G.BRAND_STOPS.join(", "));

console.log("\n== what a studio reads");

const cfg = G.cleanConfig({
  messages: [
    { id: "a", title: "Auto", source: "ai", status: "Sent", sentAt: "2026-09-09T08:00:00.000Z" },
    { id: "b", title: "Typed", source: "manual", status: "Sent", sentAt: "2026-09-09T09:00:00.000Z", greeting: "Typed." },
    { id: "c", title: "Draft", source: "manual", status: "Draft", greeting: "Hidden." },
    { id: "d", title: "Blank", source: "manual", status: "Sent", sentAt: "2026-09-09T09:00:00.000Z", greeting: "", quote: "" },
  ],
});
const day = new Date(Date.UTC(2026, 8, 9));

// NOTHING GENERATED MEANS NOTHING SHOWN. There is no text to fall back to, and
// that is the point: an empty band is a key that is not set, which somebody can
// see and fix. Words nobody chose are not.
const bare = G.resolveBand(cfg, null, "morning", day);
ok("an automated message with no generation does not show", !bare.messages.some((m) => m.id === "a"));
ok("a written message still shows", bare.messages.some((m) => m.id === "b"));
ok("a draft does not show", !bare.messages.some((m) => m.id === "c"));
ok("a written message left blank does not show", !bare.messages.some((m) => m.id === "d"));

const gens = {
  "a:morning": { greeting: "Morning line.", quote: "Q", author: "A" },
  "a:evening": { greeting: "Evening line.", quote: "Q", author: "A" },
};
const morning = G.resolveBand(cfg, gens, "morning", day);
const evening = G.resolveBand(cfg, gens, "evening", day);
const afternoon = G.resolveBand(cfg, gens, "afternoon", day);

ok("the morning generation is read in the morning",
  morning.messages.find((m) => m.id === "a").greeting === "Morning line.");
ok("the evening generation is read in the evening",
  evening.messages.find((m) => m.id === "a").greeting === "Evening line.");

// THE FAULT THE SPLIT EXISTS FOR: a morning greeting must never be served to an
// afternoon reader just because it is the one that happens to exist.
ok("an unwritten daypart does not borrow another one",
  !afternoon.messages.some((m) => m.id === "a"));
ok("the band says which part of the day it is for", evening.daypart === "evening");
ok("the day still travels with the band", morning.day === "2026-09-09", morning.day);
ok("a generation is marked as generated", morning.messages.find((m) => m.id === "a").generated === true);
ok("a written message is not", morning.messages.find((m) => m.id === "b").generated === false);

console.log("\n== a dismissal belongs to one send of one message");

/* THE DEFECT THIS REPLACES: the key was the DAY and the band was dismissed
   whole, so closing it hid every message for the rest of the day INCLUDING ones
   sent afterwards. A reader who closed the morning greeting never saw the
   afternoon announcement — reported by the owner, who sent a second message and
   watched nothing happen. */
ok("the key names the message and the send",
  G.messageKey({ id: "a", sentAt: "2026-09-09T08:00:00.000Z" }) === "a:2026-09-09T08:00:00.000Z");
ok("two messages have different keys",
  morning.messages.find((m) => m.id === "a").key !== morning.messages.find((m) => m.id === "b").key);
ok("no key is merely the day", morning.messages.every((m) => m.key !== morning.day));

// RE-SENDING IS WHAT REACHES SOMEBODY WHO ALREADY CLOSED IT. A fresh stamp is a
// key nobody has dismissed; without this a correction is invisible to exactly
// the people who saw the thing being corrected.
const before = morning.messages.find((m) => m.id === "b").key;
const resent = G.cleanConfig({
  messages: cfg.messages.map((m) => (m.id === "b" ? { ...m, sentAt: "2026-09-09T15:30:00.000Z" } : m)),
});
const after = G.resolveBand(resent, gens, "morning", day).messages.find((m) => m.id === "b").key;
ok("re-sending changes the key", before !== after, `${before} -> ${after}`);
ok("and it is still the same message", before.split(":")[0] === after.split(":")[0]);

console.log("\n== a message is listed by a name its author gave it");

// AN AUTOMATED MESSAGE HAS NO WORDS OF ITS OWN — they are generated three times
// a day — so a register listing by text would rewrite itself at noon.
const fresh = G.newMessage("m9", day);
ok("a new message starts as a draft", fresh.status === "Draft" && fresh.sentAt === "");
ok("and records when it was made", fresh.createdAt === day.toISOString());
ok("a title survives the round trip",
  G.cleanConfig({ messages: [{ id: "x", title: "Maintenance notice" }] }).messages[0].title === "Maintenance notice");

// EVERY MESSAGE CARRIES ITS OWN PAINT, or the band would recolour every message
// to whichever one happened to be first.
ok("each resolved message carries its own css",
  morning.messages.every((m) => m.css && m.css.background && m.css.border && m.css.glow));

console.log("\n== the day key");

// THE DATE IS THE SERVER'S AND UTC; the HOUR is the reader's. Those are
// different questions, and the daypart split is the answer to the second.
ok("the day key is the UTC date", G.dayKey(new Date(Date.UTC(2026, 0, 1, 23, 59))) === "2026-01-01");
ok("consecutive days advance the number by one",
  G.dayNumber(new Date(Date.UTC(2026, 8, 10))) - G.dayNumber(new Date(Date.UTC(2026, 8, 9))) === 1);

console.log(fails ? `\n${fails} FAILED\n` : "\ngreeting model: all passed\n");
process.exit(fails ? 1 : 0);
