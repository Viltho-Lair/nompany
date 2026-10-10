"use client";

import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";

// NOVA'S HEAD, static. The landing mascot (components/landing/mascot) draws on
// motion/react, which the studio chunk is fenced from (Gate A), so this is the
// same character — skull, visor, cyan eyes, antenna — as a plain SVG the studio
// may use. Self-contained gradients with literal colours so it reads on any page
// without depending on the landing's --color-* tokens.
//
// THE LOOK IS THE ONE THE INTRO ENDS ON (nova/introFrames.ts, the owner's choice of
// 11/10/2026): a DARK visor with the indigo → violet → cyan rim, and cyan capsule
// eyes. The visor used to be an 18% tint of that gradient over the pale skull,
// which left dark eyes on a pale face. Keep the two in step: the intro rebuilds
// the logo into exactly these six parts.
//
// `idle` adds a gentle CSS bob, an antenna pulse and a blink (keyframes in
// globals.css), all off under reduced-motion. No library. The blink squashes the
// eyes to a line and never hides them. The landing mascot dropped its blink
// because an eyelid covering dark eyes read as the eyes VANISHING; a bright
// capsule that flattens for a moment does not.
//
// `label` overrides the accessible name for a surface outside the studio's
// locale provider — the account hub's walkthrough — which would otherwise read
// the English default in an Arabic account.
export default function NovaHead({ className = "h-9 w-9", idle = false, label = "" }) {
  const tr = miscDict(useStudioLocale());
  return (
    <svg viewBox="42 26 156 150" className={`${className} ${idle ? "nova-bob" : ""}`} fill="none" role="img" aria-label={label || tr.nova}>
      <defs>
        <linearGradient id="nh-body" x1="60" y1="50" x2="185" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f1f5ff" />
          <stop offset="100%" stopColor="#c7d0ea" />
        </linearGradient>
        <linearGradient id="nh-visor" x1="72" y1="82" x2="168" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <path d="M120 62V44" stroke="#94a3b8" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="120" cy="38" r="7.5" fill="#22d3ee" className={idle ? "nova-antenna" : ""} />

      {/* Skull + visor */}
      <rect x="58" y="62" width="124" height="98" rx="34" fill="url(#nh-body)" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="72" y="82" width="96" height="58" rx="26" fill="#161b3f" stroke="url(#nh-visor)" strokeWidth="2" />

      {/* Eyes */}
      <g className={idle ? "nova-blink" : ""}>
        {[98, 142].map((x) => (
          <g key={x}>
            <rect x={x - 7} y="102" width="14" height="18" rx="7" fill="#22d3ee" />
            <circle cx={x - 2.4} cy="107.8" r="2" fill="#ffffff" opacity="0.85" />
          </g>
        ))}
      </g>

      {/* Smile */}
      <path d="M108 130q12 8 24 0" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
    </svg>
  );
}
