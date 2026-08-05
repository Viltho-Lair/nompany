// Project stages (Kanban columns) + KPI-weighted completion helpers.
export const PROJECT_STAGES = ["Received", "In Progress", "Completed"];

// Project delivery "requirements" — carried from the sales ticket. Each takes a
// share of the completion % left over after the service KPIs (share configured
// in Company Info; re-scaled across the requirements a project actually has).
// Delivery/Installation/Programming are DERIVED per-item (from the project sheet
// + deliveries); Handover is a manual final action ("Mark as Completed").
export const REQUIREMENTS = ["Delivery", "Installation", "Programming", "Handover"];
export const PROJECT_SIZES = ["Small", "Medium", "Large"];

// Project size is derived from the project cost/value, not set by hand:
//   ≤ 1,000,000        → Small
//   1,000,000–5,000,000 → Medium
//   > 5,000,000        → Large
export function projectSizeFromValue(value) {
  const n = Number(value) || 0;
  if (n <= 1_000_000) return "Small";
  if (n <= 5_000_000) return "Medium";
  return "Large";
}
export const REQ_SETTING_KEY = {
  Delivery: "req_delivery",
  Installation: "req_installation",
  Programming: "req_programming",
  Handover: "req_handover",
};

// Items whose model is "License" are delivery-only — no installation/programming.
export function isLicense(row) {
  return String(row?.model || "").trim().toLowerCase() === "license";
}

// A service is an "SLA" (Service Level Agreement) service — recognised by its
// title/code. SLA services have no delivery/installation scope, so they carry
// no per-service "Without Installation/Programming" options on a ticket.
export function isSlaService(svc) {
  const s = `${svc?.title_en || ""} ${svc?.code || ""}`.toLowerCase();
  return /\bsla\b/.test(s) || s.includes("service level agreement");
}

// Whether a project-sheet row needs installation / programming. Prefers the
// item's own flags (snapshotted onto the row at project creation); older rows
// with no flag fall back to the legacy "everything except a License" rule.
export function rowNeedsInstallation(row) {
  return typeof row?.needsInstallation === "boolean" ? row.needsInstallation : !isLicense(row);
}
export function rowNeedsProgramming(row) {
  return typeof row?.needsProgramming === "boolean" ? row.needsProgramming : !isLicense(row);
}

// Derive a project's requirements array from the ticket's per-service selections
// and the item install/program flags. Delivery + Handover ALWAYS apply. A scope
// (Installation / Programming) is included only when at least one item needs it
// AND not every non-SLA service has opted out of it ("Without …").
export function deriveRequirements({ services = [], serviceIds = [], serviceRequirements = {}, items = [] }) {
  const nonSla = serviceIds
    .map((id) => (services || []).find((s) => s.id === id))
    .filter((s) => s && !isSlaService(s));
  const anyInstallItem = items.some((it) => it?.needsInstallation);
  const anyProgramItem = items.some((it) => it?.needsProgramming);
  const allWithoutInstall = nonSla.length > 0 && nonSla.every((s) => serviceRequirements?.[s.id]?.withoutInstallation);
  const allWithoutProgram = nonSla.length > 0 && nonSla.every((s) => serviceRequirements?.[s.id]?.withoutProgramming);
  const out = ["Delivery"];
  if (anyInstallItem && !allWithoutInstall) out.push("Installation");
  if (anyProgramItem && !allWithoutProgram) out.push("Programming");
  out.push("Handover");
  return out;
}

// Parse a service's `kpisText` ("Name : weight" per line) into [{name, weight}].
export function parseKpis(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((line) => {
      const l = line.trim();
      if (!l) return null;
      const idx = l.lastIndexOf(":");
      if (idx === -1) return { name: l, weight: 0 };
      const name = l.slice(0, idx).trim();
      const weight = Number(l.slice(idx + 1).replace(/[^\d.]/g, "")) || 0;
      return name ? { name, weight } : null;
    })
    .filter(Boolean);
}

// Resolve a project's KPI service. Prefer the stable id (project.serviceIds[0]);
// fall back to the legacy TITLE match on project.category so older projects and
// records created before this change still resolve.
export function serviceForProject(project, services) {
  const list = services || [];
  const sid = Array.isArray(project?.serviceIds) ? project.serviceIds[0] : null;
  if (sid) {
    const byId = list.find((s) => s.id === sid);
    if (byId) return byId;
  }
  const cat = String(project?.category || "").trim().toLowerCase();
  if (!cat) return null;
  return list.find((s) => String(s.title_en || "").trim().toLowerCase() === cat) || null;
}

