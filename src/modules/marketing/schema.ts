// WHAT MARKETING STORES, as a schema rather than a description.
//
// Transcribed from the coercion in ./campaigns that writes it. The rules that
// decide which values are allowed live in ./model, pure, so the screen refuses
// exactly what the server refuses.

import { z } from "zod";

/**
 * A CAMPAIGN — the parent of every marketing activity. Filed under
 * `marketing-campaigns`.
 *
 * MONEY IS IN THE STUDIO'S OWN CURRENCY and is null when nobody has set it:
 * "no budget yet" and "a budget of nought" are different answers, and the
 * dashboard adds up only the ones that were given.
 */
export const CampaignSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** CMP-0001. Only ever moves forward (invariant 10). */
  reference: z.string(),
  name: z.string().max(200),
  description: z.string().max(4000),
  /** An OBJECTIVES token. */
  objective: z.string(),
  /** CHANNELS tokens. */
  channels: z.array(z.string()),
  /** A top-level campaign's id, or "" — one level deep (`campaignProblem`). */
  parentId: z.string().max(60),
  /**
   * THE PLAN THIS CAMPAIGN BELONGS TO (22/09/2026), or "".
   *
   * NAMED, NEVER INFERRED FROM THE DATES. A campaign running from the 20th of
   * March to the 10th of April falls inside two quarters, so a plan that
   * claimed every campaign in its window would count that budget twice and
   * neither quarter's total would be the truth. VALIDATED at the write (unlike
   * a bill's `campaignId`, which the reader attributes) because both ends are
   * Marketing's own: deleting a plan is refused while a campaign names it, so
   * the link cannot be left dangling.
   */
  planId: z.string().max(60).optional(),
  startOn: z.string(),
  endOn: z.string(),
  /** Whose campaign it is: a CollaboratorID, or "" (invariant 6). */
  ownerCollaboratorId: z.string().max(60),
  status: z.string(),
  budget: z.number().nullable(),
  expectedLeads: z.number().nullable(),
  expectedCustomers: z.number().nullable(),
  expectedRevenue: z.number().nullable(),
  /**
   * THE UTM SET every tagged link of this campaign carries, so an ad platform's
   * report and this studio's name the campaign the same way.
   */
  utmSource: z.string().max(100),
  utmMedium: z.string().max(100),
  utmCampaign: z.string().max(100),
  utmContent: z.string().max(100),
  utmTerm: z.string().max(100),
  /**
   * HOW LONG THIS CAMPAIGN'S LEADS MAY WAIT, in hours — the owner, 19/09/2026:
   * the deadline is set per campaign. Copied onto each lead when it is sent, so
   * changing it later re-times nothing already in Sales. null for none.
   */
  leadDeadlineHours: z.number().nullable().optional(),
  /** The page the campaign sends people to; the tagged link is built from it. */
  landingUrl: z.string().max(1000),
  /**
   * THE BRIEF (22/09/2026): who this is for, what it says to them, what it
   * offers, and what would make it a success.
   *
   * ON THE CAMPAIGN, not a record of its own. A brief belongs to exactly one
   * campaign, is read whenever the campaign is, and is four short pieces of
   * text — the same argument that keeps an order's chases on the order. It is
   * therefore governed by `marketing.campaigns.edit` and mints no right: a
   * second right over one campaign's content would be free to disagree with
   * the first about who works on it.
   *
   * OPTIONAL, because every campaign already written predates it, and a
   * campaign without a brief is an ordinary state rather than a fault.
   */
  brief: z.object({
    audience: z.string().max(1000),
    message: z.string().max(2000),
    offer: z.string().max(1000),
    success: z.string().max(1000),
    updatedAt: z.string().optional(),
    updatedByCollaboratorId: z.string().max(60).optional(),
  }).optional(),
  /** The campaign this one was cloned from, or "". */
  clonedFromId: z.string().max(60).optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * A PLAN FOR A PERIOD (22/09/2026, ./plans). Filed under `marketing-planning`,
 * the section that until now owned nothing — the calendar reads campaigns, and
 * a plan is the first thing Planning stores in its own right.
 *
 * NO REFERENCE. A plan is named by its period ("Q1 2027") and there is never a
 * second one for the same period to tell it apart from; a numbering series
 * would be a counter nobody quotes and an invariant-10 obligation for nothing.
 *
 * NO LADDER EITHER. A campaign has a ladder because it RUNS; a plan's period
 * either has passed or has not, which its dates already say. A status would be
 * a second answer to that, free to disagree with the calendar.
 */
