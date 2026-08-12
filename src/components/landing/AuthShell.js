"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AmbientBackground } from "@/components/landing/AmbientBackground";
import { LogoMark, Wordmark } from "@/components/landing/Logo";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { EASE_OUT_EXPO } from "@/components/landing/lib/motion";

/* ==================================================================
   Full-screen frame for the auth screens, in the landing page's design
   language: same palette, same ambient background, same surface card.

   Deliberately has no header and no footer — the only chrome is the
   wordmark, which doubles as the way back to the landing page. `Nav`
   and `Footer` suppress themselves on these routes (see BARE_ROUTES).
================================================================== */

export default function AuthShell({ locale = "en", title, subtitle, children, aside }) {
  return (
    <div dir="ltr" className="landing-page relative flex min-h-screen flex-col items-center justify-center px-5 py-14">
      <PointerProvider>
        <AmbientBackground />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          className="relative z-10 w-full max-w-md"
        >
          <Link
            href={`/${locale}`}
            className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-iris-bright focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
          >
            <LogoMark size={30} priority />
            <Wordmark className="text-[1.15rem]" />
          </Link>

          <div className="text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2.5 text-sm text-fg-muted">{subtitle}</p>}
          </div>

          <div className="surface mt-8 rounded-2xl p-7">{children}</div>

          {aside && <div className="mt-6 text-center text-sm text-fg-muted">{aside}</div>}
        </motion.div>
      </PointerProvider>
    </div>
  );
}
