import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";

// WHAT A SECTION CLICK LOOKS LIKE WHILE THE SERVER IS STILL ANSWERING.
//
// THE DEFECT THIS EXISTS FOR. The studio page is `force-dynamic` and there was
// no loading boundary anywhere under app/studio, so the App Router had nothing
// to show and BLOCKED the navigation until the whole RSC payload arrived.
// Measured in the sandbox with a MutationObserver on the page: `firstDomChange:
// null` on every navigation recorded — not one node changed — and the address
// bar itself did not move for 767ms. The click read as broken rather than slow,
// which is the worse of the two, and it is the half of the latency complaint
// that no amount of server work would have fixed.
//
// IT IS THIS SHORT BECAUSE THE SHELL IS A LAYOUT NOW.
//
// It was not always. Before layout.js existed the page WAS the layout, so a
// loading boundary replaced the entire studio — and this file had to redraw the
// whole thing to stop the sidebar blinking out on every click: the fixed w-64
// panel, twelve nav rows, the sticky header, all of it, geometry copied from
// StudioFrame and checked pixel for pixel. Every line of that is deleted. A
// layout PERSISTS across the navigations below it, so the sidebar and the
// header are simply still on screen, and the boundary's whole job is the one
// box that is actually changing.
//
// AND THE DIRECTION GUESS IS GONE WITH IT, which was the uncomfortable part.
// A studio's language is `preferredLocale(cookie, studioLocale(studio))` and the
// tenant's half is a database read, so a boundary — which by definition runs
// before any read — could not know it. This file used to resolve the person's
// `lang` cookie and accept being wrong for one case: a member of an
// Arabic-default studio who had never set a preference saw an LTR skeleton flip
// to RTL. There is nothing left to guess. The layout resolved the studio before
// this renders, StudioFrame has already declared `lang` and `dir`, and a
// skeleton inside it inherits both — correctly, for everybody, always.
//
// ScreenSkeleton reads its own locale from StudioLocaleProvider, which the shell
// supplies for the same reason, so it no longer needs the word handed to it.
export default function StudioLoading() {
  return <ScreenSkeleton />;
}