export const MarketingPlanSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(200),
  /** A PERIOD_KINDS token — how the dates were chosen, kept so the screen can say it. */
  periodKind: z.string().max(20),
  startOn: z.string(),
  endOn: z.string(),
  /** What the period is FOR, in words. The one field a spreadsheet of budgets never has. */
  objectives: z.string().max(4000),
  /** The envelope. Null is "nobody has set one", which is not an envelope of nought. */
  budget: z.number().nullable(),
  expectedLeads: z.number().nullable(),
  expectedRevenue: z.number().nullable(),
  /** Whose plan it is: a CollaboratorID, or "" (invariant 6). */
  ownerCollaboratorId: z.string().max(60),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MarketingPlan = z.infer<typeof MarketingPlanSchema>;

/**
 * A FORM THE STUDIO BUILDS AND THE PUBLIC ANSWERS (19/09/2026, ./formsModel).
 * Filed under `marketing-forms`. `definition` is the questionnaire builder's
 * shape (pages of questions), cleaned by `cleanDefinition` on every write.
 */
/**
 * ONE CONSENT EVENT (21/09/2026). APPEND-ONLY: a withdrawal is a NEW row, never
 * an edit of the one that granted it, because a studio asked what it was
 * entitled to do last July has to be able to answer — and a flag overwritten in
 * June cannot. `modules/marketing/consent.ts` reads the ledger; the latest row
 * for an address and channel is the state.
 *
 * `value` is SEALED at rest (invariant 18, platform/db/sealCipher): it is an
 * email address or a telephone number belonging to a member of the public, and
 * it is exactly what the rest of a client's details are sealed for.
 */
export const ConsentSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  /** "email" | "phone" — what kind of address `value` is. */
  kind: z.string().max(10),
  value: z.string().max(200),
  channel: z.string().max(10),
  state: z.string().max(10),
  /** When it was decided, which is not when the row was written on an import. */
  at: z.string(),
  source: z.string().max(10),
  /**
   * THE WORDS THEY AGREED TO, copied from the form's own consent question at
   * the moment it was answered. Not a pointer to the question: a studio editing
   * its form next year must not silently rewrite what somebody consented to.
   */
  evidence: z.string().max(500),
  /** Where it came from, for an audit: the form and the response, when it was a form. */
  formId: z.string().max(60).optional(),
  responseId: z.string().max(60).optional(),
  byCollaboratorId: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
  createdAt: z.string().optional(),
});
export type Consent = z.infer<typeof ConsentSchema>;

export const MarketingFormSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(200),
  /** Draft (not answerable), Open (answerable), Closed. */
  status: z.string(),
  /** The language the public page speaks: "en" or "ar". */
  locale: z.string(),
  /** The public address's code — `/f/<slug>/<code>`. Unguessable, never reused. */
  code: z.string(),
  template: z.string(),
  definition: z.object({ pages: z.array(z.unknown()) }),
  settings: z.object({
    campaignId: z.string(),
    /** True when some action fires on EVERY answer — the single switch this feature began as. */
    createLead: z.boolean(),
    /**
     * What an answer sets off, in order; the first whose condition holds wins.
     * Optional because a form stored before rules existed has none, and
     * `cleanSettings` reads its `createLead` as the one rule it always meant.
     */
    actions: z.array(z.object({
      id: z.string(),
      when: z.object({ questionId: z.string(), op: z.string(), value: z.string() }),
      raise: z.string(),
      assignTo: z.string(),
    })).optional(),
    leadFields: z.object({ name: z.string(), company: z.string(), phone: z.string(), email: z.string() }),
    confirmation: z.string(),
    closesOn: z.string(),
    /** The megabytes of uploads this form may ever hold, and what it holds now. */
    storageMb: z.number().optional(),
    storedBytes: z.number().optional(),
  }),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MarketingForm = z.infer<typeof MarketingFormSchema>;

/**
 * ONE PERSON'S ANSWERS TO A FORM. `answers` is SEALED at rest
 * (platform/db/sealCipher — it is a stranger's name, phone and email). `asked`
 * records the questions as they were put, so a reply survives the form being
 * reworded, which is the questionnaire's own rule.
 */
export const FormResponseSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  formId: z.string(),
  answers: z.record(z.string(), z.unknown()),
  asked: z.array(z.object({ field: z.string(), label: z.string(), type: z.string() })),
  /** The Sales ticket it became, when the form makes leads. */
  ticketId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FormResponse = z.infer<typeof FormResponseSchema>;
