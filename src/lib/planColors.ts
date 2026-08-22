// Package colours, and NOTHING else.
//
// Deliberately its own module with no imports: the console's studio table is a
// client component and needs these, while everything that resolves a plan needs
// the catalogue, which needs Redis. Keeping the palette here is what stops a
// colour lookup from pulling a database client into the browser bundle.

// A package's colour is now any hex the author picks. These four are the
// starting points the product ships with, offered as swatches beside the picker
// — and they are also what the ORIGINAL name-based values map to, so packages
// saved as "green" before the picker existed still render correctly.
export const PRESETS = [
  { name: "green", hex: "#10b981" },
  { name: "yellow", hex: "#eab308" },
  { name: "orange", hex: "#f97316" },
  { name: "red", hex: "#f43f5e" },
  { name: "grey", hex: "#64748b" },
];

const NAME_HEX = Object.fromEntries(PRESETS.map((p) => [p.name, p.hex]));
export const DEFAULT_HEX = NAME_HEX.grey;

export const isHex = (v: unknown) => /^#[0-9a-f]{6}$/i.test(String(v || ""));

// Accepts a hex, one of the legacy names, or nothing. Always returns a hex, so
// everything downstream deals in one kind of value.
export function normalizeColor(v: unknown) {
  const s = String(v || "").trim();
  if (isHex(s)) return s.toLowerCase();
  return NAME_HEX[s.toLowerCase()] || "";
}

// The four names the product ships with, matched to the package they belong to.
export const hexForName = (name: string) =>
  NAME_HEX[String(name || "").trim().toLowerCase()] || DEFAULT_HEX;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// A badge needs several colours from one, and the right ones differ by theme.
//
// DARK MODE WAS THE BUG. The text colour is derived by DARKENING the hex, which
// reads well on a pale wash over a light page — and badly on the same wash over
// a dark one, where dark-on-dark is what you get. So both are produced here and
// the stylesheet picks: `fg` on light, `fgDark` on dark.
//
// The gradient stops are the same hue lightened and darkened a little, which is
// what makes the tag look like a struck piece of metal rather than a flat
// swatch — the shine is that gradient plus a highlight swept across it in CSS.
export function toneOf(color: unknown) {
  const hex = normalizeColor(color) || DEFAULT_HEX;
  const [r, g, b] = rgb(hex);
  // Perceived brightness (ITU-R BT.601). Anything light gets darkened harder,
  // so yellow reads as brown-on-cream rather than yellow-on-cream.
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  const k = lum > 170 ? 0.45 : lum > 110 ? 0.62 : 0.78;
  const dark = [r, g, b].map((c) => Math.round(c * k));
  // On a dark page the text goes the other way — toward white — and a dim
  // colour is lifted further than a bright one so both stay legible.
  const lift = lum < 80 ? 0.72 : lum < 140 ? 0.5 : 0.34;
  const light = [r, g, b].map((c) => Math.round(c + (255 - c) * lift));
  const shade = (f: number) => `rgb(${[r, g, b].map((c) => Math.round(Math.min(255, c * f))).join(", ")})`;
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    bgDark: `rgba(${r}, ${g}, ${b}, 0.26)`,
    fg: `rgb(${dark[0]}, ${dark[1]}, ${dark[2]})`,
    fgDark: `rgb(${light[0]}, ${light[1]}, ${light[2]})`,
    // Top-lit: brighter along the top edge, deeper at the bottom.
    metal: `linear-gradient(160deg, ${shade(1.35)} 0%, ${shade(1.05)} 38%, ${shade(0.82)} 62%, ${shade(1.12)} 100%)`,
    hex,
  };
}
