"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowLeft, ArrowRight, Menu, X } from "lucide-react";
import LangMenu from "@/components/LangMenu";
import { LogoMark } from "@/components/landing/Logo";
import { useAccount } from "@/components/landing/nav/useAccount";
import { initialsOf } from "@/lib/initials";
import { getDict } from "@/shared/i18n";
import { LANGUAGE_NAMES, LANGUAGE_SHORT, locales } from "@/shared/locale";
import { blogCopy } from "@/shared/marketing/blog";
import { chromeCopy } from "@/shared/marketing/chrome";
import { useSite } from "./locale";
import { Cta, EASE, SPRING } from "./primitives";

const MARK = "site-mark";
export const INTRO_KEY = "nompany-intro";

/** The arrow that points the way the page reads. */
export function Forward({ size = 16 }) {
  const { rtl } = useSite();
  const Icon = rtl ? ArrowLeft : ArrowRight;
  return <Icon size={size} strokeWidth={2} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />;
}

/**
 * THE PAGE IS COUNTED IN — the home page, once a session. A ring fills to 100
 * around the mark, then the mark flies to its place in the header (a shared
 * layout transition on `layoutId`) and the curtain lifts. 1.2 seconds.
 *
 * It steps aside at once for somebody who asked for less motion or has already
 * seen it this session; the boot script has hidden it by then anyway, so this
 * only releases the page. A fallback timer finishes it if the count never does.
 */
export function Intro({ onDone }) {
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => String(Math.round(v)).padStart(3, "0"));
  const dash = useTransform(count, [0, 100], [0, 1]);

  useEffect(() => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    if (reduce || document.documentElement.hasAttribute("data-site-intro-seen")) {
      done();
      return undefined;
    }
    const run = animate(count, 100, {
      duration: 1.2,
      ease: [0.65, 0, 0.35, 1],
      onComplete: () => setTimeout(done, 140),
    });
    const fallback = setTimeout(done, 2600);
    return () => {
      run.stop();
      clearTimeout(fallback);
    };
  }, [count, onDone, reduce]);

  return (
    <motion.div
      aria-hidden="true"
      className="site-intro fixed inset-0 z-[70] grid place-items-center bg-[#07070a]"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE, delay: 0.18 } }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative grid size-28 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#8b7cff" strokeWidth="1.5" strokeLinecap="round" style={{ pathLength: dash }} />
          </svg>
          <motion.div layoutId={MARK} className="size-10">
            <LogoMark size={40} priority />
          </motion.div>
        </div>
        <motion.span className="font-mono text-[12px] tabular-nums tracking-[0.2em] text-white/45" dir="ltr">
          {shown}
        </motion.span>
      </div>
    </motion.div>
  );
}

/**
 * A floating glass header that steps out of the way on the way down and comes
 * back on the way up. Signed out it offers Log in and Start free; signed in,
 * the person's own picture and a menu. The language menu keeps the reader on
 * the same page in the other language, by a full load, because a language
 * change is a change of document direction.
 */
