/**
 * Real paper sizes. Every dimension is stored in millimetres and rendered with
 * CSS `mm` units, so the on-screen sheet is the physical size of the page at
 * the browser's 96dpi reference and printing lands on the same stock.
 *
 * US sizes are exact inch conversions: 8.5in = 215.9mm, 11in = 279.4mm.
 */
export type PagePresetId =
  | "a3"
  | "a4"
  | "a5"
  | "letter"
  | "legal"
  | "tabloid";

export type PagePreset = {
  id: PagePresetId;
  label: string;
  /** Human-readable physical size, shown in the picker. */
  dimensions: string;
  widthMm: number;
  heightMm: number;
  /** The "Normal" margin for this stock. */
  marginMm: number;
  /** Default height of the header and footer band on this stock. */
  bandMm: number;
};

export const PAGE_PRESETS: Record<PagePresetId, PagePreset> = {
  a4: {
    id: "a4",
    label: "A4",
    dimensions: "210 × 297 mm",
    widthMm: 210,
    heightMm: 297,
    marginMm: 20,
    bandMm: 12,
  },
  a5: {
    id: "a5",
    label: "A5",
    dimensions: "148 × 210 mm",
    widthMm: 148,
    heightMm: 210,
    marginMm: 15,
    bandMm: 9,
  },
  a3: {
    id: "a3",
    label: "A3",
    dimensions: "297 × 420 mm",
    widthMm: 297,
    heightMm: 420,
    marginMm: 25,
    bandMm: 14,
  },
  letter: {
    id: "letter",
    label: "Letter",
    dimensions: "8.5 × 11 in",
    widthMm: 215.9,
    heightMm: 279.4,
    marginMm: 25.4,
    bandMm: 12.7,
  },
  legal: {
    id: "legal",
    label: "Legal",
    dimensions: "8.5 × 14 in",
    widthMm: 215.9,
    heightMm: 355.6,
    marginMm: 25.4,
    bandMm: 12.7,
  },
  tabloid: {
    id: "tabloid",
    label: "Tabloid",
    dimensions: "11 × 17 in",
    widthMm: 279.4,
    heightMm: 431.8,
    marginMm: 25.4,
    bandMm: 12.7,
  },
};

export const DEFAULT_PAGE_PRESET_ID: PagePresetId = "a4";

/** Presets in the order they appear in the picker. */
export const PAGE_PRESET_ORDER: PagePresetId[] = [
  "a4",
  "a5",
  "a3",
  "letter",
  "legal",
  "tabloid",
];

/** Resolves a stored preset id, falling back to A4 for unknown values. */
export function resolvePagePreset(id: string | null | undefined): PagePreset {
  if (id != null && id in PAGE_PRESETS) {
    return PAGE_PRESETS[id as PagePresetId];
  }
  return PAGE_PRESETS[DEFAULT_PAGE_PRESET_ID];
}

/* -------------------------------------------------------------------------- */
/* Margins                                                                     */
/* -------------------------------------------------------------------------- */

export type Margins = {
  topMm: number;
  rightMm: number;
  bottomMm: number;
  leftMm: number;
};

export type MarginPresetId = "normal" | "narrow" | "moderate" | "wide" | "custom";

export const MARGIN_PRESET_ORDER: MarginPresetId[] = [
  "normal",
  "narrow",
  "moderate",
  "wide",
  "custom",
];

export const MARGIN_PRESET_LABELS: Record<MarginPresetId, string> = {
  normal: "Normal",
  narrow: "Narrow",
  moderate: "Moderate",
  wide: "Wide",
  custom: "Custom…",
};

/**
 * Margins for a preset. "Normal" follows the paper — A4 gets 20mm, Letter gets
 * an inch — so changing stock keeps the margins idiomatic for it. The fixed
 * presets mirror the ones Word ships.
 */
export function marginsForPreset(
  marginPreset: MarginPresetId,
  paper: PagePreset,
  custom: Margins,
): Margins {
  switch (marginPreset) {
    case "narrow":
      return { topMm: 12.7, rightMm: 12.7, bottomMm: 12.7, leftMm: 12.7 };
    case "moderate":
      return { topMm: 25.4, rightMm: 19.05, bottomMm: 25.4, leftMm: 19.05 };
    case "wide":
      return { topMm: 25.4, rightMm: 50.8, bottomMm: 25.4, leftMm: 50.8 };
    case "custom":
      return custom;
    case "normal":
    default:
      return {
        topMm: paper.marginMm,
        rightMm: paper.marginMm,
        bottomMm: paper.marginMm,
        leftMm: paper.marginMm,
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Header / footer bands                                                       */
/* -------------------------------------------------------------------------- */

export type BandAlign = "left" | "center" | "right";

export type BandSetup = {
  enabled: boolean;
  /**
   * Rich content, as stringified Tiptap JSON. Empty on a band that predates
   * rich bands, in which case `text` is used to seed it.
   */
  content: string;
  /** Legacy plain text; kept as the seed for `content`. */
  text: string;
  align: BandAlign;
  heightMm: number;
  /** The band is left blank on pages before this one. 1-based. */
  startPage: number;
};

export type PageNumberPosition =
  | "none"
  | "header-left"
  | "header-center"
  | "header-right"
  | "footer-left"
  | "footer-center"
  | "footer-right";

export const PAGE_NUMBER_POSITIONS: {
  id: PageNumberPosition;
  label: string;
  band: "header" | "footer" | null;
  align: BandAlign | null;
}[] = [
  { id: "none", label: "None", band: null, align: null },
  { id: "header-left", label: "Header, left", band: "header", align: "left" },
  { id: "header-center", label: "Header, centre", band: "header", align: "center" },
  { id: "header-right", label: "Header, right", band: "header", align: "right" },
  { id: "footer-left", label: "Footer, left", band: "footer", align: "left" },
  { id: "footer-center", label: "Footer, centre", band: "footer", align: "center" },
  { id: "footer-right", label: "Footer, right", band: "footer", align: "right" },
];

/** Defaults offered in the header/footer dialog when a band is switched on. */
export function defaultBandSetup(
  band: "header" | "footer",
  paper: PagePreset,
  documentTitle: string,
): BandSetup {
  return {
    enabled: true,
    content: "",
    text: band === "header" ? documentTitle : "",
    align: band === "header" ? "left" : "center",
    heightMm: paper.bandMm,
    startPage: 1,
  };
}

/** The document's base font, used by text carrying no explicit font mark. */
export type FontSetup = {
  family: string;
  /** Google Fonts category, used only to pick a generic CSS fallback. */
  category: string;
  sizePt: number;
};

/**
 * The language a document is written in, which decides the direction it is laid
 * out. Not a studio setting: a company keeps its quality manual in Arabic and
 * its supplier agreements in English, and each has to read the way it is read.
 */
export type DocumentLanguage = "en" | "ar";

export const directionOf = (language: DocumentLanguage): "rtl" | "ltr" =>
  language === "ar" ? "rtl" : "ltr";

/** Page setup as stored on a document. */
export type PageSetup = {
  presetId: PagePresetId;
  font: FontSetup;
  marginPreset: MarginPresetId;
  /** Only meaningful when `marginPreset` is "custom". */
  customMargins: Margins;
  header: BandSetup;
  footer: BandSetup;
  pageNumber: PageNumberPosition;
  language: DocumentLanguage;
};

/** The effective margins for a setup, after resolving the preset. */
export function resolveMargins(setup: PageSetup): Margins {
  return marginsForPreset(
    setup.marginPreset,
    PAGE_PRESETS[setup.presetId],
    setup.customMargins,
  );
}
