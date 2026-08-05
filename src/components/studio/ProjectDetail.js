"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import EntityForm from "@/components/studio/EntityForm";
import { collectionSchemas } from "@/lib/adminSchemas";
import { projectCompletion, isLicense } from "@/lib/projectKpis";
import { unreadEntryIdSet, markSeen } from "@/lib/updates";
import { confirmDialog } from "@/lib/appDialog";
import { downloadDeliveryNote } from "@/lib/deliveryPdf";
import { daysUntil } from "@/lib/operations";
import MentionTextarea from "@/components/studio/MentionTextarea";

const schema = collectionSchemas.projects;
const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const dlabel = "text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";
const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";

const STAGE_BADGE = {
  Received: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  "In Progress": "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};
const DSTATUS_BADGE = {
  "in-progress": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "partially-completed": "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};
const DSTATUS_LABEL = { "in-progress": "Pending delivery", completed: "Delivered", "partially-completed": "Partially delivered", rejected: "Rejected" };
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }
function fmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); } }

export default function ProjectDetail({ projectId }) {
  const [project, setProject] = useState(null);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [settings, setSettings] = useState({});
  const [progress, setProgress] = useState({ sheet: { tables: [] }, deliveries: [] });
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [statType, setStatType] = useState("line");
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [permits, setPermits] = useState([]);
  const [editPermitContact, setEditPermitContact] = useState(false);
  const [pcForm, setPcForm] = useState({ name: "", email: "", phone: "" });
  const [view, setView] = useState(null); // "install" | "program" | null
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [partial, setPartial] = useState(false);
  const [retSel, setRetSel] = useState(() => new Set());
  const [dBusy, setDBusy] = useState(false);
  const [sigConfirmed, setSigConfirmed] = useState(false);
  const [dErr, setDErr] = useState("");
  const [unreadLogIds, setUnreadLogIds] = useState(() => new Set());
  const seenRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // One bundle call replaces the old all-projects + all-quotations +
      // progress + deliveries fetches.
      const [bRes, sRes, cRes, meRes, setRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/bundle`, { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/sales-clients", { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      const bundle = bRes.ok ? await bRes.json() : null;
      const row = bundle?.project || null;
      if (!row) { setNotFound(true); return; }
      setProject(row);
      setServices(sRes.ok ? await sRes.json() : []);
      setClients(cRes.ok ? await cRes.json() : []);
      setQuotations(bundle.quotations || []);
      const meUser = (await meRes.json())?.user || null;
      setMe(meUser);
      // First open: capture which log entries are unread for this user, then
      // mark the project seen so the highlight clears on the next visit.
      if (!seenRef.current) {
        seenRef.current = true;
        setUnreadLogIds(unreadEntryIdSet(row.log, projectId, meUser));
        markSeen(projectId);
      }
      setSettings(setRes.ok ? await setRes.json() : {});
      setProgress({ sheet: bundle.sheet || { tables: [] } });
      setDeliveries(bundle.deliveries || []);
      setPermits(bundle.permits || []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const serviceName = useMemo(() => {
    const map = Object.fromEntries(services.map((s) => [s.id, s.title_en || "Untitled"]));
    return (id) => map[id] || id || "—";
  }, [services]);

  const client = useMemo(() => clients.find((c) => c.id === project?.clientId) || null, [clients, project]);
  const completion = useMemo(() => (project ? projectCompletion(project, services, settings, { sheet: progress.sheet, deliveries }) : null), [project, services, settings, progress, deliveries]);

  // Delivered (net of returns) serial numbers per item — only these can be
  // installed; only installed ones can be programmed.
  const deliveredSerials = useMemo(() => {
    const m = {};
    for (const d of deliveries) {
      if (d.status !== "completed" && d.status !== "partially-completed") continue;
      for (const it of d.items || []) {
        if (!it.itemId) continue;
        (m[it.itemId] = m[it.itemId] || new Set());
        for (const sn of it.serials || []) m[it.itemId].add(sn);
      }
      for (const r of d.returns || []) {
        if (!m[r.itemId]) continue;
        for (const sn of r.serials || []) m[r.itemId].delete(sn);
      }
    }
    return m;
  }, [deliveries]);

  const installedSerials = useMemo(() => (project?.installedSerials && typeof project.installedSerials === "object" ? project.installedSerials : {}), [project]);
  const programmedSerials = useMemo(() => (project?.programmedSerials && typeof project.programmedSerials === "object" ? project.programmedSerials : {}), [project]);
  const anyDelivered = useMemo(() => Object.values(deliveredSerials).some((s) => s.size > 0), [deliveredSerials]);
  const anyInstalled = Object.keys(installedSerials).length > 0;

  const material = useMemo(() => {
    if (!project) return [];
    const seen = new Set();
    return quotations.filter((q) => {
      if (q.status !== "Completed") return false;
      const hit = q.id === project.quotationId || (project.fromTicketId && q.fromTicketId === project.fromTicketId);
      if (!hit || seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
  }, [quotations, project]);

  // Persist a patch + append a log line, then refresh.
  const patch = useCallback(async (fields, logDesc) => {
    setBusy(true);
    setError("");
    try {
      const log = Array.isArray(project.log) ? project.log : [];
      const body = { ...fields };
      if (logDesc) body.log = [...log, { id: uid(), desc: logDesc, at: new Date().toISOString(), by: me?.fullName || me?.userId || "", byId: me?.id || "" }];
      const res = await fetch(`/api/projects/${projectId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Save failed");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [project, me, projectId, load]);

  async function savePermitContact() {
    await patch({ permitContact: { name: pcForm.name.trim(), email: pcForm.email.trim(), phone: pcForm.phone.trim() } }, "Permit contact updated");
    setEditPermitContact(false);
  }

  async function requestPermit() {
    if (!(await confirmDialog({ title: "Request permit", message: "Raise a new task for the permit team to issue a permit for this project's city?", confirmLabel: "Request permit" }))) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "permit-request", projectId, permitContact: project.permitContact || {} }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not raise the request");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function uploadGallery(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media?kind=image", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      await patch({ gallery: [...(project.gallery || []), data.url] }, "Image added to gallery");
    } catch (e2) { setError(e2.message); setBusy(false); }
  }

  // Status moves forward only: marking a KPI (or any delivery/install work, done
  // in the sheet) lifts a "Received" project to "In Progress"; "Mark as
  // Completed" (the handover action) is the only path to "Completed".
  const toggleKpi = (name, done) => {
    const kp = { ...(project.kpiProgress || {}) };
    kp[name] = { done: !done, at: !done ? new Date().toISOString() : "" };
    const toProgress = !done && (project.stage || "Received") === "Received";
    const fields = { kpiProgress: kp };
    if (toProgress) fields.stage = "In Progress";
    patch(fields, `KPI “${name}” ${!done ? "completed" : "reopened"}${toProgress ? " · status → In Progress" : ""}`);
  };

  // Handover — the final action. Enabled once every other KPI/requirement is
  // 100%; sets the project Completed.
  const markCompleted = async () => {
    if (!completion?.readyForHandover || busy) return;
    if (!(await confirmDialog({ title: "Mark as Completed", message: "Confirm this project has been completed and handed over? This marks the project as Completed.", confirmLabel: "Mark as Completed" }))) return;
    const rp = { ...(project.requirementProgress || {}) };
    rp.Handover = { done: true, at: new Date().toISOString() };
    patch({ requirementProgress: rp, stage: "Completed" }, "Project handed over — marked Completed");
  };

  // Mark a delivered serial installed / not. Un-installing also clears its
  // programming. First mark lifts a "Received" project to "In Progress".
  const toggleInstalled = (serial) => {
    const cur = { ...installedSerials };
    const prog = { ...programmedSerials };
    const wasOn = !!cur[serial];
    if (wasOn) { delete cur[serial]; delete prog[serial]; }
    else cur[serial] = new Date().toISOString();
    const fields = { installedSerials: cur, programmedSerials: prog };
    if (!wasOn && (project.stage || "Received") === "Received") fields.stage = "In Progress";
    patch(fields);
  };
  const toggleProgrammed = (serial) => {
    if (!installedSerials[serial]) return; // only installed serials can be programmed
    const prog = { ...programmedSerials };
    if (prog[serial]) delete prog[serial]; else prog[serial] = new Date().toISOString();
    patch({ programmedSerials: prog });
  };

  // Delivery status (moved here from the Quotation viewer — the project team sets
  // the delivery outcome under the Material box).
  function openDelivery(d) { setActiveDelivery(d); setPartial(false); setRetSel(new Set()); setSigConfirmed(false); setDErr(""); }
  function toggleRet(itemId, sn) {
    setRetSel((s) => { const n = new Set(s); const k = `${itemId}::${sn}`; if (n.has(k)) n.delete(k); else n.add(k); return n; });
  }
  async function putDelivery(status, withReturns) {
    setDBusy(true); setDErr("");
    try {
      let returns;
      if (withReturns) {
        const map = {};
        for (const it of activeDelivery.items || []) for (const sn of it.serials || []) {
          if (retSel.has(`${it.itemId}::${sn}`)) (map[it.itemId] = map[it.itemId] || []).push(sn);
        }
        returns = Object.entries(map).map(([itemId, serials]) => ({ itemId, serials }));
        if (!returns.length) throw new Error("Select at least one returned serial number.");
      }
      const res = await fetch(`/api/deliveries/${activeDelivery.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, returns, clientSignatureConfirmed: status === "completed" ? sigConfirmed : undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setActiveDelivery(null); setPartial(false); setRetSel(new Set()); setSigConfirmed(false);
      await load();
    } catch (e) { setDErr(e.message); }
    finally { setDBusy(false); }
  }

  async function addComment() {
    if (!commentText.trim()) return;
    const c = { id: uid(), text: commentText.trim(), by: me?.fullName || me?.userId || "", at: new Date().toISOString() };
    await patch({ comments: [...(project.comments || []), c], mentions: commentMentions }, `${c.by || "A user"} commented`);
    setCommentText(""); setCommentMentions([]);
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;
  if (notFound) return (
    <div className={`${card} text-center`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">This project doesn&apos;t exist.</p>
      <Link href="/studio/projects/list" className="mt-3 inline-block text-sm font-600 text-brand-700 hover:underline dark:text-brand-300">← Back to projects</Link>
    </div>
  );
  if (!project) return null;

  const gallery = Array.isArray(project.gallery) ? project.gallery : [];
  const comments = Array.isArray(project.comments) ? [...project.comments].sort((a, b) => (b.at || "").localeCompare(a.at || "")) : [];
  const log = Array.isArray(project.log) ? [...project.log].sort((a, b) => (b.at || "").localeCompare(a.at || "")) : [];
  const contact = client?.contacts?.[0] || {};

  // Permits (Client box). A permit contact stored on the project (locked, pencil
  // to edit). Type single/long; for a long permit, a dropdown of permits matching
  // the project's city. A "Request Permit" button shows when the chosen permit is
  // expiring (<7 days) or no permit matches the city.
  const permitContact = project.permitContact || {};
  const permitType = project.permitType || "single";
  const selectedPermit = permits.find((p) => p.id === project.permitId) || null;
  const selectedPermitDays = selectedPermit ? daysUntil(selectedPermit.expireDate) : null;
  const needsPermit = permitType === "long" && (!selectedPermit || selectedPermitDays == null || selectedPermitDays < 7);

  const Field = ({ k, children }) => (
    <div><p className={dlabel}>{k}</p><div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{children || "—"}</div></div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Link href="/studio/projects/list" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back" aria-label="Back"><Icon name="arrowLeft" className="h-4 w-4" /></Link>
        <div>
          <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{project.title_en || "Untitled project"}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{project.projectNumber ? `${project.projectNumber} · ` : ""}Solution</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Info */}
        <div className={`${card} lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Info</h2>
            <button onClick={() => setEditing(true)} title="Edit project" aria-label="Edit project" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-brand-700 hover:bg-brand-500/10 dark:border-white/15 dark:text-brand-300"><Icon name="pencil" className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field k="Project Location">
              {project.location_en ? (
                project.locationUrl ? (
                  <a href={project.locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-600 text-brand-700 hover:underline dark:text-brand-300">
                    <Icon name="location" className="h-4 w-4 shrink-0" /> {project.location_en}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5"><Icon name="location" className="h-4 w-4 shrink-0 text-slate-400" /> {project.location_en}</span>
                )
              ) : "—"}
            </Field>
            <Field k="Category">{serviceName(project.category)}</Field>
            <Field k="Project Manager">{project.ownerLabel}</Field>
            <div>
              <p className={dlabel}>Status</p>
              <span className={`mt-1 inline-block rounded-lg px-2.5 py-1 text-xs font-600 ${STAGE_BADGE[project.stage || "Received"] || ""}`}>{project.stage || "Received"}</span>
              <p className="mt-1 text-[11px] text-slate-400">Auto-set as KPIs / requirements complete.</p>
            </div>
            <Field k="Completion">{completion?.percent ?? 0}%</Field>
            <Field k="Received date">{fmtDate(project.receivedDate)}</Field>
            <Field k="Requirements">{Array.isArray(project.requirements) && project.requirements.length ? project.requirements.join(", ") : "—"}</Field>
            <Field k="Project size">{project.projectSize || "—"}</Field>
            <Field k="Project Timeline">{fmtDate(project.startDate)} → {fmtDate(project.endDate)}</Field>
            <Field k="Support period (days)">{project.supportPeriodDays ?? 365}</Field>
            <div className="sm:col-span-2"><Field k="Description"><span className="whitespace-pre-wrap">{project.desc_en}</span></Field></div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5 dark:border-white/5">
            <Link
              href={`/studio/projects/list/${projectId}/plan`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950"
            >
              <Icon name="projects" className="h-4 w-4" /> Project Plan
            </Link>
            <div className="relative">
              <button
                onClick={() => setActionOpen((v) => !v)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Icon name="check" className="h-4 w-4" /> Action Taken
              </button>
              {actionOpen && (
                <div className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
                  {(completion?.kpis || []).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">No KPIs defined for this service.</p>
                  ) : (
                    completion.kpis.map((k) => (
                      <button
                        key={k.name}
                        disabled={k.done || busy}
                        onClick={() => { setActionOpen(false); if (!k.done) toggleKpi(k.name, false); }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm text-slate-700 transition-colors hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200"
                      >
                        <span className="truncate">{k.name}</span>
                        {k.done ? <span className="text-xs text-emerald-600">✓ done</span> : <span className="text-[11px] text-slate-400">{k.weight}%</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Installation — only when the project's scope includes it (the
                sales ticket's per-service "Without Installation" drops it);
                unlocks once a delivery has been made. */}
            {(completion?.requirements || []).some((r) => r.name === "Installation") && (
              <button
                onClick={() => setView("install")}
                disabled={!anyDelivered}
                title={anyDelivered ? "" : "Available once items have been delivered"}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Icon name="services" className="h-4 w-4" /> Installation
              </button>
            )}

            {/* Programming — only when in scope; unlocks once delivery + installation are done. */}
            {(completion?.requirements || []).some((r) => r.name === "Programming") && (
              <button
                onClick={() => setView("program")}
                disabled={!anyDelivered || !anyInstalled}
                title={!anyDelivered ? "Available once items have been delivered" : !anyInstalled ? "Available once items have been installed" : ""}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <Icon name="settings" className="h-4 w-4" /> Programming
              </button>
            )}

            {/* Handover — appears once every other KPI/requirement is complete. */}
            {project.stage !== "Completed" && completion?.readyForHandover && (
              <button
                onClick={markCompleted}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                <Icon name="check" className="h-4 w-4" /> Mark as Completed
              </button>
            )}
            {project.stage === "Completed" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2.5 text-sm font-600 text-emerald-700 dark:text-emerald-300">
                <Icon name="check" className="h-4 w-4" /> Handed over &amp; completed
              </span>
            )}
          </div>
        </div>

        {/* Client */}
        <div className={card}>
          <h2 className="mb-4 font-display text-lg font-700 text-slate-900 dark:text-white">Client</h2>
          <div className="flex flex-col items-center text-center">
            {client?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo} alt="" className="h-24 w-24 rounded-xl border border-slate-200 object-contain p-1 dark:border-white/10" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300 dark:border-white/10 dark:bg-white/5"><Icon name="clients" className="h-8 w-8" /></div>
            )}
            <p className="mt-3 font-600 text-slate-800 dark:text-slate-100">{client?.name || project.clientName || "No client linked"}</p>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <p><span className={dlabel}>Contact Person:</span> <span className="text-slate-800 dark:text-slate-100">{contact.position ? `[${contact.position}] ` : ""}{contact.name || "—"}</span></p>
            <p><span className={dlabel}>Number:</span> <span className="text-slate-800 dark:text-slate-100">{contact.phone || "—"}</span></p>
            <p><span className={dlabel}>Email:</span> <span className="text-slate-800 dark:text-slate-100">{contact.email || "—"}</span></p>
          </div>

          {/* Permits */}
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Permits</h3>
              {!editPermitContact && (
                <button
                  onClick={() => { setPcForm({ name: permitContact.name || "", email: permitContact.email || "", phone: permitContact.phone || "" }); setEditPermitContact(true); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" title="Edit permit contact" aria-label="Edit permit contact"
                >
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Permit contact — locked unless editing */}
            {editPermitContact ? (
              <div className="space-y-2">
                <div>
                  <p className={dlabel}>Contact name</p>
                  <input className={`${input} mt-1`} value={pcForm.name} onChange={(e) => setPcForm((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <p className={dlabel}>Contact email</p>
                  <input type="email" className={`${input} mt-1`} value={pcForm.email} onChange={(e) => setPcForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <p className={dlabel}>Contact phone</p>
                  <input type="tel" className={`${input} mt-1`} value={pcForm.phone} onChange={(e) => setPcForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={savePermitContact} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-xs font-600 text-white hover:bg-brand-950 disabled:opacity-60">Save</button>
                  <button onClick={() => setEditPermitContact(false)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-xs font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                </div>
                <p className="text-[11px] text-slate-400">Saved to the client&apos;s contacts, tagged “For Permits”.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className={dlabel}>Contact Name:</span> <span className="text-slate-800 dark:text-slate-100">{permitContact.name || "—"}</span></p>
                <p><span className={dlabel}>Contact Email:</span> <span className="text-slate-800 dark:text-slate-100">{permitContact.email || "—"}</span></p>
                <p><span className={dlabel}>Contact Phone:</span> <span className="text-slate-800 dark:text-slate-100">{permitContact.phone || "—"}</span></p>
              </div>
            )}

            {/* Type + long-permit dropdown */}
            <div className="mt-4">
              <p className={dlabel}>Type</p>
              <select
                className={`${input} mt-1`}
                value={permitType}
                disabled={busy}
                onChange={(e) => patch({ permitType: e.target.value, ...(e.target.value === "single" ? { permitId: "" } : {}) }, `Permit type set to ${e.target.value === "long" ? "Long permit" : "Single permit"}`)}
              >
                <option value="single">Single permit</option>
                <option value="long">Long permit</option>
              </select>
            </div>

            {permitType === "long" && (
              <div className="mt-3">
                <p className={dlabel}>Permit ({project.locationCity || "no city set"})</p>
                {project.locationCity ? (
                  permits.length ? (
                    <select
                      className={`${input} mt-1`}
                      value={project.permitId || ""}
                      disabled={busy}
                      onChange={(e) => patch({ permitId: e.target.value }, e.target.value ? "Long permit selected" : "Long permit cleared")}
                    >
                      <option value="">— select a permit —</option>
                      {permits.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.number ? ` · ${p.number}` : ""}{p.expireDate ? ` · exp ${fmtDate(p.expireDate)}` : ""}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">No permits registered for this city yet.</p>
                  )
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Set the project&apos;s location city (from the sales ticket) to match a permit.</p>
                )}

                {selectedPermit && (
                  <div className="mt-2 rounded-lg border border-slate-100 p-3 text-xs dark:border-white/10">
                    <p className="text-slate-700 dark:text-slate-200"><span className="font-600">{selectedPermit.name}</span>{selectedPermit.number ? ` · ${selectedPermit.number}` : ""}</p>
                    <p className={`mt-1 ${selectedPermitDays != null && selectedPermitDays < 7 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                      Expires {fmtDate(selectedPermit.expireDate)}{selectedPermitDays != null ? ` · ${selectedPermitDays < 0 ? "expired" : `${selectedPermitDays} day${selectedPermitDays === 1 ? "" : "s"} left`}` : ""}
                    </p>
                    {selectedPermit.attachmentUrl && <a href={selectedPermit.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-3.5 w-3.5" /> View permit</a>}
                  </div>
                )}

                {needsPermit && (
                  <button onClick={requestPermit} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-amber-700 disabled:opacity-60">
                    <Icon name="plus" className="h-4 w-4" /> Request Permit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className={`${card} lg:col-span-2`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Statistics</h2>
            <select value={statType} onChange={(e) => setStatType(e.target.value)} className={`${input} w-48`}>
              <option value="line">Project Line Graph</option>
              <option value="delivery">Delivery</option>
              <option value="installation">Installation</option>
            </select>
          </div>
          {statType === "line" ? (
            <>
              <CompletionGraph points={completion?.points || []} />
              {completion?.requirements?.length > 0 ? (
                <div className="mt-4">
                  <p className={`${dlabel} mb-2`}>Requirements ({completion.percent}% complete)</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {completion.requirements.map((r) => {
                      const pct = Math.round((r.fraction || 0) * 100);
                      return (
                        <div key={r.name} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-slate-700 dark:text-slate-200">{r.name}</span>
                            <span className={`text-xs font-600 ${pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{pct}%</span>
                            <span className="text-[11px] text-slate-400">· {Math.round(r.weight)}% wt</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Delivery / Installation / Programming update automatically from the Project Sheet &amp; deliveries. Handover is set by “Mark as Completed”. Service KPIs (hidden) contribute the rest — mark them via “Action Taken”.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No requirements set for this project — they carry from the sales ticket (Requirement field).</p>
              )}
            </>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">{statType === "delivery" ? "Delivery" : "Installation"} statistics — coming soon.</div>
          )}
        </div>

        {/* Gallery */}
        <div className={card}>
          <h2 className="mb-4 font-display text-lg font-700 text-slate-900 dark:text-white">Gallery</h2>
          <div className="grid grid-cols-3 gap-2">
            {gallery.slice(0, 5).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button onClick={(ev) => { ev.preventDefault(); patch({ gallery: gallery.filter((g) => g !== url) }, "Image removed from gallery"); }} className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex" aria-label="Remove">×</button>
              </a>
            ))}
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:border-white/15">
              <Icon name="plus" className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={uploadGallery} />
            </label>
          </div>
          <p className="mt-3 text-end text-sm text-slate-500 dark:text-slate-400">{gallery.length} item{gallery.length === 1 ? "" : "s"}</p>
        </div>

        {/* Material + Comments (left) */}
        <div className="space-y-5 lg:col-span-2">
          <div className={card}>
            <h2 className="mb-4 font-display text-lg font-700 text-slate-900 dark:text-white">Material</h2>
            {material.length === 0 ? (
              <p className="text-sm text-slate-400">No approved quotations reference this project yet.</p>
            ) : (
              <ul className="space-y-4">
                {material.map((q) => {
                  const qDeliveries = deliveries.filter((d) => d.quotationId === q.id);
                  return (
                    <li key={q.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/5">
                      <Link href={`/studio/quotations/${q.id}/builder?view=1`} className="-m-1 block rounded-lg p-1 transition-colors hover:bg-brand-500/5" title="Open quotation items">
                        <p className="truncate font-600 text-slate-800 dark:text-slate-100">{q.number}{Number(q.revision) > 1 ? ` · Rev ${q.revision}` : ""}</p>
                        <p className="truncate text-xs text-slate-400">{q.title || q.clientName || ""}</p>
                      </Link>
                      {/* Deliveries under this quotation */}
                      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-white/5">
                        <p className="mb-1 text-[11px] font-600 uppercase tracking-wide text-slate-400">Deliveries</p>
                        {qDeliveries.length === 0 ? (
                          <p className="text-xs text-slate-400">No deliveries released yet.</p>
                        ) : (
                          <ul className="space-y-1">
                            {qDeliveries.map((d) => (
                              <li key={d.id}>
                                <button onClick={() => openDelivery(d)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-600 text-slate-800 dark:text-slate-100">{d.ref}</span>
                                    <span className="block text-[11px] text-slate-400">{(d.items || []).length} item{(d.items || []).length === 1 ? "" : "s"} · released by {d.releasedBy || "—"}</span>
                                  </span>
                                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-600 ${DSTATUS_BADGE[d.status] || "bg-slate-500/10 text-slate-600"}`}>{DSTATUS_LABEL[d.status] || d.status}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={card}>
            <h2 className="mb-4 font-display text-lg font-700 text-slate-900 dark:text-white">Comments</h2>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400">No comments yet.</p>
            ) : (
              <ul className="mb-4 space-y-2 text-sm">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-[#191921] dark:text-slate-300">
                    <div className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">{c.by || "?"} · {fmtDateTime(c.at)}</div>
                    <div className="whitespace-pre-wrap">{c.text}</div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1"><MentionTextarea rows={2} className={`${input} resize-y`} placeholder="Write a comment… (type @ to mention)" value={commentText} mentions={commentMentions} onChange={(t, m) => { setCommentText(t); setCommentMentions(m); }} sectionKey="projects-list" /></div>
              <button onClick={addComment} disabled={busy || !commentText.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-60"><Icon name="external" className="h-4 w-4" /> Send</button>
            </div>
          </div>
        </div>

        {/* Log */}
        <div className={card}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Log</h2>
          </div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span>Description</span><span>Date</span>
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {log.map((l) => {
                const isNew = unreadLogIds.has(l.id);
                return (
                  <li key={l.id} className={`flex items-start justify-between gap-3 pb-2 ${isNew ? "rounded-md border border-red-400/70 bg-red-500/5 px-2 py-1.5" : "border-b border-slate-50 last:border-0 dark:border-white/5"}`}>
                    <span className="text-slate-700 dark:text-slate-200">{l.desc}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDate(l.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {editing && (
        <EntityForm title="Edit project" collection="projects" schema={schema} initial={project} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await patch({}, "Information updated"); }} />
      )}

      {/* Installation / Programming — per-serial checkboxes over the quotation tables */}
      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setView(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{view === "install" ? "Installation" : "Programming"}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {view === "install" ? "Tick each delivered serial number once it is installed." : "Tick each installed serial number once it is programmed."}
                  {completion?.installableQty ? ` · ${(view === "install" ? completion.installedCount : completion.programmedCount)}/${completion.installableQty} done` : ""}
                </p>
              </div>
              <button onClick={() => setView(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><Icon name="close" className="h-5 w-5" /></button>
            </div>
            {(() => {
              const tables = progress.sheet?.tables || [];
              const blocks = tables.map((t) => {
                const rows = (t.rows || []).filter((r) => !isLicense(r) && (deliveredSerials[r.itemId]?.size));
                return { t, rows };
              }).filter((b) => b.rows.length);
              if (!blocks.length) return <p className="text-sm text-slate-400">{view === "install" ? "Nothing delivered yet to install." : "Nothing installed yet to program."}</p>;
              return blocks.map(({ t, rows }, ti) => (
                <div key={ti} className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 font-600 dark:border-white/10 dark:bg-[#191921]">{t.title || `Table ${ti + 1}`}</div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {rows.map((r) => {
                      const all = [...(deliveredSerials[r.itemId] || [])];
                      const serials = view === "install" ? all : all.filter((sn) => installedSerials[sn]);
                      return (
                        <div key={r.itemId} className="px-3 py-2.5">
                          <p className="text-sm font-600 text-slate-800 dark:text-slate-100">{r.name || r.itemId} <span className="text-xs font-400 text-slate-400">{r.model || ""}</span></p>
                          {serials.length === 0 ? (
                            <p className="mt-1 text-xs text-slate-400">{view === "program" ? "No installed serials yet." : "No delivered serials."}</p>
                          ) : (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {serials.map((sn) => {
                                const on = view === "install" ? !!installedSerials[sn] : !!programmedSerials[sn];
                                return (
                                  <button
                                    key={sn}
                                    onClick={() => (view === "install" ? toggleInstalled(sn) : toggleProgrammed(sn))}
                                    disabled={busy}
                                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-600 transition-colors disabled:opacity-60 ${on ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}
                                  >
                                    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-white/30"}`}>{on ? "✓" : ""}</span>
                                    {sn}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Delivery status — the project team sets the delivery outcome + returns */}
      {activeDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActiveDelivery(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-geex border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{activeDelivery.ref}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Released by {activeDelivery.releasedBy || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadDeliveryNote(activeDelivery, project)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-600 text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5" title="Export delivery note as PDF">
                  <Icon name="open" className="h-4 w-4" /> Export PDF
                </button>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-600 ${DSTATUS_BADGE[activeDelivery.status] || "bg-slate-500/10 text-slate-600"}`}>{DSTATUS_LABEL[activeDelivery.status] || activeDelivery.status}</span>
              </div>
            </div>
            {dErr && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{dErr}</p>}
            <div className="space-y-3">
              {(activeDelivery.items || []).map((it, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-600 text-slate-800 dark:text-slate-100">{it.name || it.itemId} <span className="text-xs font-400 text-slate-400">{it.model || ""}</span></p>
                    <span className="text-xs text-slate-400">Qty {it.qty}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(it.serials || []).length === 0 ? <span className="text-xs text-slate-400">No serials</span> : (it.serials || []).map((sn) => (
                      partial ? (
                        <label key={sn} className={`cursor-pointer rounded-md border px-2 py-0.5 text-xs font-600 transition-colors ${retSel.has(`${it.itemId}::${sn}`) ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300" : "border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"}`}>
                          <input type="checkbox" className="hidden" checked={retSel.has(`${it.itemId}::${sn}`)} onChange={() => toggleRet(it.itemId, sn)} />
                          {sn}
                        </label>
                      ) : (
                        <span key={sn} className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-600 text-brand-800 dark:text-brand-200">{sn}</span>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {activeDelivery.status === "in-progress" ? (
              <div className="mt-5">
                {!partial ? (
                  <>
                    <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-600 text-slate-700 dark:text-slate-200">
                      <input type="checkbox" checked={sigConfirmed} onChange={(e) => setSigConfirmed(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                      Client&apos;s signature confirmed
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => putDelivery("completed")} disabled={dBusy || !sigConfirmed} title={sigConfirmed ? "" : "Confirm the client's signature first"} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Delivered</button>
                      {(activeDelivery.items || []).reduce((a, it) => a + (Number(it.qty) || 0), 0) > 1 && (
                        <button onClick={() => setPartial(true)} disabled={dBusy} className="rounded-full border border-sky-400 px-5 py-2.5 text-sm font-600 text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:text-sky-300 dark:hover:bg-white/5">Partially delivered…</button>
                      )}
                      <button onClick={() => putDelivery("rejected")} disabled={dBusy} className="rounded-full border border-red-400 px-5 py-2.5 text-sm font-600 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-white/5">Rejected</button>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Select the serial numbers that were <span className="font-600">returned</span>, then create the return request to logistics.</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => putDelivery("partially-completed", true)} disabled={dBusy} className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white hover:bg-brand-950 disabled:opacity-60">{dBusy ? "Sending…" : `Create return request (${retSel.size})`}</button>
                      <button onClick={() => { setPartial(false); setRetSel(new Set()); }} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">
                Status set to {DSTATUS_LABEL[activeDelivery.status] || activeDelivery.status}{activeDelivery.status === "partially-completed" ? " — a return request was sent to logistics." : ""}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple SVG step line chart: x = date (from registration), y = % completion.
function CompletionGraph({ points }) {
  const data = [...points];
  if (data.length > 0) {
    const last = data[data.length - 1];
    const nowIso = new Date().toISOString();
    if ((last.date || "") < nowIso) data.push({ date: nowIso, percent: last.percent, label: "Today" });
  }
  if (data.length < 2) {
    return <div className="flex h-52 items-center justify-center rounded-xl border border-slate-100 text-sm text-slate-400 dark:border-white/5">Not enough data yet — mark KPIs complete to plot progress.</div>;
  }
  const W = 620, H = 220, padL = 34, padB = 26, padT = 12, padR = 12;
  const times = data.map((p) => new Date(p.date).getTime());
  const minX = Math.min(...times), maxX = Math.max(...times) || minX + 1;
  const sx = (t) => padL + ((t - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const sy = (v) => padT + (1 - v / 100) * (H - padT - padB);
  const pts = data.map((p, i) => ({ x: sx(times[i]), y: sy(p.percent), p }));
  // Diagonal path — straight segments joining each dated point (not stepped).
  const d = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} className="stroke-slate-200 dark:stroke-white/10" strokeWidth="1" />
            <text x={padL - 6} y={sy(v) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">{v}</text>
          </g>
        ))}
        <path d={d} fill="none" className="stroke-brand-600" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((pt, i) => {
          // A "dated action" node = a real completed KPI (has a label, and isn't
          // the synthetic Registered/Today endpoints). Highlight those with a
          // ring; hovering shows what the action was (e.g. "Client meeting").
          const isAction = pt.p.label && pt.p.label !== "Registered" && pt.p.label !== "Today";
          return (
            <g key={i}>
              {isAction && <circle cx={pt.x} cy={pt.y} r="6" className="fill-brand-500/20" />}
              <circle cx={pt.x} cy={pt.y} r={isAction ? 4 : 2.5} className={isAction ? "fill-brand-600 stroke-white" : "fill-brand-600"} strokeWidth={isAction ? 1.5 : 0}>
                <title>{`${pt.p.label || "Point"} — ${fmtDate(pt.p.date)} · ${pt.p.percent}%`}</title>
              </circle>
            </g>
          );
        })}
        <text x={padL} y={H - 8} className="fill-slate-400 text-[9px]">{fmtDate(data[0].date)}</text>
        <text x={W - padR} y={H - 8} textAnchor="end" className="fill-slate-400 text-[9px]">{fmtDate(data[data.length - 1].date)}</text>
      </svg>
    </div>
  );
}
