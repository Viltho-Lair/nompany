import { SiteShell } from "@/components/landing/site/SiteShell";

/* THE NEW SITE'S CHROME, MOUNTED ONCE (27/09/2026).
   ------------------------------------------------------------------
   A ROUTE GROUP, so the address is unchanged: `(site)/page.js` serves
   `/<locale>` exactly as `(marketing)/page.js` did. Pages move here from
   `(marketing)` one at a time as each is rebuilt in the new design; when the
   last has moved, `(marketing)` and MarketingShell go.

   GEIST LIVES IN app/fonts.ts NOW, beside the other faces: the account hub
   and the studio set it too since 27/09/2026, so it is on <html> for everyone.

   THE MOTION BOOT runs before first paint. It marks <html> so the elements the
   page will animate start hidden instead of flashing in settled and vanishing
   on hydration — and takes the mark away after 2.5s if the bundle never
   arrived, so a failed load leaves a still page rather than a blank one.
   Nothing is marked for somebody who asked for reduced motion. It also skips
   the intro for somebody who has seen it this session. An ATTRIBUTE, not a
   class: React owns <html>'s className. See SiteShell for the rules it arms. */
const BOOT =
  "(function(){try{var d=document.documentElement;try{if(sessionStorage.getItem('nompany-intro')==='1')d.setAttribute('data-site-intro-seen','')}catch(e){}" +
  "if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.setAttribute('data-site-motion','');" +
  "setTimeout(function(){if(!window.__siteMotion)d.removeAttribute('data-site-motion')},2500)}catch(e){}})()";

export default async function SiteLayout({ children, params }) {
  const { locale } = await params;
  return (
    <div>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <SiteShell locale={locale}>{children}</SiteShell>
    </div>
  );
}
