"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ANALYTICS_HOSTS,
  CONSENT_COOKIE,
  CONSENT_REOPEN_EVENT,
  GA_MEASUREMENT_ID,
  consentCopy,
} from "@/shared/marketing/consent";

/* ==================================================================
   THE ANALYTICS BANNER, AND THE ONLY LOADER OF GOOGLE'S TAG.

   `shared/marketing/consent.ts` holds the rules; this is their
   enforcement. The tag is built HERE rather than pasted as the inline
   <script> Google hands out, for two reasons: the page must not load
   it before a yes, which an inline tag cannot wait for, and every
   inline script is one more thing standing between the CSP and
   dropping 'unsafe-inline'.
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

export function AnalyticsConsent({ locale }) {
  const [open, setOpen] = useState(false);
  const tr = consentCopy(locale);

  useEffect(() => {
    if (!ANALYTICS_HOSTS.includes(location.hostname)) return undefined;
    const choice = readConsent();
    if (choice === "granted") loadAnalytics();
    // Deferred a tick so the banner is not a synchronous render inside the
    // effect; nothing is decided by the delay.
    else if (choice !== "denied") queueMicrotask(() => setOpen(true));
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const decide = (granted) => {
    writeConsent(granted ? "granted" : "denied");
    if (granted) loadAnalytics();
    else {
      if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
      clearGoogleCookies();
    }
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-ink-soft/95 p-5 shadow-2xl backdrop-blur-xl"
    >
      <p id="analytics-consent-title" className="text-sm font-medium text-fg">{tr.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {tr.body}{" "}
        <Link href={`/${locale}/privacy`} className="underline underline-offset-2 hover:text-fg">
          {tr.privacyLink}
        </Link>
      </p>
      {/* Equal weight on purpose: a consent that is one bright button and one
          grey word is not a free choice, and regulators say so. */}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => decide(true)}
          className="rounded-full border border-line px-5 py-2 text-sm font-medium text-fg transition-colors hover:bg-ink"
        >
          {tr.accept}
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          className="rounded-full border border-line px-5 py-2 text-sm font-medium text-fg transition-colors hover:bg-ink"
        >
          {tr.decline}
        </button>
      </div>
    </div>
  );
}

/** The footer's way back to the choice — withdrawing must be as easy as giving. */
export function reopenAnalyticsConsent() {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}
