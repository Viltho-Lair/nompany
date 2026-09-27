"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/landing/Logo";
import { Grain } from "@/components/landing/site/Chrome";
import { ShaderField } from "@/components/landing/site/ShaderField";
import { rememberLocale } from "@/lib/langCookie";
import { dirFor, LANGUAGE_SHORT, locales } from "@/shared/locale";

/* THE SIGN-IN SCREENS IN THE HOME PAGE'S WORLD (27/09/2026).
   ------------------------------------------------------------------
   The same dark ground, the same pointer-reactive field — subdued, and held
   back behind a scrim so it never argues with the form — the same glass and
   the same grain. No header and no footer: the only chrome is the mark (the way
   back home) and the language switch. `Nav` and `Footer` stand down on these
   routes by themselves.

   THE ENTRANCE IS CSS KEYFRAMES, NEVER MOTION'S `initial`. Motion would write
   `opacity:0` into the server HTML's style attribute; a keyframe's first frame
   hides nothing from a reader that does not run it. The card arrives out of
   focus and settles once, a beat after the heading; a step inside it (email →
   code) crossfades through a short blur when it mounts. Nothing waits on the
   animation — every field takes a keystroke from first paint — and all of it
   stands down under reduced motion.

   THE H1-H4 RULE is the same one SiteShell carries: the base layer sets every
   heading in the old display face and brand navy, and here they inherit the
   page's own face and ink. Unlayered, so it beats the base layer. */
const AUTH_CSS =
  ".auth-root :is(h1,h2,h3,h4){font-family:inherit;color:inherit}" +
  "@keyframes auth-in{from{opacity:0;transform:translateY(14px) scale(.985);filter:blur(12px)}to{opacity:1;transform:none;filter:none}}" +
  "@keyframes auth-step{from{opacity:0;transform:translateY(4px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}" +
  "@keyframes auth-fade{from{opacity:0}to{opacity:1}}" +
  "@media (prefers-reduced-motion:no-preference){" +
  ".auth-root .auth-in{animation:auth-in .8s cubic-bezier(.23,1,.32,1) both;animation-delay:var(--auth-delay,0s)}" +
  ".auth-root .auth-bg{animation:auth-fade 1.4s cubic-bezier(.23,1,.32,1) both}" +
  ".auth-root .auth-step{animation:auth-step .4s cubic-bezier(.23,1,.32,1) both}" +
  "}";

// Two locales, so a toggle rather than a dropdown. Each link keeps the current
// sub-path (…/login, …/signup, …/forgot) and only swaps the locale segment, so
// somebody switching language on the sign-up page stays on sign-up.
//
// It also records the choice (see rememberLocale). This is the FIRST screen most
// people meet, and it is the last one with a locale in its address: whatever is
// picked here is what the studio on the other side of the login should open in.
function LocaleSwitch({ locale }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.replace(/^\/(en|ar)/, "") || "";
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.05] p-1 ring-1 ring-inset ring-white/10 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
      {locales.map((code) => {
        const active = code === locale;
        return (
          <Link
            key={code}
            href={`/${code}${rest}`}
            lang={code}
            onClick={() => rememberLocale(code)}
            aria-current={active ? "true" : undefined}
            className={`inline-flex h-8 min-w-10 items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] ${
              active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {LANGUAGE_SHORT[code]}
          </Link>
        );
      })}
    </div>
  );
}

export function AuthScene({ locale = "en", title, subtitle, aside, children }) {
  const rtl = dirFor(locale) === "rtl";
  return (
    <div
      dir={dirFor(locale)}
      lang={locale}
      className="auth-root relative isolate min-h-[100dvh] overflow-x-clip bg-[#07070a] text-[#ececf1] antialiased selection:bg-[#8b7cff]/30"
      style={{
        fontFamily: rtl
          ? "var(--f-readex), ui-sans-serif, system-ui, sans-serif"
          : "var(--f-geist), var(--f-readex), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{AUTH_CSS}</style>

      {/* The home page's field, quieter: lower intensity, lower opacity, and a
          scrim over the middle so the card reads on the dark rather than on the
          light of the field. The canvas follows the pointer across the window. */}
      <div aria-hidden="true" className="auth-bg pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-60">
          <ShaderField intensity={0.6} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_52%,rgba(7,7,10,0.86)_0%,rgba(7,7,10,0.55)_55%,rgba(7,7,10,0.15)_100%)]" />
      </div>

      <div className="absolute end-4 top-4 z-20 sm:end-6 sm:top-6">
        <LocaleSwitch locale={locale} />
      </div>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col justify-center px-4 pb-16 pt-24 sm:pt-20">
        <div className="auth-in text-center">
          <Link
            href={`/${locale}`}
            dir="ltr"
            className="mx-auto mb-9 flex w-fit items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07070a]"
          >
            <LogoMark size={30} priority />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">nompany</span>
          </Link>
          <h1 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[2.4rem] rtl:leading-[1.3] rtl:tracking-normal">
            {title}
          </h1>
          {subtitle ? <p className="mx-auto mt-3 max-w-[36ch] text-[15px] leading-relaxed text-[#9d9dab]">{subtitle}</p> : null}
        </div>

        <div
          className="auth-in mt-9 rounded-3xl bg-white/[0.035] p-6 ring-1 ring-inset ring-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_40px_100px_-30px_rgba(24,16,80,0.8)] sm:p-8"
          style={{ "--auth-delay": "0.12s" }}
        >
          {children}
        </div>

        {aside ? (
          <div className="auth-in mt-6 text-center text-[14px] text-[#8f8f9c]" style={{ "--auth-delay": "0.2s" }}>
            {aside}
          </div>
        ) : null}
      </div>

      <Grain />
    </div>
  );
}
