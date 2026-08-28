
import { useStudioLocale } from "@/components/studio2/locale";
import { miscDict } from "@/shared/studio/misc";// NOVA'S HEAD, static. The landing mascot (components/landing/mascot) draws on
// motion/react, which the studio chunk is fenced from (Gate A), so this is the
// same character — skull, visor, cyan eyes, antenna — as a plain SVG the studio
// may use. Self-contained gradients with literal colours so it reads on any page
// without depending on the landing's --color-* tokens.
//
// `idle` adds a gentle CSS bob and an antenna pulse (keyframes in globals.css),
// off under reduced-motion. No library.
export default function NovaHead({ className = "h-9 w-9", idle = false }) {
  const tr = miscDict(useStudioLocale());
  return (
    <svg viewBox="42 26 156 150" className={`${className} ${idle ? "nova-bob" : ""}`} fill="none" role="img" aria-label={tr.nova}>
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
      <path d="M120 62V44" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="38" r="7" fill="#22d3ee" className={idle ? "nova-antenna" : ""} />

      {/* Skull + visor */}
      <rect x="58" y="62" width="124" height="98" rx="34" fill="url(#nh-body)" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="72" y="82" width="96" height="58" rx="26" fill="url(#nh-visor)" opacity="0.18" />
      <rect x="72" y="82" width="96" height="58" rx="26" fill="none" stroke="url(#nh-visor)" strokeWidth="1.5" opacity="0.75" />

      {/* Eyes */}
      {[98, 142].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="111" rx="13" ry="14" fill="#0b1020" />
          <circle cx={x} cy="111" r="7" fill="#22d3ee" />
          <circle cx={x - 2.4} cy="108.4" r="2.2" fill="#ffffff" opacity="0.9" />
        </g>
      ))}

      {/* Smile */}
      <path d="M108 132q12 8 24 0" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
    </svg>
  );
}
