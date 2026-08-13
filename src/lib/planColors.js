// Package colours, and NOTHING else.
//
// Deliberately its own module with no imports: the console's studio table is a
// client component and needs these, while everything that resolves a plan needs
// the catalogue, which needs Redis. Keeping the palette here is what stops a
// colour lookup from pulling a database client into the browser bundle.
export const PACKAGE_COLORS = ["green", "yellow", "orange", "red", "grey"];

export const PACKAGE_TONE = {
  green: { bg: "rgba(16,185,129,0.14)", fg: "#047857" },
  yellow: { bg: "rgba(234,179,8,0.16)", fg: "#a16207" },
  orange: { bg: "rgba(249,115,22,0.16)", fg: "#c2410c" },
  red: { bg: "rgba(244,63,94,0.14)", fg: "#be123c" },
  grey: { bg: "rgba(100,116,139,0.14)", fg: "#475569" },
};

export const toneOf = (color) => PACKAGE_TONE[color] || PACKAGE_TONE.grey;
