// QUESTIONNAIRE DEFINITIONS — the forms authored in /super, not anyone's
// answers to them.
//
// SCOPING: one row per questionnaire in the g:questionnaires registry, holding
// its pages and their questions inline. A questionnaire is a small document that
// is always read and written whole, so splitting it across per-page keys would
// buy nothing and cost a cascade to maintain. Deleting one is deleting its row.
//
// Answers are NOT here. A person's answers still live at u:<UserID>:questionnaire
// exactly as before; this registry is the definition side, and the two are
// deliberately separate — deleting a form must never delete what people said.

import { readArr, editArr } from "@/platform/db/store";
import { ID, REG } from "@/platform/db/keys";

const now = () => new Date().toISOString();

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function listQuestionnaires() {
  return readArr(REG.questionnaires);
}

export async function getQuestionnaireById(id: string) {
  return (await readArr(REG.questionnaires)).find((q) => q.id === id) || null;
}

// `route` is the path this questionnaire is asked for at — the link between a
// definition here and the screen that renders it. Blank until it is wired up.
export async function createQuestionnaireDef(
  { name, route = "", createdBy = "" }: { name?: string; route?: string; createdBy?: string } = {},
) {
  const row = {
    id: ID.questionnaire(),
    name: str(name, 120) || "New questionnaire",
    route: str(route, 200),
    status: "draft",
    pages: [],
    responses: 0,
    completed: 0,
    createdBy: str(createdBy, 60),
    createdAt: now(),
    updatedAt: now(),
  };
  await editArr(REG.questionnaires, (rows) => ({ next: [row, ...rows] }));
  return row;
}

// Only these may be written from a request; id, counters and createdAt are ours.
const WRITABLE = ["name", "route", "status", "pages"];

export async function updateQuestionnaireDef(id: string, patch: Record<string, unknown>) {
  // Captured outside editArr's closure — see catalog.ts's updateCatalogItem for why:
  // the closure may run once per CAS retry, and a timestamp read inside it would
  // depend on how many rounds the write took.
  const updatedAt = now();
  return editArr(REG.questionnaires, (rows) => {
    let updated: Record<string, unknown> | null = null;
    const next = rows.map((q) => {
      if (q.id !== id) return q;
      const safe: Record<string, unknown> = {};
      for (const k of WRITABLE) if (k in (patch || {})) safe[k] = patch[k];
      updated = { ...q, ...safe, id: q.id, createdAt: q.createdAt, updatedAt } as Record<string, unknown>;
      return updated;
    });
    return updated ? { next, result: updated } : { result: null };
  });
}

export async function deleteQuestionnaireDef(id: string) {
  return editArr(REG.questionnaires, (rows) => {
    const next = rows.filter((q) => q.id !== id);
    return { next, result: next.length !== rows.length };
  });
}

// Copying a form is how most second forms get made, so it is a first-class
// operation rather than something to rebuild by hand.
export async function duplicateQuestionnaireDef(id: string, createdBy = "") {
  const source = await getQuestionnaireById(id);
  if (!source) return null;
  const copy = {
    ...structuredClone(source),
    id: ID.questionnaire(),
    name: `${source.name} (copy)`,
    // A route can only belong to one questionnaire, so a copy starts unattached.
    route: "",
    status: "draft",
    responses: 0,
    completed: 0,
    createdBy: str(createdBy, 60),
    createdAt: now(),
    updatedAt: now(),
  };
  await editArr(REG.questionnaires, (rows) => ({ next: [copy, ...rows] }));
  return copy;
}

// A route belongs to at most one questionnaire — that is what makes "the
// questionnaire at this route" a meaningful thing to ask for.
export async function getQuestionnaireByRoute(route: unknown) {
  const want = String(route || "").trim();
  if (!want) return null;
  return (await readArr(REG.questionnaires)).find((q) => (q.route || "") === want) || null;
}

// Plant the registration questionnaire in the builder the first time it is
// wanted, then leave it alone.
//
// Seeded lazily rather than by a migration because it has to exist in every
// environment that ever serves the page, and a lazy seed cannot be forgotten on
// one of them. It is guarded by the route lookup, so it writes once: after that
// this is a read, and whatever an author has since changed is what comes back.
export async function ensureQuestionnaireForRoute(
  { route, name, pages }: { route: string; name?: string; pages?: unknown[] },
) {
  const existing = await getQuestionnaireByRoute(route);
  if (existing) return existing;
  const row = {
    id: ID.questionnaire(),
    name: String(name || "Questionnaire").slice(0, 120),
    route: String(route || "").slice(0, 200),
    status: "live",
    pages: structuredClone(pages || []),
    responses: 0,
    completed: 0,
    createdBy: "system",
    createdAt: now(),
    updatedAt: now(),
  };
  // Re-check inside the write: two first requests at once must not both plant it.
  await editArr(REG.questionnaires, (rows) => (
    rows.some((q) => (q.route || "") === row.route) ? { next: rows } : { next: [row, ...rows] }
  ));
  return (await getQuestionnaireByRoute(route)) || row;
}
