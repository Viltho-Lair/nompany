// Pure, client-safe analytics helpers that power the section dashboards and
// the per-tag "My Dashboard". Every function takes already-fetched collections
// and returns plain data structures the widget components render — no fetching
// or formatting here.

import { TICKET_STATUSES } from "@/lib/tickets";
import { RFQ_STATUSES } from "@/lib/rfqs";
import { slaVisits, emergencyVisits, daysUntil } from "@/lib/sla";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const rank = (status) => {
  const i = TICKET_STATUSES.indexOf(status);
  return i < 0 ? 0 : i;
};
// Closed Lost is terminal-negative: it entered the pipeline but shouldn't count
// toward later stages. Its index in TICKET_STATUSES is the highest, so treat it
// specially when measuring "reached stage N".
const reached = (status, stageIdx) => status !== "Closed Lost" && rank(status) >= stageIdx;

// ─── Sales ────────────────────────────────────────────────────────────────

// Lead → Opportunity → RFQ → Quotation → Won funnel. Each stage counts the
// distinct tickets that reached at least that milestone, so bars descend.
export function salesFunnel(tickets, rfqs, quotations) {
  const ticketIds = new Set(tickets.map((t) => t.id));
  const withRfq = new Set(rfqs.filter((r) => ticketIds.has(r.sourceTicketId)).map((r) => r.sourceTicketId));
  const withQuote = new Set(quotations.filter((q) => ticketIds.has(q.fromTicketId)).map((q) => q.fromTicketId));
  const leadIdx = TICKET_STATUSES.indexOf("Lead");
  const oppIdx = TICKET_STATUSES.indexOf("Opportunity");
  const wonIdx = TICKET_STATUSES.indexOf("Closed Won");
  return [
    { label: "Lead", value: tickets.filter((t) => reached(t.status, leadIdx)).length },
    { label: "Opportunity", value: tickets.filter((t) => reached(t.status, oppIdx)).length },
    { label: "RFQ", value: tickets.filter((t) => withRfq.has(t.id)).length },
    { label: "Quotation", value: tickets.filter((t) => withQuote.has(t.id)).length },
    { label: "Won", value: tickets.filter((t) => rank(t.status) === wonIdx && t.status === "Closed Won").length },
  ];
}

// Probability buckets for pipeline forecasting. `weighted` = Σ value×probability
// (expected value); `value` = raw pipeline total in the bucket. Closed Lost
// tickets are excluded (dead pipeline).
export function probabilityBuckets(tickets) {
  const ranges = [
    { label: "0–25%", lo: 0, hi: 25 },
    { label: "26–50%", lo: 26, hi: 50 },
    { label: "51–75%", lo: 51, hi: 75 },
    { label: "76–100%", lo: 76, hi: 100 },
  ];
  const open = tickets.filter((t) => t.status !== "Closed Lost" && t.status !== "Closed Won");
  return ranges.map((r) => {
    const inBucket = open.filter((t) => {
      const p = num(t.probability);
      return p >= r.lo && p <= r.hi;
    });
    const value = inBucket.reduce((a, t) => a + num(t.value), 0);
    const weighted = inBucket.reduce((a, t) => a + num(t.value) * (num(t.probability) / 100), 0);
    return { label: r.label, count: inBucket.length, value, weighted };
  });
}

// Tickets that need attention soon: open (not closed) AND (due within `days`
// OR High/Critical urgency). Sorted by deadline ascending (soonest first),
// undated last.
export function atRiskTickets(tickets, days = 14) {
  const risky = tickets.filter((t) => {
    if (t.status === "Closed Won" || t.status === "Closed Lost") return false;
    const urgent = t.urgency === "High" || t.urgency === "Critical";
    const d = t.deadline ? daysUntil(t.deadline) : null;
    const dueSoon = d !== null && d <= days;
    return urgent || dueSoon;
  });
  return risky.sort((a, b) => {
    const da = a.deadline ? daysUntil(a.deadline) : Infinity;
    const db = b.deadline ? daysUntil(b.deadline) : Infinity;
    return da - db;
  });
}

// ─── Technical ──────────────────────────────────────────────────────────────

// RFQ pipeline: New → In-review → Converted (+ Rejected shown separately).
export function rfqFunnel(rfqs) {
  const count = (s) => rfqs.filter((r) => r.status === s).length;
  return RFQ_STATUSES.map((s) => ({ label: s, value: count(s) }));
}

