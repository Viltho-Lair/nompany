"use client";

import { usePathname } from "next/navigation";
import { dirFor } from "@/shared/locale";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { TopNav } from "@/components/landing/nav/TopNav";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { SiteFooter } from "./SiteFooter";
import { AnalyticsConsent } from "./AnalyticsConsent";

/* ==================================================================
   ONE CHROME FOR EVERY PUBLIC PAGE.

   The home page brought its own dark shell while platform, pricing,
   security and about inherited the account layout's light editorial
   header and footer — so following a link from the home page landed
   you on what looked like a different website, with a different
   palette, a different nav and a different footer. Two chromes on one
   site is a bug you notice before you notice any of the copy.

   THE PAGES INSIDE THIS ARE SERVER COMPONENTS and stay that way. This
   is a client shell because the nav reads a session and the footer
   reads the locale context, but `children` is passed THROUGH it — a
   server-rendered subtree handed to a client parent, which React
   supports and which is what keeps the prices, the department list and
   the security practices in the HTML.

   `overflow-x: clip` IS LOAD-BEARING, not tidiness — see the note on
   `.landing-page` in globals.css.
================================================================== */

export function MarketingShell({ locale = "en", children }) {
  const pathname = usePathname() || "";
  const isHome = pathname.replace(/\/$/, "") === `/${locale}`;
  return (
    <div dir={dirFor(locale)} className="landing-page relative min-h-screen">
      <LandingLocaleProvider locale={locale}>
        {/* THE CURSOR CONTEXT BELONGS TO THE CHROME, not to the home page.
            `usePointer` is deliberately safe to call outside its provider — it
            hands back inert MotionValues — so `AmbientBackground` has been
            rendering here since this shell was extracted, reading a pointer
            that never moves, and nothing anywhere reported it. It surfaced when
            contact became a route: its mascot follows the cursor, and it would
            have arrived here with dead eyes and a passing build.

            A component must not change behaviour by changing address, so the
            provider moved to where the components that read it are. Every
            marketing route gets the drift the home page always had. */}
        <PointerProvider>
          <AmbientBackground />
          <TopNav locale={locale} />
          {/* The nav is fixed, so the content needs its height back — except
              on the home page, where the hero sits under the nav by design.
              Decided HERE rather than by the home page bringing a shell of its
              own: that is what it used to do, and it meant the header was torn
              down and rebuilt on every click between home and any other page.
              A <div>, not a <main>: `[locale]/layout.js` already wraps every
              page in the one main landmark a document may have. */}
          <div className={isHome ? undefined : "pt-28 lg:pt-32"}>{children}</div>
          <SiteFooter locale={locale} />
          {/* The ONLY place Google Analytics can load — marketing pages, after
              a yes. See shared/marketing/consent.ts. */}
          <AnalyticsConsent locale={locale} />
        </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
