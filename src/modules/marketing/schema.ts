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
  /** The campaign this one was cloned from, or "". */
  clonedFromId: z.string().max(60).optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Campaign = z.infer<typeof CampaignSchema>;
