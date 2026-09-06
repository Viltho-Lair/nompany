// The one icon set for the whole product — the Studio's chrome, its screens,
// and the /super console through the adapter in app/super/_components/Icon.js.
//
// WHAT THIS REPLACED, AND WHY IT WENT.
//
// Until now this file was two icon sets wearing one name. 117 marks were
// hand-drawn on a 24 grid at a 1.7 stroke, ported from the Old System; the other
// 22 were PNG artwork in /public/icons rendered as a CSS mask so the alpha
// became the shape and `currentColor` became the fill. Three things were wrong
// with that and only the first was visible:
//
//   IT LOOKED DULL. Every mark was a thin monochrome outline, and the sidebar
//   drew all of them at `text-slate-400`. Fifteen sections, seventeen
//   sub-sections, one grey. Nothing on that nav told you where you were except
//   the row's background.
//
//   THE TWO HALVES DID NOT MATCH. A masked PNG is solid where a stroked glyph is
//   hollow, so `user` and `person` sat side by side at visibly different
//   weights, and no amount of nudging the stroke would have closed that gap.
//
//   THE PNGs WERE A LICENCE WE HAD NOT PAID. Their filenames
//   (`multiple-users-silhouette.png`, `request-for-proposal.png`) are Flaticon
//   slugs, and Flaticon's free tier requires visible attribution on every page
//   the icons appear on. There was no attribution anywhere in the repo. They are
//   deleted rather than credited, because a tenant-facing ERP sidebar is not a
//   place to carry somebody's backlink.
//
// It is Phosphor now (https://phosphoricons.com, MIT), extracted into
// `icons.art.js` by `scripts/generate-icons.mjs` — see that file for why the
// artwork is copied in rather than taken as a dependency. Every NAME the old set
// answered to still resolves, so nothing had to be renamed; the only call sites
// that changed are the four that passed `strokeWidth`, below.
//
// TWO WEIGHTS, CHOSEN BY WHAT THE MARK IS FOR. Section and feature marks are
// duotone: a 20%-opacity backdrop under a solid foreground, which gives the mark
// depth and — the point of the exercise — a shape that can carry a colour.
// Controls are regular. Duotone on a control is actively wrong: Phosphor's
// `x-duotone` is a filled rounded square behind the cross, so a close button
// drawn that way reads as a button inside a button. Two marks are bold, for the
// 10px status dots that used to ask for `strokeWidth={3}`.
//
// `strokeWidth` IS GONE. The artwork is filled, not stroked, so there is no line
// to thicken and the prop could only ever have been ignored. Its four call sites
// were changed in the same commit — two to `checkBold`/`xBold`, two to nothing
// at all, since a large decorative glyph needs no help.
import { ART } from "./icons.art";

/**
 * A mark from the set, sized and coloured by the caller through `className`.
 *
 * Both duotone layers take `currentColor`, so one text colour drives the whole
 * icon: the backdrop is that colour at 20% and the foreground is it at full
 * strength. That is what lets the sidebar hand each section its own accent
 * without the icon needing to know which section it is drawing for.
 */
export function Icon({ name, className = "h-5 w-5" }) {
  const [back, fore] = ART[name] || ART.dot;
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      {back ? <path d={back} opacity="0.2" /> : null}
      <path d={fore} />
    </svg>
  );
}

// Every name the set answers to. Exported so a caller can assert against it
// instead of discovering a typo as a stray dot on the page — which is exactly
// what the console's adapter does in development.
export const iconNames = Object.freeze(Object.keys(ART).sort());
