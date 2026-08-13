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

export const isHex = (v) => /^#[0-9a-f]{6}$/i.test(String(v || ""));

// Accepts a hex, one of the legacy names, or nothing. Always returns a hex, so
// everything downstream deals in one kind of value.
export function normalizeColor(v) {
  const s = String(v || "").trim();
  if (isHex(s)) return s.toLowerCase();
  return NAME_HEX[s.toLowerCase()] || "";
}

// The four names the product ships with, matched to the package they belong to.
export const hexForName = (name) =>
  NAME_HEX[String(name || "").trim().toLowerCase()] || DEFAULT_HEX;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// A badge needs two colours from one: a wash to sit on, and text dark enough to
// read on it. Derived rather than stored, so picking a colour is one decision
// instead of three, and a pale pick can never produce unreadable text.
export function toneOf(color) {
  const hex = normalizeColor(color) || DEFAULT_HEX;
  const [r, g, b] = rgb(hex);
  // Perceived brightness (ITU-R BT.601). Anything light gets darkened harder,
  // so yellow reads as brown-on-cream rather than yellow-on-cream.
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  const k = lum > 170 ? 0.45 : lum > 110 ? 0.62 : 0.78;
  const dark = [r, g, b].map((c) => Math.round(c * k));
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    fg: `rgb(${dark[0]}, ${dark[1]}, ${dark[2]})`,
    hex,
  };
}
