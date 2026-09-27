"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "./Icon";
import { FIELD, HINT, LABEL, PRIMARY } from "@/components/landing/site/pages/auth/ui";

// THE SUPER-ADMIN SIGN-IN'S CHROME, and nothing else.
//
// This file was the reference console's whole authentication kit — nine
// assembled screens on eighteen routes — and then, once those were deleted, the
// template's brand split: a blue gradient panel beside a card, carrying three
// value props ("Enterprise Security", "Blazing Fast", "Powerful Analytics")
// that were the template's words rather than ours and a letter "n" in a square
// where the logo belongs. It looked like somebody else's admin kit because it
// was. The owner, 18/09/2026: "it doesn't look like a nompany super admin
// login".
//
// IT WEARS THE PUBLIC SITE'S DESIGN (27/09/2026) — its #07070a ground, its
// violet, its glass card and the very field and button classes the account
// sign-in at /<locale>/login is drawn with (`site/pages/auth/ui`, which imports
// no Motion, so the console may). Until then it wore the OLD marketing palette
// (ink/iris/gold and `.surface`), which the site had left behind. Two
// deliberate differences from that screen:
//
//   IT IS ALWAYS DARK. The `dark` class on the frame keeps this subtree dark
//   whatever theme the visitor last chose, because the console's
//   door should look the same every time it is opened.
//
//   IT DOES NOT IMPORT `landing/AuthShell`. That scene draws a WebGL field and
//   the site's grain; the console route would pay for them on a login seen
//   once a day. The background here is the field's colour without the field —
//   two violet glows on the CSS `blob` keyframes — so nothing crosses the wire
//   for it.
//
// The template's value props are not replaced by ours. A sign-in for one
// person has nobody to sell to; what it says instead is what this door is.

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/brand/logo-icon.png" alt="" width={34} height={34} priority className="h-[34px] w-[34px] object-contain" />
      <span className="text-[1.2rem] font-medium tracking-[-0.03em] text-[#ececf1]">nompany</span>
    </span>
  );
}

export function AuthShell({ title, sub, children, footer }) {
  return (
    <div className="dark relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#07070a] px-4 py-14 text-[#ececf1] antialiased selection:bg-[#8b7cff]/30 [font-family:var(--f-geist),var(--f-readex),system-ui,sans-serif] [&_:is(h1,h2,h3)]:[font-family:inherit] [&_:is(h1,h2,h3)]:text-inherit">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-[20vh] start-[8vw] h-[60vh] w-[60vh] animate-blob-a rounded-full opacity-50 blur-[110px] motion-reduce:animate-none"
          style={{ background: "radial-gradient(circle at 40% 40%, rgb(139 124 255 / 0.55), transparent 68%)" }}
        />
        <div
          className="absolute -end-[12vw] top-[40vh] h-[65vh] w-[65vh] animate-blob-b rounded-full opacity-40 blur-[130px] motion-reduce:animate-none"
          style={{ background: "radial-gradient(circle at 55% 45%, rgb(24 16 80 / 0.85), transparent 70%)" }}
        />
        {/* A faint grid, masked to the middle, so the page has depth without
            anything competing with the form. */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#ececf1 1px, transparent 1px), linear-gradient(90deg, #ececf1 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#c9c2ff] ring-1 ring-inset ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Platform console
          </span>
        </div>

        <div className="rounded-3xl bg-white/[0.035] p-7 ring-1 ring-inset ring-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_-30px_rgba(24,16,80,0.85)] sm:p-8">
          <h1 className="text-center text-[1.75rem] font-medium tracking-[-0.035em]">{title}</h1>
          {sub ? <p className={`mt-2 text-center ${HINT}`}>{sub}</p> : null}
          <div className="mt-7">{children}</div>
        </div>

        {footer ? <div className="mt-6 text-center text-xs text-[#8f8f9c]">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---- form parts ---------------------------------------------------------- */

// The site's own sign-in field and button, so the two doors cannot drift apart.
export const inputClass = FIELD;
export const buttonClass = `${PRIMARY} mt-1 w-full`;
export const hintClass = HINT;

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
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
        className={`${inputClass} pe-11`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/45 transition-colors hover:text-white"
      >
        <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
      </button>
    </div>
  );
}