// Per-handler quotation leaderboard, ranked by total handled. `usersById` maps
// user id → user record for display names.
export function handlerLeaderboard(quotations, usersById) {
  const by = new Map();
  for (const q of quotations) {
    const id = q.handledBy || "unassigned";
    if (!by.has(id)) by.set(id, { id, total: 0, completed: 0, inProgress: 0 });
    const row = by.get(id);
    row.total += 1;
    if (q.status === "Completed") row.completed += 1;
    if (q.status === "In-progress") row.inProgress += 1;
  }
  const name = (id) => (id === "unassigned" ? "Unassigned" : usersById[id]?.fullName || usersById[id]?.userId || "Removed user");
  return [...by.values()]
    .map((r) => ({ ...r, name: name(r.id) }))
    .sort((a, b) => b.total - a.total || b.completed - a.completed);
}

// Urgency breakdown for a set of records carrying an `urgency` field
// (quotations or RFQs). Returns counts in a fixed order.
export function urgencyBreakdown(items) {
  const order = ["Critical", "High", "Normal", "Low"];
  const counts = Object.fromEntries(order.map((u) => [u, 0]));
  for (const it of items) {
    const u = it.urgency || "Normal";
    if (counts[u] !== undefined) counts[u] += 1;
  }
  return order.map((u) => ({ label: u, value: counts[u] }));
}

// SLA-visit compliance across every contract: past visits that were completed
// vs. missed, plus how many are upcoming/overdue right now.
export function slaCompliance(slas) {
  let completed = 0; // past visits marked done
  let missed = 0; // past visits NOT done (compliance failures)
  let overdue = 0; // not done and past due (still open, needs action)
  let upcoming = 0; // not done, still in the future
  for (const sla of slas) {
    const visits = [...slaVisits(sla), ...emergencyVisits(sla)];
    for (const v of visits) {
      const past = v.daysRemaining !== null && v.daysRemaining < 0;
      if (v.completed) {
        if (past) completed += 1;
      } else if (past) {
        missed += 1;
        overdue += 1;
      } else {
        upcoming += 1;
      }
    }
  }
  const dueTotal = completed + missed;
  const compliancePct = dueTotal ? Math.round((completed / dueTotal) * 100) : null;
  return { completed, missed, overdue, upcoming, compliancePct, contracts: slas.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────

// Applications pipeline. Status is binary (new/rejected) in the data model, so
// the funnel is Received → Awaiting review → Rejected, plus open-role context.
export function applicationsFunnel(applications, careers = []) {
  const total = applications.length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const awaiting = total - rejected;
  return {
    openRoles: careers.length,
    stages: [
      { label: "Received", value: total },
      { label: "Awaiting review", value: awaiting },
      { label: "Rejected", value: rejected },
    ],
  };
}

// Reviews: star-rating distribution (1–5) + approved/pending split + average.
export function reviewsTrend(reviews) {
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    label: `${star}★`,
    value: reviews.filter((r) => Math.round(num(r.rating)) === star).length,
  }));
  const approved = reviews.filter((r) => r.status === "approved").length;
  const pending = reviews.length - approved;
  const rated = reviews.filter((r) => num(r.rating) > 0);
  const avg = rated.length ? rated.reduce((a, r) => a + num(r.rating), 0) / rated.length : 0;
  return { dist, approved, pending, total: reviews.length, avg };
}

// Content-health checklist: each item is a pass/fail signal on how complete the
// public-facing content is. `collections` bundles the raw arrays + settings.
export function contentHealth({ services = [], projects = [], team = [], gallery = [], previousProjects = [], settings = {} }) {
  const allHave = (rows, field) => rows.length > 0 && rows.every((r) => String(r[field] || "").trim());
  const someMissing = (rows, field) => rows.filter((r) => !String(r[field] || "").trim()).length;
  const featured = projects.filter((p) => p.homeFeatured).length;
  const checks = [
    { label: "Services have images", ok: allHave(services, "image"), detail: services.length === 0 ? "No services yet" : `${someMissing(services, "image")} missing` },
    { label: "Services have English descriptions", ok: allHave(services, "desc_en"), detail: `${someMissing(services, "desc_en")} missing` },
    { label: "Projects have descriptions", ok: allHave(projects, "desc_en"), detail: `${someMissing(projects, "desc_en")} missing` },
    { label: "Projects have images", ok: allHave(projects, "image"), detail: `${someMissing(projects, "image")} missing` },
    { label: "1–3 featured homepage projects", ok: featured >= 1 && featured <= 3, detail: `${featured} featured` },
    { label: "Team members have photos", ok: allHave(team, "photo"), detail: team.length === 0 ? "No team yet" : `${someMissing(team, "photo")} missing` },
    { label: "Gallery has images", ok: gallery.length > 0, detail: `${gallery.length} images` },
    { label: "Case-study videos published", ok: previousProjects.length > 0, detail: `${previousProjects.length} videos` },
    { label: "Company name set", ok: !!String(settings?.name_en || "").trim(), detail: settings?.name_en ? "Set" : "Missing" },
  ];
  const passed = checks.filter((c) => c.ok).length;
  return { checks, passed, total: checks.length };
}
