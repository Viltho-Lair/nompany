"use client";

// ONE control for "here is a byte-for-byte string, go paste it somewhere
// else" — an OAuth redirect URI, so far. SELECT-ALL on the code itself is the
// fallback for a clipboard a browser or an iframe has blocked; the button is
// the fast path. Shared by the account calendar panel and the console's own
// calendar screen (see docs on calendarRedirectUri/consoleCalendarRedirectUri
// in platform/auth/calendarProviders.ts) rather than each growing its own
// copy of this — a second copy is how the account surface and the console
// end up disagreeing about what "copied" looks like.
//
// Deliberately styling-light: both callers pass their own `className`/
// `codeClassName` because the account surface (Tailwind, bilingual, logical
// properties) and the console (its own `ad-*` kit, English only) are
// different design systems, and this component has no opinion about either.
import { useState } from "react";

export default function CopyableCode({ value, className = "", codeClassName = "", buttonClassName = "", copyLabel = "Copy", copiedLabel = "Copied" }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <code className={`min-w-0 select-all overflow-x-auto whitespace-nowrap font-mono ${codeClassName}`}>{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard access blocked (permissions, an iframe, an older
            // browser) — the value is still select-all, so copying by hand
            // still works. Nothing to show for a failure that has a fallback.
          }
        }}
        className={`shrink-0 ${buttonClassName}`}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </span>
  );
}
