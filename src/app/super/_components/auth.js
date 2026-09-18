"use client";

import Image from "next/image";
import { useState } from "react";
import Icon from "./Icon";

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
// IT WEARS THE BRAND NOW — the hexagon mark, the wordmark, and the marketing
// site's ink/iris/gold palette and `.surface` card, the same things the account
// sign-in at /<locale>/login is drawn with. Two deliberate differences from
// that screen:
//
//   IT IS ALWAYS DARK. The `dark` class on the frame scopes the ink palette to
//   this subtree whatever theme the visitor last chose, because the console's
//   door should look the same every time it is opened.
//
//   IT DOES NOT IMPORT `landing/AuthShell`. That shell animates with
//   `motion/react` and a pointer-driven ambient layer; the console route would
//   pay ~30 KB of first load for a login seen once a day, and `motion/react` is
//   confined to `components/landing/` (tests/restructure.mjs). The background
//   here is two blurred gradients on the CSS `blob` keyframes the landing
//   already defines — the same look, and nothing crosses the wire for it.
//
// The template's value props are not replaced by ours. A sign-in for one
// person has nobody to sell to; what it says instead is what this door is.

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/brand/logo-icon.png" alt="" width={34} height={34} priority className="h-[34px] w-[34px] object-contain" />
      <span className="font-display text-[1.2rem] font-semibold tracking-tight text-fg">nompany</span>
    </span>
  );
}

export function AuthShell({ title, sub, children, footer }) {
  return (
    <div className="dark landing-page relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-ink px-4 py-14 text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-[20vh] start-[8vw] h-[60vh] w-[60vh] animate-blob-a rounded-full opacity-50 blur-[110px] motion-reduce:animate-none"
          style={{ background: "radial-gradient(circle at 40% 40%, color-mix(in oklab, var(--color-iris) 80%, transparent), transparent 68%)" }}
        />
        <div
          className="absolute -end-[12vw] top-[40vh] h-[65vh] w-[65vh] animate-blob-b rounded-full opacity-40 blur-[130px] motion-reduce:animate-none"
          style={{ background: "radial-gradient(circle at 55% 45%, color-mix(in oklab, var(--color-violet) 65%, transparent), transparent 70%)" }}
        />
        {/* A faint grid, masked to the middle, so the page has depth without
            anything competing with the form. */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-fg) 1px, transparent 1px), linear-gradient(90deg, var(--color-fg) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-600 uppercase tracking-[0.14em] text-gold">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Platform console
          </span>
        </div>

        <div className="surface rounded-2xl p-7 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] sm:p-8">
          <h1 className="text-center font-display text-2xl font-semibold tracking-tight">{title}</h1>
          {sub ? <p className="mt-2 text-center text-sm text-fg-muted">{sub}</p> : null}
          <div className="mt-7">{children}</div>
        </div>

        {footer ? <div className="mt-6 text-center text-xs text-fg-dim">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---- form parts ---------------------------------------------------------- */

// The field look lives here once, rather than as a className string at each
// input, so the three inputs on this screen cannot drift apart.
export const inputClass =
  "block h-11 w-full rounded-xl border border-line bg-ink-soft/70 px-3.5 text-sm text-fg placeholder:text-fg-dim outline-none transition-colors focus:border-iris-bright/70 focus:ring-2 focus:ring-iris/30";

export function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-600 text-fg-muted">{label}</span>
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
        className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-fg-dim transition-colors hover:text-fg"
      >
        <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
      </button>
    </div>
  );
}
