// THE COUNTRY DEFINITIONS, registered. One JSON file per country beside this
// one; adding a country is adding its file and ONE import line below.
//
// WHY AN IMPORT LINE AND NOT A FOLDER SCAN. Neither Turbopack nor Node offers a
// build-time directory import that works in both the browser bundle and the
// model tests, and a runtime `readdir` would put the filesystem on the request
// path. So the list is written down — and `tests/official-values-model.mjs`
// reads the folder off the disk and fails if a file exists that is not
// registered here, which is the mistake the explicit list would otherwise
// invite. The import is registration, not logic: nothing below knows any
// country's rules.
//
// SERVER-SIDE IN PRACTICE, though pure. The settings screen is sent the
// selected country's fields by the API rather than importing all seven files,
// so a Studio's first load does not carry every country's definition.

import type { CountryDefinition } from "../definition";
import { codeOfCountry } from "../../countries";

import AE from "./AE.json";
import DE from "./DE.json";
import EG from "./EG.json";
import GB from "./GB.json";
import JO from "./JO.json";
import SA from "./SA.json";
import US from "./US.json";

export const COUNTRY_DEFINITIONS: Readonly<Record<string, CountryDefinition>> = Object.freeze(
  Object.fromEntries(
    [AE, DE, EG, GB, JO, SA, US].map((d) => [d.code, d as unknown as CountryDefinition]),
  ),
);

/**
 * THE DEFINITION FOR WHAT A STUDIO STORES AS ITS COUNTRY — a name, as Studio
 * settings writes it ("Saudi Arabia"), or a two-letter code. Null when the
 * Studio has no country or one nobody has written a definition for yet, which
 * the resolver reads as "no official values at all": never a fallback to some
 * other country's fields.
 */
export function definitionFor(country: unknown): CountryDefinition | null {
  const raw = String(country ?? "").trim();
  if (!raw) return null;
  const code = raw.length === 2 ? raw.toUpperCase() : codeOfCountry(raw);
  return COUNTRY_DEFINITIONS[code] || null;
}
