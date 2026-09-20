// WHERE A DEAL HAS GOT TO, AND WHAT COMES NEXT.
//
// The flow template has named its stages in order since it was written, and the
// ONLY thing that ever read that order was a display sort: `dealCards` lists a
// card per stage so the screen reads top to bottom as the shape of the work.
// That makes the order visible. It does not make it MEAN anything — nothing in
// the product could answer "this deal has a ticket and an RFQ, so what now?",
// which is the question the whole template exists to answer.
//
// The owner's words for it: "if the order of stages goes sales ticket > RFQ >
// quotation then the sequence goes from sales tickets to RFQ to quotations".
//
// ------------------------------------------------------------------------
// IT GUIDES. IT NEVER BLOCKS.
// ------------------------------------------------------------------------
// This is the constraint everything below is shaped by, and it is the owner's:
// "not mandatory but the flow aims to assist", and "even if one missing link in
// a specific flow is not there it will not stop the run of the company."
//
// So nothing here refuses anything. `behind` names the stages a deal skipped
// over and is INFORMATION — a quotation raised with no RFQ behind it is a
// perfectly good quotation, and a company that works that way must not be
// nagged into a process it did not choose. The blueprint says the same thing in
// its own words (Law 3: the flow alerts, it never blocks), and `dealCards`
// already honours it by calling a missing stage an invitation rather than an
// error.
//
// PURE, AND NO IMPORTS. The registry and the template are passed in, so this can
// be tested without a database and — more importantly — so a screen can compute
// the same answer the server did without asking for it again.

export type StageInfo = {
  label: string;
  sectionKey: string;
  /**
   * THE SCREEN THE RECORD IS WORKED ON, where that is not where it is filed —
   * a quotation is filed under `crm-sales-quotations` and worked in Quotations
   * → Register. Optional, as it is on the registry, and `sectionKey` answers
   * for every stage that has no such split. It is the SWITCH `stagesRunning`
   * asks about: the owner turns off a screen, never a storage row.
   */
  screenKey?: string;
  /** The VIEW permission for this stage's records, as STAGE_REGISTRY declares it. */
  permission: string;
};

export type FlowStep = {
  type: string;
  label: string;
  /** Where the work is done — the section that owns this stage's records. */
  sectionKey: string;
  /** What a reader needs to SEE it. Creating it is `createPermission`. */
  permission: string;
  /**
   * THE RIGHT TO DO IT, derived from the right to see it.
   *
   * `STAGE_REGISTRY` declares one permission per stage and it is the view one.
   * Every area in the catalogue that has a `create` verb spells it `<area>.create`
   * beside `<area>.view` — that is what `keysForLevel` builds and what the whole
   * ladder rests on — so the create key is the view key with its last segment
   * swapped. Derived rather than declared a second time: a second field would be
   * a second thing to keep in step, and it would be wrong silently.
   */
  createPermission: string;
};

export type FlowProgress = {
  /**
   * The first stage the template names that the deal does not have. `null` when
   * the deal has everything its flow asks for — which is a real state and not an
   * error, and the screen should say "nothing outstanding" rather than nothing.
   */
  next: FlowStep | null;
  /**
   * Stages the deal SKIPPED: absent, but something later in the flow is present.
   * A quotation with no RFQ behind it. Never a refusal — see the header.
   */
  behind: FlowStep[];
  /** Template stages the deal has, in template order. */
  done: string[];
  /** Everything still to come, `next` first. */
  remaining: FlowStep[];
  /**
   * How far along, as a fraction of the template's OWN stages. Null when the
   * template has none — a deal on no template has no progress to report, which
   * is different from a deal at nought.
   */
  completion: number | null;
};

const createKeyFor = (permission: string): string => {
  const dot = permission.lastIndexOf(".");
  // A permission with no verb to swap is handed back untouched rather than
  // mangled: better a right that refuses than one that accidentally names
  // something else.
  if (dot < 0) return permission;
  return permission.slice(0, dot) + ".create";
};

