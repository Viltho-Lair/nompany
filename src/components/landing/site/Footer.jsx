"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { reopenAnalyticsConsent } from "@/components/landing/chrome/AnalyticsConsent";
import { getDict } from "@/shared/i18n";
import { companyCopy } from "@/shared/marketing/company";
import { ANALYTICS_HOSTS, consentCopy } from "@/shared/marketing/consent";
import { chromeCopy } from "@/shared/marketing/chrome";
import { heroCopy } from "@/shared/marketing/hero";
import { homeCopy } from "@/shared/marketing/home";
import { Forward } from "./Chrome";
import { useSite } from "./locale";
import { ShaderField } from "./ShaderField";
import { Cta } from "./primitives";

const WORD = "nompany";

/**
 * THE FOOTER IS UNDER THE PAGE, NOT AFTER IT. It is fixed, and its parent
 * clips it, so the page lifts off it like a curtain rather than scrolling into
 * it. The gradient comes back underneath, and the wordmark's letters rise
 * toward the cursor as it passes over them.
 *
 * EVERY ENTRY RESOLVES, as on the footer it replaces: two groups of pages that
 * exist, named from the site dictionary so the nav, the footer and the page
 * cannot call one page three different things. The cookie-settings button is
 * here because withdrawing consent must be as easy as giving it.
 */
export function CurtainFooter() {
  const { locale } = useSite();
  const nav = getDict(locale).nav;
  const home = homeCopy(locale);
  const chrome = chromeCopy(locale);
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // Fixed content is always "in view" to an observer, so the parent is watched
  // instead; the shader only draws while the curtain is actually open.
  const open = useInView(ref);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const lift = useTransform(scrollYProgress, [0, 1], [90, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);
  const mouseX = useMotionValue(-99999);
  const [analyticsHost, setAnalyticsHost] = useState(false);
  useEffect(() => {
    if (ANALYTICS_HOSTS.includes(location.hostname)) queueMicrotask(() => setAnalyticsHost(true));
  }, []);

  const groups = [
    [
      { href: `/${locale}/platform`, label: nav.platform },
      { href: `/${locale}/pricing`, label: nav.pricing },
      { href: `/${locale}/security`, label: nav.security },
      { href: `/${locale}/contact`, label: nav.contact },
    ],
    [
      { href: `/${locale}/about`, label: nav.about },
      { href: `/${locale}/careers`, label: nav.careers },
      { href: `/${locale}/terms`, label: nav.terms },
      { href: `/${locale}/privacy`, label: nav.privacy },
    ],
  ];

  return (
    <footer
      ref={ref}
      className="relative h-[100dvh] min-h-[640px]"
      style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
      onPointerMove={(e) => {
        if (!reduce && e.pointerType === "mouse") mouseX.set(e.clientX);
      }}
      onPointerLeave={() => mouseX.set(-99999)}
    >
      <div className="fixed bottom-0 left-0 h-[100dvh] min-h-[640px] w-full overflow-hidden bg-[#07070a]">
        <div className="absolute inset-0 opacity-70">
          <ShaderField intensity={0.75} active={open} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#07070a] to-transparent" />

        <motion.div
          style={reduce ? undefined : { y: lift, scale }}
          className="relative mx-auto flex h-full max-w-[1280px] flex-col justify-between px-6 pb-6 pt-24 md:px-10 md:pt-32"
        >
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="max-w-[16ch] text-[2.4rem] font-medium leading-[1.05] tracking-[-0.04em] md:text-[4rem]">{home.closingTitle}</h2>
              <p className="mt-6 max-w-[46ch] text-[16px] leading-relaxed text-white/65">{home.closingLead}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Cta href={`/api/intent?locale=${locale}`}>
                  {heroCopy(locale).ctaPrimary}
                  <Forward />
                </Cta>
                <Cta href={`/${locale}/pricing`} variant="ghost">
                  {chrome.seePricing}
                </Cta>
              </div>
            </div>
            <nav aria-label="nompany" className="grid grid-cols-2 gap-8 text-[14px] lg:col-span-4 lg:col-start-9">
              {groups.map((col, c) => (
                <ul key={c} className="space-y-3">
                  {col.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-white/60 transition-colors duration-200 hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </nav>
          </div>

          <div>
            <p aria-label={WORD} dir="ltr" className="flex select-none justify-center text-[24vw] font-semibold leading-[0.8] tracking-[-0.07em] lg:text-[21vw]">
              {WORD.split("").map((ch, k) => (
                <Letter key={k} ch={ch} mouseX={mouseX} still={reduce} />
              ))}
            </p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 text-[12px] text-white/40">
              <p className="max-w-[60ch] leading-relaxed">{companyCopy(locale).description}</p>
              <div className="flex items-center gap-5">
                {analyticsHost ? (
                  <button type="button" onClick={reopenAnalyticsConsent} className="transition-colors hover:text-white">
                    {consentCopy(locale).settings}
                  </button>
                ) : null}
                <span dir="ltr">© {new Date().getFullYear()} nompany</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

function Letter({ ch, mouseX, still }) {
  const ref = useRef(null);
  const center = useRef(0);
  const width = useRef(1);

  useEffect(() => {
    function measure() {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      center.current = r.left + r.width / 2;
      width.current = r.width;
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Nearness, 0..1, over about two and a half letters either side.
  const near = useTransform(mouseX, (x) => Math.max(0, 1 - Math.abs(x - center.current) / (width.current * 2.4)));
  const y = useSpring(
    useTransform(near, (v) => -v * 0.32 * width.current),
    { stiffness: 260, damping: 20, mass: 0.6 },
  );
  const opacity = useTransform(near, (v) => 0.18 + v * 0.82);

  return (
    <motion.span ref={ref} aria-hidden="true" style={still ? { opacity: 0.2 } : { y, opacity }} className="inline-block text-[#ececf1]">
      {ch}
    </motion.span>
  );
}
