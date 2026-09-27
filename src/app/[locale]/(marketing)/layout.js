import { MarketingShell } from "@/components/landing/chrome/MarketingShell";

/* ONE CHROME, MOUNTED ONCE.
   ------------------------------------------------------------------
   EVERY ONE OF THESE PAGES USED TO BRING ITS OWN SHELL. Eight pages each
   rendered `<MarketingShell>` around their own content, which is correct output
   and the wrong structure: React can only preserve a subtree that stays
   mounted, and a shell each page carries with it is by definition a different
   subtree every time. So a click from /about to /platform destroyed the nav,
   the footer, the ambient background and the pointer provider, and built them
   again — measured, by tagging the live nodes and finding them gone.

   IT WAS NEVER A FULL PAGE LOAD. The App Router was doing client-side
   navigation correctly the whole time; what it could not do was keep a shell
   the pages owned. Same measurement: `window` state survived while every chrome
   node was replaced.

   A ROUTE GROUP AND NOT A FOLDER, because `(marketing)` is parenthesised and
   parenthesised segments DO NOT APPEAR IN THE URL. Every address is
   byte-identical to what it was — no redirects, no sitemap change, no hreflang
   change. The grouping is invisible to everything outside the repository.

   WHAT IS DELIBERATELY OUTSIDE IT: terms, privacy, account and the auth
   screens. They wear the account chrome, and putting them here would give them
   two.

   AND IT MAKES THE ROUTE LIST STRUCTURAL. `shared/marketing/routes` exists
   because three files each decided independently whether a path is "marketing"
   — and `/contact` reached none of them, so it served the dark shell under the
   light theme's tokens. A page is marketing because of WHERE IT LIVES now,
   which no hand-kept list can drift from. The list still drives the root
   layout's theme and the two navs, and the suite still holds it against the
   pages; what has changed is that being in this folder and being in that list
   are the same fact rather than two facts that have to agree. */
/* THE MOTION BOOT, before first paint (27/09/2026). It marks <html> with
   `data-lh-motion` so the letterhead's reveal-able elements start hidden
   instead of flashing in settled and then vanishing on hydration — and takes
   the mark away after 2.5s if RevealObserver never arrived, so a failed bundle
   leaves a still page rather than a blank one. Nothing is set for somebody who
   asked for reduced motion. An ATTRIBUTE and not a class: React owns <html>'s
   className and would report the difference. See globals.css. */
const MOTION_BOOT = "(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.setAttribute('data-lh-motion','');setTimeout(function(){if(!window.__lhReveal)d.removeAttribute('data-lh-motion')},2500)}catch(e){}})()";

export default async function MarketingLayout({ children, params }) {
  const { locale } = await params;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <MarketingShell locale={locale}>{children}</MarketingShell>
    </>
  );
}
