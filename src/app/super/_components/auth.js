"use client";

import { useState } from "react";
import Icon from "./Icon";

// THE SUPER-ADMIN SIGN-IN'S CHROME, and nothing else any more.
//
// This file was the reference console's whole authentication kit: two layouts
// (v1 centred card, v2 brand split) and nine assembled screens — login,
// register, forgot, reset, verify, two-factor, lock, account-disabled,
// password-changed — each rendered at /super/v1/* and /super/v2/*, eighteen
// routes of inert markup with `onSubmit` prevented so no credential ever left
// the page.
//
// They are gone, and the one that mattered is the register pair: THERE IS NO
// REGISTRATION FOR THE CONSOLE. A super admin is an existing user marked as
// one — `superAuth` has no create path and never had — so a register form on
// this surface described a door that does not exist. Inert markup is still a
// claim, and a URL is still a URL: it invited a reviewer to ask which door it
// opened, and the honest answer was "none, but you have to read the source to
// know that".
//
// What remains is what SignIn.js actually renders: the brand split, the two
// form parts, and the logo. The v1 layout went with the pages that used it —
// SignIn has always passed v2 — so `AuthShell` no longer takes a variant, and
// the pulsing-blob background that only v1 drew is gone with it.

export function Logo({ invert = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-700 text-white"
        style={{ backgroundColor: invert ? "rgb(var(--ad-primary-foreground-rgb) / 0.18)" : "var(--ad-primary)" }}
      >
        n
      </span>
      <span className="text-lg font-600" style={invert ? { color: "var(--ad-primary-foreground)" } : undefined}>
        nompany
      </span>
    </span>
  );
}

const FEATURES = [
  {
    icon: "shield",
    title: "Enterprise Security",
    body: "Bank-grade encryption and two-factor authentication keep platform data safe.",
  },
  {
    icon: "zap",
    title: "Blazing Fast",
    body: "Optimised performance with real-time updates and instant data access.",
  },
  {
    icon: "chart",
    title: "Powerful Analytics",
    body: "Deep insights and customisable dashboards to drive better decisions.",
  },
];

// The brand split: a gradient panel carrying the value props, and the sign-in
// card beside it. One layout now, so there is no variant to choose.
export function AuthShell({ title, sub, children, footer, width = 440 }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div
        className="relative flex h-[60px] w-full shrink-0 items-center justify-center overflow-hidden lg:h-auto lg:w-[40%] lg:items-start lg:justify-start lg:px-12 lg:py-16"
        style={{
          backgroundImage:
            "linear-gradient(135deg, var(--ad-primary), color-mix(in srgb, var(--ad-primary) 85%, var(--ad-foreground)) 55%, color-mix(in srgb, var(--ad-primary) 65%, var(--ad-foreground)))",
        }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute start-[-10%] top-[-10%] h-[300px] w-[300px] rounded-full bg-white/5" />
          <span className="absolute bottom-[-5%] end-[-5%] h-[250px] w-[250px] rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 flex lg:block">
          <Logo invert />
        </div>
        <div className="relative z-10 mt-12 hidden lg:block">
          <h2 className="text-3xl font-700 text-white">Your all-in-one platform console</h2>
          <p className="mt-3 text-base text-white/70">
            Manage every studio, subscription and setting with clarity, speed and confidence.
          </p>
          <ul className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-600 text-white">{f.title}</p>
                  <p className="mt-0.5 text-sm text-white/70">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 lg:px-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute end-[10%] top-[10%] h-[200px] w-[200px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05]" />
          <span className="absolute bottom-[15%] start-[5%] h-[150px] w-[150px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05] [animation-delay:1s]" />
        </div>
        <div className="relative z-10 w-full px-4" style={{ maxWidth: width }}>
          <div
            className="rounded-lg border p-8 shadow-lg"
            style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-card)" }}
          >
            <h4 className="mb-1 text-center text-xl font-500">{title}</h4>
            {sub ? <p className="mb-6 text-center text-sm text-[var(--ad-muted-foreground)]">{sub}</p> : null}
            {children}
          </div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ---- form parts ---------------------------------------------------------- */

export function Field({ label, action, children }) {
  return (
    <div className="grid gap-2">
      {label ? (
        action ? (
          <div className="flex items-center justify-between">
            <label className="ad-label mb-0">{label}</label>
            {action}
          </div>
        ) : (
          <label className="ad-label mb-0">{label}</label>
        )
      ) : null}
      {children}
    </div>
  );
}

export function PasswordInput({ defaultValue = "", placeholder = "••••••••", ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="ad-input pe-10"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 -translate-y-1/2 text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)] end-3"
      >
        <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
      </button>
    </div>
  );
}

