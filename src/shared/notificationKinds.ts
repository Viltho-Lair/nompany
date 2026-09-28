// WHAT KIND OF NOTICE EACH TYPE IS — pure, so the bell, the notification page
// and the Node suite read one table.
//
// Every notice in the bell was the same grey bell icon, so "3 overdue
// invoices" and "a job was assigned to you" looked alike at a glance, and the
// only way to find the approvals among forty rows was to read all forty. A
// type now says which CATEGORY it belongs to (what the page filters by) and
// which ICON it wears. The words are still `modules/administration/notices`'
// and the colour is still the producer's `tone`.
//
// KEYED BY THE STORED TYPE STRING, never by the NOTIFY constant's name, because
// the string is what a row carries and a renamed constant must not orphan a
// row. `tests/notification-inbox-model.mjs` holds this table against NOTIFY in
// both directions: a type with no kind, and a kind with no type, both fail.

export const NOTICE_CATEGORIES = ["approvals", "work", "deals", "money", "deadlines", "people", "system"] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export type NoticeKind = { category: NoticeCategory; icon: string };

export const NOTICE_KINDS: Readonly<Record<string, NoticeKind>> = {
  // Somebody's signature is wanted, or was given.
  "approval.requested": { category: "approvals", icon: "verified" },
  "approval.decided": { category: "approvals", icon: "checkDouble" },
  "leave.requested": { category: "approvals", icon: "calendar" },
  "leave.decided": { category: "approvals", icon: "calendar" },

  // Work handed to this person.
  "project.assigned": { category: "work", icon: "projects" },
  "purchase.received": { category: "work", icon: "receiving" },
  "workrequest.raised": { category: "work", icon: "tool" },
  "workorder.assigned": { category: "work", icon: "tools" },
  "campaign.assigned": { category: "work", icon: "megaphone" },
  "plan.assigned": { category: "work", icon: "target" },
  "event.assigned": { category: "work", icon: "calendar" },
  "partner.assigned": { category: "work", icon: "team" },
  "stock.low": { category: "work", icon: "package" },
  "job.assigned": { category: "work", icon: "techService" },
  "task.assigned": { category: "work", icon: "tasks" },

  // Deals, leads and what Sales asks Engineering for.
  "rfq.raised": { category: "deals", icon: "rfp" },
  "quotation.assigned": { category: "deals", icon: "contract" },
  "lead.waiting": { category: "deals", icon: "ticket" },
  "leads.waiting": { category: "deals", icon: "ticket" },
  "lead.assigned": { category: "deals", icon: "target" },

  // Money owed, either way.
  "invoice.overdue": { category: "money", icon: "invoice" },
  "bill.overdue": { category: "money", icon: "wallet" },

  // A date about to pass.
  "document.expiring": { category: "deadlines", icon: "file" },
  "permit.expiring": { category: "deadlines", icon: "hse" },
  "lead.overdue": { category: "deadlines", icon: "clock" },
  "workorder.due": { category: "deadlines", icon: "clock" },
  "calibration.due": { category: "deadlines", icon: "gears" },

  // The studio's people, and this person's own standing in it.
  "join.requested": { category: "people", icon: "users" },
  "join.decided": { category: "people", icon: "team" },
  "people.changed": { category: "people", icon: "users" },
  "employment.changed": { category: "people", icon: "person" },
  "mention": { category: "people", icon: "chat" },

  // The product talking.
  "nova.answered": { category: "system", icon: "helpCircle" },
  "system": { category: "system", icon: "info" },
};

const FALLBACK: NoticeKind = { category: "system", icon: "bell" };

/** The kind of a stored type. A type nobody declared reads as a system notice. */
export const kindOf = (type: unknown): NoticeKind => NOTICE_KINDS[String(type ?? "")] || FALLBACK;

/** Every type in a category — what the page hands the route as a filter. */
export const typesIn = (category: string): string[] =>
  Object.entries(NOTICE_KINDS).filter(([, k]) => k.category === category).map(([t]) => t);