// Net delivered quantity per item from the project's deliveries. Only delivered
// statuses count (a "Pending delivery"/rejected note delivers nothing); a
// partial delivery counts qty minus the serials that came back as returns.
export function deliveredByItem(deliveries) {
  const out = {};
  for (const d of deliveries || []) {
    if (d.status !== "completed" && d.status !== "partially-completed") continue;
    const returned = {};
    for (const rr of d.returns || []) returned[rr.itemId] = (returned[rr.itemId] || 0) + (rr.serials || []).length;
    for (const it of d.items || []) {
      const net = Math.max(0, (Number(it.qty) || 0) - (returned[it.itemId] || 0));
      out[it.itemId] = (out[it.itemId] || 0) + net;
    }
  }
  return out;
}

// Completion model for a project. Milestones = the service's KPIs (fixed
// weights) PLUS the project's requirements, which split the REMAINING percentage
// (100 − sum of KPI weights). KPIs are boolean (marked via "Action Taken");
// requirements are FRACTIONAL:
//   • Delivery     — delivered items ÷ total items (from `deliveries`)
//   • Installation — items marked installed ÷ total items (from the sheet rows)
//   • Programming  — items marked programmed ÷ total items (from the sheet rows)
//   • Handover     — boolean, the manual "Mark as Completed" action
// `ctx.sheet.tables[].rows[]` supplies per-item {qty, installed/installedAt,
// programmed/programmedAt}; `ctx.deliveries` the delivery notes. Returns resolved
// kpis + requirements (with fraction), overall %, the per-event series for the
// completion line graph, and whether the project is ready for handover.
export function projectCompletion(project, services, settings = {}, ctx = {}) {
  const { sheet = null, deliveries = [] } = ctx;
  const svc = serviceForProject(project, services);
  const kpiProgress = project?.kpiProgress || {};
  const kpis = parseKpis(svc?.kpisText).map((k) => {
    const p = kpiProgress[k.name] || {};
    return { ...k, weight: Number(k.weight) || 0, done: !!p.done, at: p.at || "", kind: "kpi" };
  });
  const kpiTotal = kpis.reduce((a, k) => a + k.weight, 0);
  const remaining = Math.max(0, 100 - kpiTotal);

  // Per-item totals from the project sheet. Items whose model is "License" are
  // delivery-only — they don't count toward installation/programming.
  const rows = [];
  for (const t of sheet?.tables || []) for (const r of t.rows || []) rows.push(r);
  const totalQty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
  const installableQty = rows.reduce((a, r) => a + (rowNeedsInstallation(r) ? (Number(r.qty) || 0) : 0), 0);
  const programmableQty = rows.reduce((a, r) => a + (rowNeedsProgramming(r) ? (Number(r.qty) || 0) : 0), 0);

  // Delivered quantity (capped at total). Installation/programming are tracked
  // PER SERIAL by the project team (project.installedSerials/programmedSerials).
  const delByItem = deliveredByItem(deliveries);
  const deliveredQty = Math.min(totalQty || 0, Object.values(delByItem).reduce((a, n) => a + n, 0));
  const installedSerials = project?.installedSerials && typeof project.installedSerials === "object" ? project.installedSerials : {};
  const programmedSerials = project?.programmedSerials && typeof project.programmedSerials === "object" ? project.programmedSerials : {};
  const installedCount = Math.min(installableQty, Object.keys(installedSerials).length);
  const programmedCount = Math.min(programmableQty, Object.keys(programmedSerials).length);
  const fracOf = (name) => {
    if (name === "Delivery") return totalQty ? Math.min(1, deliveredQty / totalQty) : 0;
    if (name === "Installation") return installableQty ? Math.min(1, installedCount / installableQty) : 1;
    if (name === "Programming") return programmableQty ? Math.min(1, programmedCount / programmableQty) : 1;
    return 0;
  };

  const handoverDone = !!project?.requirementProgress?.Handover?.done;
  const handoverAt = project?.requirementProgress?.Handover?.at || "";

  // Requirements assigned to the project (re-scaled to fill the remaining %).
  const present = (Array.isArray(project?.requirements) ? project.requirements : []).filter((r) => REQUIREMENTS.includes(r));
  const pctOf = (r) => Number(settings?.[REQ_SETTING_KEY[r]]) || 0;
  const presentSum = present.reduce((a, r) => a + pctOf(r), 0);
  const requirements = present.map((r) => {
    let weight;
    if (!present.length) weight = 0;
    else if (presentSum > 0) weight = (pctOf(r) / presentSum) * remaining; // re-scaled
    else weight = remaining / present.length; // no configured %: split equally
    const fraction = r === "Handover" ? (handoverDone ? 1 : 0) : fracOf(r);
    return { name: r, weight, fraction, done: fraction >= 1, at: r === "Handover" ? handoverAt : "", kind: "requirement" };
  });
  const reqWeight = Object.fromEntries(requirements.map((r) => [r.name, r.weight]));

  const milestones = [...kpis, ...requirements];
  const totalWeight = milestones.reduce((a, m) => a + (Number(m.weight) || 0), 0);
  const kpiDone = kpis.filter((k) => k.done).reduce((a, k) => a + (Number(k.weight) || 0), 0);
  const reqDone = requirements.reduce((a, r) => a + (Number(r.weight) || 0) * (r.fraction || 0), 0);
  const percent = totalWeight > 0 ? Math.round(((kpiDone + reqDone) / totalWeight) * 100) : 0;

  // Line-graph events — each completed milestone is its own dated node. There is
  // NO fixed order: a KPI, a delivery, an install and another delivery interleave
  // purely by date, so every action is a separate hoverable point.
  const wpct = (w) => (totalWeight > 0 ? (w / totalWeight) * 100 : 0);
  const events = [];
  for (const k of kpis) if (k.done && k.at) events.push({ date: k.at, delta: wpct(k.weight), label: `KPI · ${k.name}` });
  if (present.includes("Delivery") && totalQty) {
    for (const d of deliveries || []) {
      if (d.status !== "completed" && d.status !== "partially-completed") continue;
      const returned = {};
      for (const rr of d.returns || []) returned[rr.itemId] = (returned[rr.itemId] || 0) + (rr.serials || []).length;
      const net = (d.items || []).reduce((a, it) => a + Math.max(0, (Number(it.qty) || 0) - (returned[it.itemId] || 0)), 0);
      if (net > 0) events.push({ date: d.statusAt || d.createdAt || "", delta: wpct((reqWeight.Delivery || 0) * (net / totalQty)), label: `Delivered · ${d.ref || "delivery"}` });
    }
  }
  if (present.includes("Installation") && installableQty) {
    for (const [sn, at] of Object.entries(installedSerials)) if (at) events.push({ date: at, delta: wpct((reqWeight.Installation || 0) / installableQty), label: `Installed · ${sn}` });
  }
  if (present.includes("Programming") && programmableQty) {
    for (const [sn, at] of Object.entries(programmedSerials)) if (at) events.push({ date: at, delta: wpct((reqWeight.Programming || 0) / programmableQty), label: `Programmed · ${sn}` });
  }
  if (present.includes("Handover") && handoverDone && handoverAt) events.push({ date: handoverAt, delta: wpct(reqWeight.Handover || 0), label: "Handover" });

  // Drop events with no usable date — an undated milestone (e.g. a delivery with
  // no statusAt) would otherwise sort to the far left with a non-zero value and
  // make the line appear to start above 0.
  const datedEvents = events.filter((e) => e.date && !Number.isNaN(new Date(e.date).getTime()));
  datedEvents.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  // The 0% baseline must always be the LEFTMOST point, so anchor it at the
  // earliest of the project start and the first milestone date. This guarantees
  // the graph starts at 0 and rises as milestones complete, in date order.
  const start = project?.startDate || project?.createdAt || null;
  const earliestEvent = datedEvents.length ? datedEvents[0].date : null;
  const baseDate = start && earliestEvent
    ? (start.localeCompare(earliestEvent) <= 0 ? start : earliestEvent)
    : (start || earliestEvent);
  const points = [];
  if (baseDate) points.push({ date: baseDate, percent: 0, label: "Registered" });
  let cum = 0;
  for (const ev of datedEvents) { cum += ev.delta; points.push({ date: ev.date, percent: Math.round(cum), label: ev.label }); }

  // Ready for handover once every KPI is done and every present non-Handover
  // requirement is 100% — then the PM may "Mark as Completed".
  const nonHandoverReqs = requirements.filter((r) => r.name !== "Handover");
  const readyForHandover = kpis.every((k) => k.done) && nonHandoverReqs.every((r) => r.fraction >= 1);

  return { service: svc, kpis, requirements, totalWeight, totalQty, installableQty, programmableQty, deliveredQty, installedCount, programmedCount, percent, points, readyForHandover, handoverDone };
}
