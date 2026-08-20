import { Icon as StudioIcon, iconNames } from "@/components/studio2/icons";

// The console's icon component is now an ADAPTER over the Studio's set, not a
// set of its own.
//
// This file used to hold ninety `d` strings — a second hand-rolled icon library
// with the same 24-grid, the same 1.7 stroke and the same `currentColor` rule as
// src/components/studio2/icons.js. Nothing imported both, so the two could drift
// for a year without anyone seeing it, and the console would slowly stop looking
// like the product it administers one glyph at a time. The marks it owned that
// the Studio lacked have moved into that file (see CONSOLE_MARKS there); this is
// what is left.
//
// Two things it still does:
//
//   ALIASES. The console and the Studio grew different words for the same
//   drawing. Rather than rename ~40 call sites — or, worse, add a duplicate mark
//   under the console's word and be back where we started — the console's
//   vocabulary is translated here. `user` is the interesting one: the Studio
//   answers that name with a PNG silhouette (see IMAGES), which beside a row of
//   stroked glyphs reads as a different weight entirely, so the console asks for
//   the stroked `person` instead.
//
//   A LOUD FAILURE. The Studio's Icon falls back to `dot` for a name it does not
//   know, which is right there — a missing section icon should not blank the
//   nav. Here it is wrong: a typo'd name in a dashboard becomes a stray dot that
//   looks deliberate. In development this throws instead.

const ALIASES = {
  user: "person",
  users: "team",
  mail: "email",
  phone: "call",
  helpCircle: "help",
  x: "close",
};

export default function Icon({ name, className = "h-4 w-4", strokeWidth }) {
  const resolved = ALIASES[name] || name;

  if (process.env.NODE_ENV !== "production" && !iconNames.includes(resolved)) {
    throw new Error(
      `Icon: no mark named "${name}"${resolved === name ? "" : ` (aliased to "${resolved}")`}. ` +
        "Add it to src/components/studio2/icons.js — do not introduce a second icon set.",
    );
  }

  return <StudioIcon name={resolved} className={className} strokeWidth={strokeWidth} />;
}

export { iconNames };
