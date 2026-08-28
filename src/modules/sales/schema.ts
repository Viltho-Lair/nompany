// WHAT SALES STORES, as a schema rather than a description.
//
// Transcribed from the coercion that already writes it, and not parsing
// anything yet — see modules/tasks/schema.ts for why replacing the coercion is
// the step after this one.

import { z } from "zod";

/** Somebody at a client, folded in from whatever ticket first named them. */
export const ContactSchema = z.object({
  /**
   * ONLY THE LEGACY FOLD SETS ONE. A contact upserted into a client's list is
   * matched by name, so it has never needed an id; `clientContacts` mints
   * "legacy" for the single contact it synthesises out of the flat
   * contactEmail/contactPhone pair below, and that is the only id in play.
   */
  id: z.string().optional(),
  name: z.string().max(120),
  email: z.string().max(200),
  phone: z.string().max(60),
  position: z.string().max(120),
});

/**
 * A SITE, which is somewhere rather than just a name. `country` joins city and
 * map link because the studio's own country is only the default a site starts
 * from, not what it is.
 */
export const SiteSchema = z.object({
  name: z.string().max(160),
  country: z.string().max(80),
  city: z.string().max(120),
  url: z.string().max(500),
});

/**
 * A CLIENT. `contacts` and `locations` accumulate: raising a ticket folds its
 * contact and site into the client, leaving whatever was already there alone,
 * which is why neither is ever replaced wholesale by the ticket path.
 *
 * `code` is derived from the name and is what every ticket reference is built
 * on — ACME-001 — so it is stored rather than recomputed.
 */
export const ClientSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  name: z.string().max(160),
  code: z.string(),
  industry: z.string().max(80),
  website: z.string().max(200),
  /** A stored data URI, same as the studio's own mark. */
  logo: z.string().max(400_000).optional(),
  notes: z.string().max(2000),
  contacts: z.array(ContactSchema),
  locations: z.array(SiteSchema),

  // LEGACY, pre-dating `contacts`. Nothing writes these any more; records made
  // before the list existed still carry them, and `clientContacts` reads either
  // shape so no screen has to know which era a client is from.
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
});

/**
 * Per service, what the client opted out of. `serviceIds` on the ticket below
 * no longer names a row in a Sales-owned catalogue — that catalogue is gone,
 * and the ticket now stores the studio's own Service Action NAMES (Studio
 * Settings → Service Actions) directly, the same field Inventory and
 * Projects already read. `ServiceRequirementSchema` is keyed by whichever
 * string is in `serviceIds`, so it needed no shape change when the values
 * moved from an id to a name.
 */
export const ServiceRequirementSchema = z.object({
  withoutInstallation: z.boolean(),
  withoutProgramming: z.boolean(),
});

/**
 * A SALES TICKET — the head of the chain, and the record with the most rules
 * around what may NOT be set from a request.
 *
 * `status` and `urgency` are automated and Leader-only respectively, never
 * taken from input. `value` is 0 until a completed quotation sets it.
 * `assignedToCollaboratorId` comes from the session, not the payload, so a
 * crafted request cannot raise a ticket in somebody else's name. `ref` comes
 * from the highest number already used for this client rather than from a
 * count, because counting repeats a reference the moment a gap exists.
 */
export const SalesTicketSchema = z.object({
  id: z.string(),
  studioId: z.string(),
  sectionId: z.string(),
  ref: z.string(),
  title: z.string().max(200),
  clientId: z.string(),
  clientName: z.string().max(160),
  contactName: z.string().max(120),
  contactEmail: z.string().max(200),
  contactPhone: z.string().max(60),
  contactPosition: z.string().max(120),
  location: SiteSchema,
  description: z.string().max(4000),
  status: z.string(),
  urgency: z.string(),
  industry: z.string().max(80),
  deadline: z.string().max(10),
  serviceIds: z.array(z.string()),
  serviceRequirements: z.record(z.string(), ServiceRequirementSchema),
  /** null is "they did not say", which is different from zero. */
  clientBudget: z.number().nullable(),
  /** Sales' own read on how likely this is to close — a number, not a mood. */
  probability: z.number(),
  value: z.number(),
  assignedToCollaboratorId: z.string(),
  createdByCollaboratorId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // ---- written by the chain, not by the form -------------------------------
  rfqId: z.string().optional(),
  quotationId: z.string().optional(),
  projectId: z.string().optional(),
  closedAt: z.string().optional(),
  lostReason: z.string().optional(),
  comments: z.array(z.unknown()).optional(),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Client = z.infer<typeof ClientSchema>;
export type ServiceRequirement = z.infer<typeof ServiceRequirementSchema>;
export type SalesTicket = z.infer<typeof SalesTicketSchema>;
