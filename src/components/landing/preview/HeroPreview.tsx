"use client";

import Link from "next/link";
import { dirFor } from "@/shared/locale";
import { heroCopy } from "@/shared/marketing/hero";
import { LandingLocaleProvider } from "@/components/landing/locale";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { HeroV1Assembly } from "@/components/landing/hero/variants/HeroV1Assembly";
import { HeroV2Scroll } from "@/components/landing/hero/variants/HeroV2Scroll";

/* ==================================================================
   THE HERO PREVIEW SHELL — three variants, one URL each, judged side
   by side rather than from a description.

   IT BRINGS THE LANDING'S CHROME AND NOT THE ACCOUNT'S: `.landing-page`
   for the dark palette, the ambient layer, the pointer provider V1's
   tilt reads from. Nav.js and Footer.js suppress themselves on
   /<locale>/preview/* via BARE_PREFIXES.

   NO PRELOADER, deliberately — the spec removes it, and a preview that
   reintroduced the thing being removed would be judging the wrong page.

   THIS FILE IS DELETED with the route in the commit that adopts a
   winner. It is scaffolding, and scaffolding that outlives the build
   becomes a page nobody meant to publish.
================================================================== */

export type VariantId = "v1" | "v2" | "v3";

const VARIANTS: VariantId[] = ["v1", "v2", "v3"];

export default function HeroPreview({
  locale,
  variant,
}: {
  locale: string;
  variant: VariantId;
}) {
  const tr = heroCopy(locale);

  return (
    <div dir={dirFor(locale)} className="landing-page relative min-h-screen">
      <LandingLocaleProvider locale={locale}>
        <PointerProvider>
          <AmbientBackground />

          {/* The switcher. Plain links, so each variant is a real
              server-rendered document rather than a client swap — which is
              the property being judged. */}
          <div className="relative z-50 mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 pt-6 text-xs">
            <span className="text-fg-dim">{tr.previewLabel}</span>
            <div className="surface ms-auto flex items-center gap-1 rounded-full p-1">
              {VARIANTS.map((v) => (
                <Link
                  key={v}
                  href={`/${locale}/preview/hero/${v}`}
                  className={`rounded-full px-3 py-1.5 transition-colors ${
                    v === variant
                      ? "bg-gradient-to-br from-iris to-violet text-white"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {tr.variantLabels[v]}
                </Link>
              ))}
            </div>
            {/* Both languages from the same bar — the spec requires every page
                to be opened in both before it is called done, and a hero is
                judged on how the Arabic sits as much as on the English. */}
            <Link
              href={`/${locale === "ar" ? "en" : "ar"}/preview/hero/${variant}`}
              className="surface rounded-full px-3 py-1.5 text-fg-muted transition-colors hover:text-fg"
            >
              {locale === "ar" ? "EN" : "عربي"}
            </Link>
          </div>

          {variant === "v1" && <HeroV1Assembly locale={locale} />}
          {variant === "v2" && <HeroV2Scroll locale={locale} />}
        </PointerProvider>
      </LandingLocaleProvider>
    </div>
  );
}
