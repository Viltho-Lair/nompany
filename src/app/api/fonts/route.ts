const API = "https://www.googleapis.com/webfonts/v1/webfonts";

export type FontEntry = {
  family: string;
  category: string;
  /** Numeric weights this family actually ships, ascending. */
  weights: number[];
};

type GoogleFont = {
  family: string;
  category: string;
  variants: string[];
};

/**
 * The Google Fonts catalogue, trimmed to what the picker needs (~1,950
 * families, roughly 80KB instead of ~1MB) and cached for a day — the catalogue
 * changes a few times a month, and the key must not reach the browser.
 */
export async function GET() {
  const key = process.env.GOOGLE_FONTS_API_KEY;
  if (!key) {
    return Response.json(
      { error: "GOOGLE_FONTS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(`${API}?sort=popularity&key=${key}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return Response.json(
      { error: `Google Fonts API returned ${response.status}` },
      { status: 502 },
    );
  }

  const body = (await response.json()) as { items: GoogleFont[] };

  const fonts: FontEntry[] = body.items.map((item) => ({
    family: item.family,
    category: item.category,
    weights: weightsOf(item.variants),
  }));

  return Response.json(
    { fonts },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}

/**
 * Variants come back as "regular", "700", "italic", "700italic". Only the
 * upright weights matter for loading a stylesheet.
 */
function weightsOf(variants: string[]): number[] {
  const weights = new Set<number>();
  for (const variant of variants) {
    if (variant.includes("italic")) continue;
    weights.add(variant === "regular" ? 400 : Number(variant));
  }
  const sorted = [...weights].filter((w) => Number.isFinite(w)).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : [400];
}
