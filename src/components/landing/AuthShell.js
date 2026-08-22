"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { LogoMark, Wordmark } from "@/components/landing/Logo";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { EASE_OUT_EXPO, fadeUp, stagger } from "@/components/landing/lib/motion";
import { dirFor } from "@/shared/locale";

/* ==================================================================
   Full-screen frame for the auth screens, in the landing page's design
   language: same palette, same ambient background, same surface card.

   Deliberately has no header and no footer — the only chrome is the
   wordmark (which doubles as the way back to the landing) and a language
   switch. `Nav` and `Footer` suppress themselves on these routes.

   DIRECTION FOLLOWS THE LOCALE, because the auth copy is already
   translated — /ar/login renders `dict.auth` in Arabic. It used to sit
   in a hardcoded `dir="ltr"` frame, so the Arabic read left-to-right:
   the label on the wrong side of every field, the OTP "resend" adrift.
   The console (super/_components) passes no locale, so it stays `en`
   → ltr, which is what it wants — the console is English only.

   THE ENTRANCE IS ORCHESTRATED, not a single fade: wordmark, then
   heading, then the card, each on the house EASE_OUT_EXPO a beat after
   the last. A login is a threshold, and a thing that assembles itself in
   order is the quietest way to say what the product is.
================================================================== */

// Two locales, so a toggle rather than a dropdown. Each link keeps the current
// sub-path (…/login, …/signup, …/forgot) and only swaps the locale segment, so
// somebody switching language on the sign-up page stays on sign-up.
function LocaleSwitch({ locale }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  const OPTIONS = [
    { code: "en", label: "EN" },
    { code: "ar", label: "ع" },
  ];
  return (
    <div className="absolute end-5 top-5 z-20 inline-flex items-center gap-0.5 rounded-full border border-line bg-ink-soft/60 p-0.5 backdrop-blur-sm">
      {OPTIONS.map((o) => {
        const active = o.code === locale;
        return (
          <Link
            key={o.code}
            href={`/${o.code}${rest}`}
            lang={o.code}
            aria-current={active ? "true" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-600 transition-colors ${
              active ? "bg-iris text-white" : "text-fg-muted hover:text-fg"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AuthShell({ locale = "en", title, subtitle, children, aside }) {
  return (
    <div dir={dirFor(locale)} className="landing-page relative flex min-h-screen flex-col items-center justify-center px-5 py-14">
      <PointerProvider>
        <AmbientBackground />
        <LocaleSwitch locale={locale} />

        <motion.div
          variants={stagger(0.12, 0.05)}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-md"
        >
          <motion.div variants={fadeUp}>
            <Link
              href={`/${locale}`}
              className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
            >
              <LogoMark size={30} priority />
              <Wordmark className="text-[1.15rem]" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2.5 text-sm text-fg-muted">{subtitle}</p>}
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            className="surface mt-8 rounded-2xl p-7"
          >
            {children}
          </motion.div>

          {aside && (
            <motion.div variants={fadeUp} className="mt-6 text-center text-sm text-fg-muted">
              {aside}
            </motion.div>
          )}
        </motion.div>
      </PointerProvider>
    </div>
  );
}
