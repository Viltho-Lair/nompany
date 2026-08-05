"use client";

import { useState } from "react";
import { Icon } from "@/components/studio/icons";

// Copy-to-clipboard button with confirmation feedback — briefly swaps its label
// to "Copied!" (with a check) so the user knows the copy worked. Used for the
// one-time generated passwords, where silent copies were confusing.
export default function CopyButton({ value, className = "", children = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (e.g. insecure context) — no false confirmation */
    }
  }

  return (
    <button type="button" onClick={doCopy} className={className} aria-live="polite">
      {copied ? (
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <Icon name="check" className="h-4 w-4" /> Copied!
        </span>
      ) : (
        children
      )}
    </button>
  );
}
