// OFFICIAL STUDIO VALUES — the store half of shared/compliance.
//
// A Studio's tax number, registration numbers and registered address, held per
// the country it has chosen and read by every official document through the
// resolver (`shared/compliance/resolve`). This module owns the three things the
// resolver cannot: what the settings screen is shown, how a save is judged and
// written, and the history of who changed what.
//
// VALUES LIVE ON THE STUDIO RECORD (`officialValues`, key → string), beside
// `currency` and `vatRate`, because they are read on almost every document and
// the record is already in hand on every request. THE HISTORY LIVES APART
// (`S.officialHistory`), because it only ever grows and the record is read on
// every request.
//
// A VALUE OUTLIVES A COUNTRY CHANGE. Values are keyed by field, not by country,
// so a field both countries define keeps what was typed; one only the old
// country defines stays stored and invisible, and comes back if the Owner
// switches back. The resolver's format check is what stops a kept value
// printing under a country whose rule it does not match.

import { S } from "@/platform/db/keys";
import { readArr, editArr } from "@/platform/db/store";
import { updateStudio } from "@/modules/main/studios";
import { definitionFor } from "@/shared/compliance/countries";
import { normalizeValue, valueProblem, type ValueProblem } from "@/shared/compliance/definition";
import { isApplicable, type ResolveOptions } from "@/shared/compliance/resolve";

export type OfficialChange = {
  id: string;
  at: string;
  byCollaboratorId: string;
  byAlias: string;
  /** The country the value was saved under — a value means something only against its country's rule. */
  country: string;
  /** A field key, or "country" when the Studio's country itself changed. */
  key: string;
  from: string;
  to: string;
};

type Who = { id: string; alias?: unknown };
type StudioLike = { id: string; country?: unknown; officialValues?: unknown; vatRate?: unknown } & Record<string, unknown>;

const storedOf = (studio: { officialValues?: unknown }): Record<string, string> => {
  const v = studio?.officialValues;
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, String(x ?? "")]));
};

// ---- reading -----------------------------------------------------------------

/**
 * WHAT THE SETTINGS SECTION SHOWS: the selected country's fields — and ONLY
 * those; another country's are never sent — each with what is stored, whether
 * it applies, and why it is refused if it no longer fits (a value kept across a
 * country switch that does not match the new country's format).
 */
export function officialView(studio: StudioLike, opts: ResolveOptions = {}) {
  const def = definitionFor(studio.country);
  const stored = storedOf(studio);
  if (!def) return { country: null, fields: [] };
  return {
    country: { code: def.code, name: def.name, checked: def.checked, version: def.version },
    fields: def.fields.map((f) => ({
      key: f.key,
      department: f.department,
      label: f.label,
      hint: f.hint,
      required: f.required,
      input: f.input || "text",
      maxLength: f.maxLength || 200,
      appliesWhen: f.appliesWhen || null,
      applicable: isApplicable(studio, f, opts),
      value: stored[f.key] || "",
      problem: valueProblem(f, stored[f.key] || "") as ValueProblem,
      // The pattern and checksum names travel so the screen can judge a value
      // as it is typed with the SAME function the server runs (definition.ts is
      // pure and imported by both).
      normalize: f.normalize || "trim",
      patterns: f.patterns || [],
      checksum: f.checksum || "",
      source: f.source,
    })),
  };
}

/** Newest first. The whole history is kept; this is how much a screen asks for. */
export async function officialHistory(studioId: string, limit = 100): Promise<OfficialChange[]> {
  const rows = await readArr<OfficialChange>(S.officialHistory(studioId));
  return [...rows].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit);
}

/**
 * APPEND-ONLY. A history anybody could edit would not be a record of who
 * changed a value printed on a legal document; nothing in the product removes a
 * row, and the key dies only with the studio.
 */
export async function recordOfficialChanges(studioId: string, changes: OfficialChange[]) {
  if (!changes.length) return;
  await editArr<OfficialChange, null>(S.officialHistory(studioId), (rows) => ({ next: [...rows, ...changes], result: null }));
}

const changeId = () => `ofc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function change(who: Who, country: string, key: string, from: string, to: string): OfficialChange {
  return {
    id: changeId(), at: new Date().toISOString(),
    byCollaboratorId: who.id, byAlias: String(who.alias || ""), country, key, from, to,
  };
}

// ---- writing -------------------------------------------------------------------

export type SaveResult =
  | { error: "no-country" }
  | { error: "notfound" }
  | { error: "invalid"; fields: Record<string, ValueProblem | "unknown-field"> }
  | { ok: true; changed: string[]; values: Record<string, string> };

/**
 * SAVE WHAT THE OWNER TYPED, judged against the Studio's CURRENT country.
 *
 * ALL OR NOTHING. A save that stored the valid half and refused the rest would
 * leave the screen and the record disagreeing about which half landed; every
 * field is judged first and nothing is written if any is refused, with each
 * refusal named so the screen can mark the field.
 *
 * A KEY THIS COUNTRY DOES NOT DEFINE IS REFUSED, not ignored. The screen only
 * ever sends this country's fields, so one arriving from elsewhere is a stale
 * screen after a country change — and silently dropping it would read as saved.
 *
 * BLANK CLEARS. Removing a registration number is a real act, recorded like
 * any other change.
 */
export async function saveOfficialValues(studio: StudioLike, who: Who, body: Record<string, unknown>): Promise<SaveResult> {
  const def = definitionFor(studio.country);
  if (!def) return { error: "no-country" };
  const incoming = body?.values && typeof body.values === "object" ? (body.values as Record<string, unknown>) : {};

  const refused: Record<string, ValueProblem | "unknown-field"> = {};
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(incoming)) {
    const field = def.fields.find((f) => f.key === key);
    if (!field) { refused[key] = "unknown-field"; continue; }
    const problem = valueProblem(field, raw);
    if (problem) { refused[key] = problem; continue; }
    next[key] = String(raw ?? "").trim() ? normalizeValue(field, raw) : "";
  }
  if (Object.keys(refused).length) return { error: "invalid", fields: refused };

  // THE DIFF IS TAKEN INSIDE THE COMPARE-AND-SET, against the row as stored,
  // so two people saving different fields at once both land (invariant 8). It
  // is recomputed on every retry, which is why it is reset at the top.
  let changes: OfficialChange[] = [];
  const country = def.code;
  const updated = await updateStudio(studio.id, (row) => {
    changes = [];
    const current = storedOf(row as { officialValues?: unknown });
    const merged = { ...current };
    for (const [key, value] of Object.entries(next)) {
      const before = current[key] || "";
      if (before === value) continue;
      changes.push(change(who, country, key, before, value));
      if (value) merged[key] = value; else delete merged[key];
    }
    return { officialValues: merged };
  });
  if (!updated) return { error: "notfound" };
  await recordOfficialChanges(studio.id, changes);
  return { ok: true, changed: changes.map((c) => c.key), values: storedOf(updated as { officialValues?: unknown }) };
}
