"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import { BASE } from "./nav";

// The two authentication layouts from the reference console.
//
//   v1 — a single centred card floating on the page background, with slow
//        pulsing primary-tinted blobs behind it.
//   v2 — a 40/60 split: a gradient brand panel carrying the value props, and
//        the same card on the right. This is the layout /super itself uses for
//        the super-admin sign-in.
//
// Nothing here posts anywhere: /super is a design surface, so every form is
// inert (`onSubmit` is prevented) and no credential ever leaves the page.

export function Logo({ invert = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white"
        style={{ backgroundColor: invert ? "rgba(255,255,255,.18)" : "var(--ad-primary)" }}
      >
        n
      </span>
      <span className="text-lg font-semibold" style={invert ? { color: "#fff" } : undefined}>
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

function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="absolute left-[10%] top-[15%] h-[300px] w-[300px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05]" />
      <span className="absolute right-[15%] top-[30%] h-[150px] w-[150px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.1] [animation-delay:1s]" />
      <span className="absolute bottom-[20%] left-[20%] h-[200px] w-[200px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.08] [animation-delay:2s]" />
      <span className="absolute bottom-[10%] right-[10%] h-[250px] w-[250px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05] [animation-delay:0.5s]" />
    </div>
  );
}

export function AuthShell({ variant = "v1", title, sub, children, footer, width = 440 }) {
  const card = (
    <div className="relative z-10 w-full px-4" style={{ maxWidth: width }}>
      <div
        className="rounded-lg border p-8 shadow-lg"
        style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-card)" }}
      >
        {variant === "v1" ? (
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
        ) : null}
        <h4 className="mb-1 text-center text-xl font-medium">{title}</h4>
        {sub ? <p className="mb-6 text-center text-sm text-[var(--ad-muted-foreground)]">{sub}</p> : null}
        {children}
      </div>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );

  if (variant === "v2") {
    return (
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <div
          className="relative flex h-[60px] w-full shrink-0 items-center justify-center overflow-hidden lg:h-auto lg:w-[40%] lg:items-start lg:justify-start lg:px-12 lg:py-16"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--ad-primary), color-mix(in srgb, var(--ad-primary) 85%, #000) 55%, color-mix(in srgb, var(--ad-primary) 65%, #000))",
          }}
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="absolute left-[-10%] top-[-10%] h-[300px] w-[300px] rounded-full bg-white/5" />
            <span className="absolute bottom-[-5%] right-[-5%] h-[250px] w-[250px] rounded-full bg-white/5" />
          </div>
          <div className="relative z-10 flex lg:block">
            <Logo invert />
          </div>
          <div className="relative z-10 mt-12 hidden lg:block">
            <h2 className="text-3xl font-bold text-white">Your all-in-one platform console</h2>
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
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-sm text-white/70">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 lg:px-12">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="absolute right-[10%] top-[10%] h-[200px] w-[200px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05]" />
            <span className="absolute bottom-[15%] left-[5%] h-[150px] w-[150px] animate-pulse rounded-full bg-[var(--ad-primary)] opacity-[0.05] [animation-delay:1s]" />
          </div>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <Blobs />
      {card}
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
        className="absolute top-1/2 -translate-y-1/2 text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)] ltr:right-3 rtl:left-3"
      >
        <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SocialRow() {
  const socials = [
    { name: "Google", d: "M21.35 11.1H12v3.2h5.35c-.23 1.5-1.75 4.4-5.35 4.4a6.2 6.2 0 110-12.4c1.77 0 2.96.75 3.64 1.4l2.48-2.4C16.6 3.7 14.5 2.8 12 2.8a9.2 9.2 0 100 18.4c5.3 0 8.8-3.7 8.8-8.9 0-.6-.06-1-.15-1.2z" },
    { name: "Twitter", d: "M22 5.9c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 00-7 3.7A11.6 11.6 0 013.4 4.6a4.1 4.1 0 001.3 5.5c-.7 0-1.3-.2-1.9-.5a4.1 4.1 0 003.3 4c-.6.2-1.2.2-1.8.1a4.1 4.1 0 003.8 2.9A8.3 8.3 0 012 18.4a11.6 11.6 0 006.3 1.8c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.2z" },
    { name: "GitHub", d: "M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0012 2z" },
  ];
  return (
    <div className="mt-6">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: "var(--ad-border)" }} />
        <span className="shrink-0 px-2 text-xs text-[var(--ad-muted-foreground)]">Or continue with</span>
        <div className="h-px flex-1" style={{ backgroundColor: "var(--ad-border)" }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {socials.map((s) => (
          <button key={s.name} type="button" className="ad-btn ad-btn-outline" aria-label={`Continue with ${s.name}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d={s.d} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AuthFooterLinks({ prompt, linkLabel, href }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm font-medium">{prompt}</p>
      <Link href={href} className="text-sm font-medium text-[var(--ad-primary)] hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

/* ---- assembled screens --------------------------------------------------- */

export function LoginScreen({ variant = "v1", email = "" }) {
  return (
    <AuthShell variant={variant} title="Login" sub="Welcome back! Please enter your credentials.">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <Field label="Email">
            <input type="email" className="ad-input" defaultValue={email} placeholder="you@example.com" />
          </Field>
          <Field
            label="Password"
            action={
              <Link href={`${BASE}/${variant}/forgot-password`} className="text-sm font-medium text-[var(--ad-primary)] hover:underline">
                Forgot Password?
              </Link>
            }
          >
            <PasswordInput />
          </Field>
          <div className="flex items-center gap-2">
            <input id={`remember-${variant}`} type="checkbox" className="ad-check" defaultChecked />
            <label htmlFor={`remember-${variant}`} className="cursor-pointer text-sm">
              Remember me
            </label>
          </div>
          <button type="submit" className="ad-btn ad-btn-primary">
            Sign In
          </button>
        </div>
      </form>
      <SocialRow />
      <AuthFooterLinks prompt="Don't have an account?" linkLabel="Create Account" href={`${BASE}/${variant}/register`} />
    </AuthShell>
  );
}

export function RegisterScreen({ variant = "v1" }) {
  return (
    <AuthShell variant={variant} title="Create Account" sub="Start managing the platform in minutes.">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name">
              <input className="ad-input" placeholder="Abdullah" />
            </Field>
            <Field label="Last name">
              <input className="ad-input" placeholder="Abu Hammed" />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" className="ad-input" placeholder="you@example.com" />
          </Field>
          <Field label="Password">
            <PasswordInput />
          </Field>
          <Field label="Confirm password">
            <PasswordInput />
          </Field>
          <div className="flex items-start gap-2">
            <input id={`terms-${variant}`} type="checkbox" className="ad-check mt-0.5" />
            <label htmlFor={`terms-${variant}`} className="cursor-pointer text-sm">
              I agree to the <span className="text-[var(--ad-primary)]">Terms</span> and{" "}
              <span className="text-[var(--ad-primary)]">Privacy Policy</span>
            </label>
          </div>
          <button type="submit" className="ad-btn ad-btn-primary">
            Create Account
          </button>
        </div>
      </form>
      <SocialRow />
      <AuthFooterLinks prompt="Already have an account?" linkLabel="Sign In" href={`${BASE}/${variant}/login`} />
    </AuthShell>
  );
}

export function ForgotScreen({ variant = "v1" }) {
  return (
    <AuthShell variant={variant} title="Forgot Password" sub="Enter your email and we'll send a reset link.">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <Field label="Email">
            <input type="email" className="ad-input" placeholder="you@example.com" />
          </Field>
          <button type="submit" className="ad-btn ad-btn-primary">
            Send Reset Link
          </button>
        </div>
      </form>
      <AuthFooterLinks prompt="Remembered it?" linkLabel="Back to Sign In" href={`${BASE}/${variant}/login`} />
    </AuthShell>
  );
}

export function ResetScreen({ variant = "v1" }) {
  return (
    <AuthShell variant={variant} title="Reset Password" sub="Choose a new password for your account.">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <Field label="New password">
            <PasswordInput />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput />
          </Field>
          <ul className="space-y-1 text-xs text-[var(--ad-muted-foreground)]">
            {["At least 12 characters", "One uppercase letter", "One number or symbol"].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <Icon name="check" className="h-3.5 w-3.5 text-[var(--ad-success)]" />
                {r}
              </li>
            ))}
          </ul>
          <button type="submit" className="ad-btn ad-btn-primary">
            Update Password
          </button>
        </div>
      </form>
      <AuthFooterLinks prompt="Changed your mind?" linkLabel="Back to Sign In" href={`${BASE}/${variant}/login`} />
    </AuthShell>
  );
}

export function OtpScreen({ variant = "v1", title, sub, cta, length = 6 }) {
  return (
    <AuthShell variant={variant} title={title} sub={sub}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <div className="flex justify-center gap-2.5">
            {Array.from({ length }, (_, i) => (
              <input
                key={i}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                className="ad-input h-12 w-11 text-center text-lg font-semibold"
              />
            ))}
          </div>
          <button type="submit" className="ad-btn ad-btn-primary">
            {cta}
          </button>
          <p className="text-center text-sm text-[var(--ad-muted-foreground)]">
            Didn't receive a code? <span className="font-medium text-[var(--ad-primary)]">Resend</span>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}

export function LockScreen({ variant = "v1", user }) {
  return (
    <AuthShell variant={variant} title="Screen Locked" sub="Enter your password to continue.">
      <div className="mb-6 flex flex-col items-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ad-primary) 80%, #fff), var(--ad-primary))" }}
        >
          {user.initials}
        </span>
        <p className="mt-3 text-sm font-semibold">{user.name}</p>
        <p className="text-xs text-[var(--ad-muted-foreground)]">{user.email}</p>
      </div>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-5">
          <Field label="Password">
            <PasswordInput />
          </Field>
          <button type="submit" className="ad-btn ad-btn-primary">
            Unlock
          </button>
        </div>
      </form>
      <AuthFooterLinks prompt="Not you?" linkLabel="Sign in as someone else" href={`${BASE}/${variant}/login`} />
    </AuthShell>
  );
}

export function NoticeScreen({ variant = "v1", icon, tone = "primary", title, sub, cta, ctaHref, secondary }) {
  const tones = {
    primary: { bg: "rgba(70,128,255,.12)", fg: "var(--ad-primary)" },
    success: { bg: "rgba(44,168,127,.14)", fg: "var(--ad-success)" },
    warning: { bg: "rgba(229,138,0,.14)", fg: "var(--ad-warning)" },
    danger: { bg: "rgba(220,38,38,.14)", fg: "var(--ad-destructive)" },
  };
  const t = tones[tone];
  return (
    <AuthShell variant={variant} title={title} sub={sub}>
      <div className="flex flex-col items-center">
        <span
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: t.bg, color: t.fg }}
        >
          <Icon name={icon} className="h-7 w-7" strokeWidth={1.6} />
        </span>
        {cta ? (
          <Link href={ctaHref} className="ad-btn ad-btn-primary w-full">
            {cta}
          </Link>
        ) : null}
        {secondary ? <div className="mt-4 text-center text-sm text-[var(--ad-muted-foreground)]">{secondary}</div> : null}
      </div>
    </AuthShell>
  );
}
