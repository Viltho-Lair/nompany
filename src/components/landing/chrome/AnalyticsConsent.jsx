"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import {
  ANALYTICS_HOSTS,
  CONSENT_COOKIE,
  CONSENT_REOPEN_EVENT,
  GA_MEASUREMENT_ID,
  analyticsRunsOn,
  consentCopy,
} from "@/shared/marketing/consent";

/* ==================================================================
   THE COOKIE BANNER, THE PREFERENCES PANEL, AND THE ONLY LOADER OF
   GOOGLE'S TAG — in the site's design (27/09/2026).

   `shared/marketing/consent.ts` holds the rules; this is their
   enforcement. The tag is built HERE rather than pasted as the inline
   <script> Google hands out: the page must not load it before a yes,
   which an inline tag cannot wait for.

   TWO CATEGORIES, NOT THREE. Strictly necessary (always on) and
   Analytics. There is no Marketing switch because nompany sets no
   marketing or advertising cookies; a toggle for a category that does
   not exist would imply tracking that is not there.

   THE CHOICE IS STILL ONE COOKIE, `granted` or `denied`, so a visitor
   who answered the old banner keeps their answer.

   THE TAG RUNS ONLY WHERE THE PRIVACY POLICY SAYS IT DOES. Once loaded
   it would follow a client navigation onto the blog or the legal pages,
   so on every navigation Google's own per-page switch
   (`ga-disable-<id>`) is set from `analyticsRunsOn`.
================================================================== */

