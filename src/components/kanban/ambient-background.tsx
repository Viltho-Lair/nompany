import type { CSSProperties } from "react";

/**
 * Fixed, non-interactive backdrop: a gradient mesh of slow-drifting blobs over
 * a faint grid.
 *
 * Performance note — the blobs are painted with `radial-gradient`, NOT with a
 * solid fill plus `filter: blur()`. A blurred disc *is* a radial falloff, so the
 * two look the same, but the filtered version forces the compositor to
 * re-rasterise a ~120px blur over a ~700px box on every frame it moves, and
 * every `backdrop-filter` surface above it then has to re-sample that result.
 * Gradients rasterise once and the drift becomes a transform-only composite.
 *
 * The elements are sized larger than the old blurred divs because a blur bleeds
 * past the element box while a gradient is confined to it.
 */

type Blob = {
  className: string;
  /** Peak colour at the centre of the falloff. */
  rgb: string;
  alpha: number;
  style?: CSSProperties;
};

const BLOBS: Blob[] = [
  {
    // violet-600
    className: "-left-[16%] -top-[24%] size-[58rem]",
    rgb: "124, 58, 237",
    alpha: 0.3,
  },
  {
    // sky-500
    className: "-right-[14%] top-[2%] size-[48rem]",
    rgb: "14, 165, 233",
    alpha: 0.24,
    style: { animationDelay: "-4s", animationDuration: "18s" },
  },
  {
    // fuchsia-500
    className: "bottom-[-28%] start-[18%] size-[52rem]",
    rgb: "217, 70, 239",
    alpha: 0.2,
    style: { animationDelay: "-9s", animationDuration: "22s" },
  },
  {
    // emerald-400
    className: "bottom-[-16%] end-[14%] size-[40rem]",
    rgb: "52, 211, 153",
    alpha: 0.16,
    style: { animationDelay: "-14s", animationDuration: "26s" },
  },
];

export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Gradient mesh */}
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-float opacity-[0.82] dark:opacity-100 ${blob.className}`}
          style={{
            backgroundImage: `radial-gradient(closest-side, rgba(${blob.rgb}, ${blob.alpha}) 0%, rgba(${blob.rgb}, ${blob.alpha * 0.55}) 42%, rgba(${blob.rgb}, ${blob.alpha * 0.18}) 66%, transparent 82%)`,
            // Promote to its own layer so the drift never repaints the page.
            willChange: "transform",
            ...blob.style,
          }}
        />
      ))}

      {/* Hairline grid, masked so it fades toward the edges. Static: rasterised
          once, never animated. */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />

      {/*
        Film grain. Deliberately NOT `mix-blend-mode: overlay`: a full-screen
        blend layer forces the entire stack beneath it to composite as one unit,
        which defeats layer isolation for every glass surface on the board.
        Plain opacity keeps the texture at a fraction of the cost.
      */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Top vignette so the sticky header always has contrast */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
    </div>
  );
}
