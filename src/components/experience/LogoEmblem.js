// The brand emblem: an abstract nompany mark inside a rotating dashed prism ring
// with a soft brand halo. Fills its parent; shared by the scroll-path logo and
// the Clients-Feedback centrepiece so the two match exactly.
export default function LogoEmblem({ className = "" }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-[spin_28s_linear_infinite]">
        <circle cx="100" cy="100" r="88" fill="none" stroke="url(#np-ring)" strokeWidth="1.4" strokeDasharray="16 8 4 8" />
        <circle
          cx="100"
          cy="100"
          r="74"
          fill="none"
          stroke="rgba(37,99,235,0.14)"
          strokeWidth="1"
          strokeDasharray="3 9"
          className="animate-[spin_16s_linear_infinite_reverse]"
          style={{ transformOrigin: "center" }}
        />
        <defs>
          <linearGradient id="np-ring" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute h-24 w-24 rounded-full bg-brand-500/10 blur-2xl md:h-28 md:w-28" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-icon.png" alt="" className="relative h-16 w-16 object-contain md:h-20 md:w-20" />
    </div>
  );
}
