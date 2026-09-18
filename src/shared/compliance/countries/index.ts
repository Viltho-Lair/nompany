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
//
// SOME FILES CARRY RULES AND NO FIELDS (slice D, 18/09/2026): the seventeen
// countries researched for their tax arithmetic on 16/09/2026 and not for
// their official values. They define how a document is taxed there and offer
// the Owner nothing to fill in yet.

import type { CountryDefinition } from "../definition";
import { codeOfCountry } from "../../countries";

import AE from "./AE.json";
import AT from "./AT.json";
import BH from "./BH.json";
import BR from "./BR.json";
import CA from "./CA.json";
import CL from "./CL.json";
import CO from "./CO.json";
import DE from "./DE.json";
import EG from "./EG.json";
import ES from "./ES.json";
import FR from "./FR.json";
import GB from "./GB.json";
import HR from "./HR.json";
import IT from "./IT.json";
import JO from "./JO.json";
import KE from "./KE.json";
import MX from "./MX.json";
import OM from "./OM.json";
import PE from "./PE.json";
import PL from "./PL.json";
import PT from "./PT.json";
import SA from "./SA.json";
import TR from "./TR.json";
import US from "./US.json";

export const COUNTRY_DEFINITIONS: Readonly<Record<string, CountryDefinition>> = Object.freeze(
  Object.fromEntries(
    [
      AE, AT, BH, BR, CA, CL, CO, DE, EG, ES, FR, GB, HR, IT, JO, KE, MX, OM, PE, PL, PT, SA, TR, US,
    ].map((d) => [d.code, d as unknown as CountryDefinition]),
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