const stepOf = (type: string, info: StageInfo): FlowStep => ({
  type,
  label: info.label,
  // WHERE THE WORK IS DONE, WHICH IS NOT ALWAYS WHERE IT IS FILED. The screen
  // prints this and links to it, and a filed-only row is neither a name nor an
  // address: a deal invited its reader to "Add the RFQ in engineering-docs-rfq"
  // — the storage key, spelled out — and the link led to a screen that does not
  // exist. The RFQ desk is `quotations-rfq`, and `screenKey` has said so all
  // along (20/09/2026).
  sectionKey: info.screenKey || info.sectionKey,
  permission: info.permission,
  createPermission: createKeyFor(info.permission),
});

/**
 * WHERE THIS DEAL IS ON ITS FLOW.
 *
 * @param stages   the template's stage types, in the order it walks them
 * @param present  the stage types the deal actually carries
 * @param registry stage type -> what it is and where it lives
 */
/**
 * THE STAGES THIS STUDIO ACTUALLY WALKS — the flow, narrowed to what is running.
 *
 * A template is the shape of a kind of business; a studio runs the departments
 * it switched on (the owner's rule, 17/09/2026, and this is its last corner).
 * Walked against the whole template, a studio with Quotations off was told its
 * next step was to raise a quotation — a step nobody there can take, on a
 * screen that had already stopped showing the stage.
 *
 * A STAGE THE DEAL ALREADY HOLDS STAYS, whatever the switches say. Dropping it
 * would report the deal as further back than it is and invite a step it has
 * taken: switching a department off hides what is not there, it does not unmake
 * what is.
 *
 * `on` is the studio's switchboard; a stage the registry does not know is left
 * alone for `flowProgress` to drop, so there is one place that decides that.
 */
export function stagesRunning(
  stages: readonly string[],
  present: ReadonlySet<string> | readonly string[],
  registry: Readonly<Record<string, StageInfo>>,
  on: (key: string) => boolean,
): string[] {
  const has = present instanceof Set ? present : new Set(present);
  return stages.filter((type) => {
    const entry = registry[type];
    return !entry || has.has(type) || on(entry.screenKey || entry.sectionKey);
  });
}

export function flowProgress(
  stages: readonly string[],
  present: ReadonlySet<string> | readonly string[],
  registry: Readonly<Record<string, StageInfo>>,
): FlowProgress {
  const has = present instanceof Set ? present : new Set(present);
  // A stage the registry does not know is dropped rather than guessed at:
  // `assertTemplatesAreWellFormed` refuses one at the door, so reaching this is
  // a template edited past that check, and inventing a label for it would put a
  // card on screen that leads nowhere.
  const known = stages.filter((t) => registry[t]);

  const done = known.filter((t) => has.has(t));
  const absent = known.filter((t) => !has.has(t));

  // THE FURTHEST POINT REACHED, which is what makes "behind" mean anything. A
  // deal that has only a ticket has skipped nothing — everything after it is
  // simply ahead. A deal with a quotation and no RFQ has genuinely stepped over
  // one, and that is worth showing.
  let furthest = -1;
  known.forEach((t, i) => { if (has.has(t)) furthest = i; });

  const behind = known
    .filter((t, i) => !has.has(t) && i < furthest)
    .map((t) => stepOf(t, registry[t]));

  const remaining = absent.map((t) => stepOf(t, registry[t]));

  return {
    // FIRST ABSENT, not first-absent-after-the-furthest. If a deal skipped the
    // RFQ and holds a quotation, the next thing to do is still the RFQ — the
    // flow is a sequence, and the honest answer to "what now" is the earliest
    // thing it is missing rather than the next thing it has not reached.
    next: remaining[0] || null,
    behind,
    done,
    remaining,
    completion: known.length ? done.length / known.length : null,
  };
}

/**
 * THE ONE LINE A SCREEN SHOWS, resolved against who is reading.
 *
 * A step nobody may take is not a call to action. Somebody who cannot create a
 * quotation should not be told to go and create one — the flow's job is to say
 * what the DEAL needs, and whose job it is, not to send a person at a door that
 * will refuse them.
 *
 * Returns the step and whether this reader can act on it, so the caller can
 * choose between a button and a sentence naming the section instead.
 */
export function nextActionFor(
  progress: FlowProgress,
  can: (permission: string) => boolean,
): { step: FlowStep; actionable: boolean } | null {
  if (!progress.next) return null;
  return { step: progress.next, actionable: can(progress.next.createPermission) };
}