export function SiteNav() {
  const { locale, ready } = useSite();
  const tr = chromeCopy(locale);
  const nav = getDict(locale).nav;
  const account = useAccount();
  const pathname = usePathname() || `/${locale}`;
  const rel = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const [acct, setAcct] = useState(false);

  const links = [
    { href: `/${locale}/platform`, label: nav.platform },
    { href: `/${locale}/pricing`, label: nav.pricing },
    { href: `/${locale}/security`, label: nav.security },
    { href: `/${locale}/about`, label: nav.about },
    { href: `/${locale}/blog`, label: blogCopy(locale).title },
    { href: `/${locale}/contact`, label: nav.contact },
  ];
  const langOptions = locales.map((code) => ({
    code,
    label: LANGUAGE_NAMES[code],
    short: LANGUAGE_SHORT[code],
    href: `/${code}${rel}`,
  }));

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    const next = v > prev && v > 240;
    setHidden((h) => (h === next ? h : next));
  });

  useEffect(() => {
    if (!menu && !acct) return undefined;
    const close = () => {
      setMenu(false);
      setAcct(false);
    };
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, acct]);

  const quiet = "rounded-full px-3.5 py-2 text-[14px] text-white/60 transition-colors duration-200 hover:text-white";
  const show = !hidden || menu || acct;

  return (
    <motion.header
      initial={false}
      animate={{ y: show ? 0 : -96, opacity: show ? 1 : 0 }}
      transition={SPRING}
      className="fixed inset-x-0 top-4 z-50 px-4"
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full bg-[#0d0d14]/60 pe-2 ps-4 ring-1 ring-inset ring-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5" aria-label={tr.nompanyHome}>
          {ready ? (
            <motion.div layoutId={MARK} transition={{ type: "spring", stiffness: 140, damping: 22 }} className="size-7">
              <LogoMark size={28} />
            </motion.div>
          ) : (
            <span className="size-7" />
          )}
          <span className="text-[15px] font-semibold tracking-[-0.02em]" dir="ltr">
            nompany
          </span>
        </Link>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={quiet}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <div className="hidden text-white/70 sm:block">
            <LangMenu
              current={locale}
              options={langOptions}
              label={tr.language}
              align="end"
              tone="site"
              triggerClass="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-white/60 transition-colors hover:text-white"
            />
          </div>
          {account === undefined ? (
            <span className="size-9" />
          ) : account ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setAcct((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={acct}
                aria-label={account.name || account.email || tr.yourAccount}
                className="block rounded-full"
              >
                {account.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a stored data URI
                  <img src={account.photo} alt="" className="size-9 rounded-full object-cover ring-1 ring-white/15" />
                ) : (
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#8b7cff] text-[12px] font-semibold text-white">
                    {initialsOf(account.name || account.email)}
                  </span>
                )}
              </button>
              {acct ? (
                <div role="menu" className="absolute end-0 mt-3 w-60 overflow-hidden rounded-2xl bg-[#101018]/95 py-1 ring-1 ring-white/10 backdrop-blur-xl">
                  <p className="truncate px-4 py-2 text-[12px] text-white/45">{account.email}</p>
                  <Link role="menuitem" href={`/${locale}/account`} className="block px-4 py-2.5 text-[14px] text-white/75 hover:bg-white/5 hover:text-white">
                    {tr.goToAccount}
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={async () => {
                      await fetch("/api/identity/logout", { method: "POST" });
                      window.location.assign(`/${locale}`);
                    }}
                    className="block w-full px-4 py-2.5 text-start text-[14px] text-rose-400 hover:bg-rose-500/10"
                  >
                    {tr.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link href={`/${locale}/login`} className={`hidden sm:block ${quiet}`}>
                {tr.logIn}
              </Link>
              <Cta href={`/api/intent?locale=${locale}`} size="sm">
                {tr.startFree}
                <Forward size={14} />
              </Cta>
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((o) => !o);
            }}
            aria-expanded={menu}
            aria-label={nav.menu}
            className="grid size-9 place-items-center rounded-full text-white/70 hover:text-white lg:hidden"
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {menu ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mx-auto mt-2 max-w-6xl rounded-3xl bg-[#0d0d14]/90 p-3 ring-1 ring-inset ring-white/10 backdrop-blur-xl lg:hidden"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-2xl px-4 py-3 text-[15px] text-white/80 hover:bg-white/5">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-white/10 px-2 pt-3">
            {langOptions.map((o) => (
              <a
                key={o.code}
                href={o.href}
                lang={o.code}
                className={`rounded-full px-4 py-2 text-[14px] ${o.code === locale ? "bg-white/10 text-white" : "text-white/60"}`}
              >
                {o.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </motion.header>
  );
}

/**
 * THE RECORD'S THREAD. One line of light runs the length of the page along its
 * starting edge, drawn by the scroll, with a bright head where the reader is —
 * the page's own version of the one record carried through every department.
 */
export function Thread() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const headY = useTransform(p, (v) => `${(v - 1) * 100}%`);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 start-5 z-40 hidden w-px lg:block xl:start-8">
      <div className="absolute inset-0 bg-white/[0.06]" />
      <motion.div style={{ scaleY: p }} className="absolute inset-0 origin-top bg-gradient-to-b from-[#8b7cff]/0 via-[#8b7cff]/60 to-[#b4aaff]" />
      <motion.div style={{ y: headY }} className="absolute inset-x-0 top-0 h-full">
        <span className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#d6d0ff] shadow-[0_0_18px_5px_rgba(139,124,255,0.55)]" />
      </motion.div>
    </div>
  );
}

/** Film grain on a fixed, non-interactive layer: it never repaints with the scroll. */
export function Grain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