function readConsent() {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

// Same shape as the theme and language cookies: a year, lax, secure on https.
function writeConsent(value) {
  try {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax${secure}`;
  } catch {
    // A browser refusing cookies is asked again next visit; nothing loads meanwhile.
  }
}

// WITHDRAWING HAS TO REMOVE WHAT ACCEPTING WROTE. Google's cookies are set on
// the registrable domain (`.nompany.com`), so both spellings are cleared.
function clearGoogleCookies() {
  try {
    for (const part of document.cookie.split("; ")) {
      const name = part.split("=")[0];
      if (name !== "_ga" && !name.startsWith("_ga_")) continue;
      const host = location.hostname.replace(/^www\./, "");
      for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) {
        document.cookie = `${name}=; path=/; max-age=0${domain}`;
      }
    }
  } catch {
    // Nothing to clear is the same outcome.
  }
}

let loaded = false;

function loadAnalytics() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // `arguments`, not a rest array: gtag.js reads each dataLayer entry as an
  // Arguments object and ignores a plain array.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

const PILL =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-5 text-[14px] font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]";
// Accept and reject share one look: equal weight is what makes it a choice.
const CHOICE = `${PILL} bg-white/[0.07] text-[#ececf1] ring-1 ring-inset ring-white/15 hover:bg-white/[0.12]`;
const PRIMARY = `${PILL} bg-[#ececf1] text-[#0b0b10] hover:bg-white`;
const EASE = [0.23, 1, 0.32, 1];

export function AnalyticsConsent({ locale }) {
  const tr = consentCopy(locale);
  const pathname = usePathname() || "";
  const reduce = useReducedMotion();
  const [stage, setStage] = useState("closed"); // closed | banner | prefs
  const [analytics, setAnalytics] = useState(false);
  const [live, setLive] = useState(false);

  // Ask once, on the live host only. In development, `?consent-preview` shows
  // the banner on any host so it can be looked at; the tag itself still loads
  // only on the live host (below), so a preview never reports to Google.
  useEffect(() => {
    const preview = process.env.NODE_ENV !== "production" && new URLSearchParams(location.search).has("consent-preview");
    if (!preview && !ANALYTICS_HOSTS.includes(location.hostname)) return undefined;
    const choice = preview ? "" : readConsent();
    // Deferred a tick so nothing is set synchronously inside the effect.
    queueMicrotask(() => {
      setLive(true);
      setAnalytics(choice === "granted");
      if (!choice) setStage("banner");
    });
    const reopen = () => {
      setAnalytics(readConsent() === "granted");
      setStage("prefs");
    };
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  // Load (once) and gate (every navigation) by the page the reader is on.
  useEffect(() => {
    if (!live || readConsent() !== "granted" || !ANALYTICS_HOSTS.includes(location.hostname)) return;
    const allowed = analyticsRunsOn(pathname);
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = !allowed;
    if (allowed) loadAnalytics();
  }, [live, pathname, stage]);

  const decide = useCallback((granted) => {
    writeConsent(granted ? "granted" : "denied");
    setAnalytics(granted);
    if (!granted) {
      window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
      if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
      clearGoogleCookies();
    }
    setStage("closed");
  }, []);

  if (!live) return null;

  const policyLinks = (
    <>
      <Link href={`/${locale}/cookies`} className="text-[#c9c2ff] underline decoration-[#8b7cff]/40 underline-offset-4 hover:text-white">
        {tr.cookiesLink}
      </Link>
      {" · "}
      <Link href={`/${locale}/privacy`} className="text-[#c9c2ff] underline decoration-[#8b7cff]/40 underline-offset-4 hover:text-white">
        {tr.privacyLink}
      </Link>
    </>
  );

  return (
    <AnimatePresence>
      {stage === "banner" ? (
        <motion.div
          key="banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-banner-title"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 210, damping: 30, opacity: { duration: 0.4, ease: EASE } }}
          className="fixed inset-x-4 bottom-4 z-[65] rounded-3xl bg-[#0d0d14]/85 p-6 ring-1 ring-inset ring-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_80px_-20px_rgba(0,0,0,0.7)] sm:end-auto sm:max-w-[460px] sm:start-4"
        >
          <p id="cookie-banner-title" className="text-[16px] font-medium text-[#ececf1]">
            {tr.title}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-white/65">
            {tr.body} {policyLinks}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => decide(true)} className={CHOICE}>
              {tr.acceptAll}
            </button>
            <button type="button" onClick={() => decide(false)} className={CHOICE}>
              {tr.rejectAll}
            </button>
            <button type="button" onClick={() => setStage("prefs")} className="ms-1 text-[14px] text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white">
              {tr.manage}
            </button>
          </div>
        </motion.div>
      ) : null}

      {stage === "prefs" ? (
        <Preferences
          key="prefs"
          tr={tr}
          reduce={reduce}
          links={policyLinks}
          analytics={analytics}
          setAnalytics={setAnalytics}
          onSave={() => decide(analytics)}
          onAcceptAll={() => decide(true)}
          onRejectAll={() => decide(false)}
          // Closing without choosing leaves the question open: the banner
          // comes back if nothing was ever answered.
          onClose={() => setStage(readConsent() ? "closed" : "banner")}
        />
      ) : null}
    </AnimatePresence>
  );
}

function Preferences({ tr, reduce, links, analytics, setAnalytics, onSave, onAcceptAll, onRejectAll, onClose }) {
  const panel = useRef(null);

  // A modal: Escape closes it, focus starts inside it and stays there.
  useEffect(() => {
    const prev = document.activeElement;
    panel.current?.querySelector("button")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const f = [...panel.current.querySelectorAll("button, a[href]")].filter((el) => !el.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[66] grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[#07070a]/70 backdrop-blur-sm" />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
        transition={{ type: "spring", stiffness: 260, damping: 28, opacity: { duration: 0.3, ease: EASE } }}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[520px] overflow-y-auto rounded-3xl bg-[#0d0d14]/95 p-6 ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_120px_-20px_rgba(0,0,0,0.8)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="cookie-prefs-title" className="text-[1.35rem] font-medium tracking-[-0.02em] text-[#ececf1] rtl:tracking-normal">
            {tr.prefsTitle}
          </h2>
          <button type="button" onClick={onClose} aria-label={tr.close} className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 ring-1 ring-inset ring-white/10 transition-colors hover:text-white">
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-white/65">
          {tr.prefsBody} {links}
        </p>

        <div className="mt-6 space-y-3">
          <Row title={tr.necessaryTitle} body={tr.necessaryBody}>
            <span className="text-[12px] text-white/45">{tr.alwaysOn}</span>
            <Switch checked disabled label={tr.necessaryTitle} />
          </Row>
          <Row title={tr.analyticsTitle} body={tr.analyticsBody}>
            <Switch checked={analytics} onChange={setAnalytics} label={tr.analyticsTitle} />
          </Row>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRejectAll} className={CHOICE}>
            {tr.rejectAll}
          </button>
          <button type="button" onClick={onAcceptAll} className={CHOICE}>
            {tr.acceptAll}
          </button>
          <button type="button" onClick={onSave} className={`${PRIMARY} sm:ms-auto`}>
            {tr.save}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ title, body, children }) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.07]">
      <div>
        <p className="text-[15px] font-medium text-[#ececf1]">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/55">{body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">{children}</div>
    </div>
  );
}

function Switch({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] disabled:cursor-not-allowed ${
        checked ? (disabled ? "bg-[#8b7cff]/45" : "bg-[#8b7cff]") : "bg-white/15"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-200 ease-out ${checked ? "start-[22px]" : "start-0.5"}`}
      />
    </button>
  );
}

/** The footer's way back to the choice — withdrawing must be as easy as giving. */
export function reopenAnalyticsConsent() {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}
