"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import DateInput from "@/components/studio/DateInput";
import { TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, POST_APPROVAL_STATUSES, canEditTicket, canSetUrgency, canRequestRfqStatus } from "@/lib/tickets";
import { useLivePoll } from "@/lib/useLivePoll";
import { confirmDialog } from "@/lib/appDialog";
import { rfqInfo } from "@/lib/salesRfq";
import { unreadEntryIdSet, markSeen } from "@/lib/updates";
import { normaliseClientName } from "@/lib/salesClients";
import { isSlaService } from "@/lib/projectKpis";
import MentionTextarea from "@/components/studio/MentionTextarea";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const flabel = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const dlabel = "text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";

const OTHER_INDUSTRY = "__other__";
const URGENCY_BADGE = {
  Low: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  Normal: "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  High: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};
function fmtDate(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } }
function fmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); } }
function fmtMoney(v) { if (v == null || v === "") return "—"; const n = Number(v); return Number.isFinite(n) ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " SAR" : String(v); }

export default function TicketDetail({ ticketId }) {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [positions, setPositions] = useState([]);
  const [cities, setCities] = useState([]);
  const [existing, setExisting] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [poModal, setPoModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState([]);
  const [sendingComment, setSendingComment] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const [unreadLogIds, setUnreadLogIds] = useState(() => new Set());
  const seenRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [meRes, uRes, tRes, qRes, rRes, sRes, pRes, cRes, setRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch(`/api/tickets/${ticketId}`, { cache: "no-store" }),
        fetch("/api/quotations", { cache: "no-store" }),
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/sales-clients", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      if (tRes.status === 403) throw new Error("You need the Sales or admin tag.");
      const meUser = (await meRes.json())?.user || null;
      setMe(meUser);
      setUsers(await uRes.json());
      const row = tRes.ok ? await tRes.json() : null;
      if (!row || row.error) { setNotFound(true); return; }
      setExisting(row);
      // First open: capture unread log entries, then mark the ticket seen.
      if (!seenRef.current) {
        seenRef.current = true;
        setUnreadLogIds(unreadEntryIdSet(row.log, ticketId, meUser));
        markSeen(ticketId);
      }
      setQuotations(qRes.ok ? await qRes.json() : []);
      setRfqs(rRes.ok ? await rRes.json() : []);
      setServices(sRes.ok ? await sRes.json() : []);
      const setJson = setRes.ok ? await setRes.json() : {};
      setPositions(Array.isArray(setJson.salesContactPositions) ? setJson.salesContactPositions : []);
      setCities(Array.isArray(setJson.salesCities) ? setJson.salesCities : []);
      const projects = pRes.ok ? await pRes.json() : [];
      setProject(Array.isArray(projects) ? projects.find((p) => p.fromTicketId === ticketId) || null : null);
      setClients(cRes.ok ? await cRes.json() : []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 15000);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const nameOf = (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed" : "—");
  // The Sales-client record for this ticket's client — matched by id first, then
  // by normalised name — feeds the Client card (logo + contact details).
  const client = useMemo(() => {
    if (!existing) return null;
    if (existing.clientId) { const byId = clients.find((c) => c.id === existing.clientId); if (byId) return byId; }
    const norm = normaliseClientName(existing.clientName || "");
    return clients.find((c) => normaliseClientName(c.name) === norm) || null;
  }, [clients, existing]);
  const serviceName = useMemo(() => {
    const map = Object.fromEntries(services.map((s) => [s.id, s.title_en || "Untitled"]));
    return (id) => map[id] || id;
  }, [services]);
  const mayEdit = existing ? canEditTicket(me, existing) : false;
  // PO approval lifecycle (drives the Sales-ticket PO button):
  //   none → "Submit PO"  ·  pending → greyed "PO Pending Approval"
  //   approved → split "PO Approved | +" pill.
  const poApproved = !!(project && (project.projectNumber || project.poState === "approved"));
  const poPending = !!(project && !poApproved && project.poState === "pending");

  async function sendComment() {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newComment: commentText.trim(), mentions: commentMentions }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not add comment");
      setCommentText(""); setCommentMentions([]);
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setSendingComment(false); }
  }

  async function requestRfq() {
    if (!(await confirmDialog({ title: "Request RFQ", message: `Send an RFQ request for "${existing.title}" to Technical?`, confirmLabel: "Send request" }))) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/request-rfq`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
      await load(true);
    } catch (e) { setError(e.message); }
  }

  // Tick every second while an approval cooldown is counting down.
  useEffect(() => {
    const cd = existing?.approvalCooldownUntil ? new Date(existing.approvalCooldownUntil).getTime() : 0;
    if (!cd || cd <= Date.now()) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [existing?.approvalCooldownUntil]);

  async function sendApproval() {
    if (!(await confirmDialog({ title: "Send for Approval", message: "Send this completed quotation to the Sales, Finance and Management leaders for approval? Note: if you cancel afterwards, a 5-minute (300s) cooldown applies before you can send again.", confirmLabel: "Send for approval" }))) return;
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "approval", ticketId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not send for approval");
      await load(true);
    } catch (e) { setError(e.message); }
  }

  async function changeStatus(status) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update status");
      await load(true);
    } catch (e) { setError(e.message); }
  }

  async function submitPo({ description, fileUrl }) {
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "po", projectId: project.id, poDescription: description, poFileUrl: fileUrl }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not submit PO");
      setPoModal(false);
      await load(true);
    } catch (e) { setError(e.message); }
  }

  async function cancelApproval() {
    if (!(await confirmDialog({ title: "Cancel approval", message: "Cancel the approval request and delete the task? A 5-minute cooldown applies before you can send again.", confirmLabel: "Cancel approval", tone: "danger" }))) return;
    try {
      const res = await fetch(`/api/tasks/${existing.approvalTaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not cancel the approval");
      await load(true);
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;
  if (notFound) return (
    <div className={`${card} text-center`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">This ticket doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/studio/sales/tickets" className="mt-3 inline-block text-sm font-600 text-brand-700 hover:underline dark:text-brand-300">← Back to tickets</Link>
    </div>
  );
  if (!existing) return null;

  const ticketRfqs = rfqs.filter((r) => r.sourceTicketId === ticketId).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  // A new RFQ can only be requested when nothing is pending — i.e. no RFQ yet,
  // or the last one's quotation is already Completed. While a quotation is in
  // progress the button is greyed out.
  const rfq = rfqInfo(existing, rfqs, quotations, usersById);
  const requestPending = rfq.requested && rfq.status !== "Completed";
  const canRequest = canRequestRfqStatus(existing.status) && mayEdit;

  // Approval workflow button state (only relevant once a quotation is Completed).
  const hasCompletedQuotation = quotations.some((q) => q.fromTicketId === ticketId && q.status === "Completed");
  const approvalActive = !!existing.approvalTaskId;
  const cooldownUntil = existing.approvalCooldownUntil ? new Date(existing.approvalCooldownUntil).getTime() : 0;
  const cooldownLeft = cooldownUntil > nowTs ? Math.ceil((cooldownUntil - nowTs) / 1000) : 0;
  const mmss = `${Math.floor(cooldownLeft / 60)}:${String(cooldownLeft % 60).padStart(2, "0")}`;
  const approved = existing.approvalState === "approved" || existing.approvalState === "completed";
  const comments = Array.isArray(existing.comments) ? [...existing.comments].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) : [];
  const serviceNames = (Array.isArray(existing.serviceIds) ? existing.serviceIds : []).map(serviceName).filter(Boolean);

  const Field = ({ k, children, wide }) => (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className={dlabel}>{k}</p>
      <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{children ?? "—"}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/studio/sales/tickets" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back to tickets" aria-label="Back to tickets">
            <Icon name="arrowLeft" className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{project?.title_en || existing.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{existing.ticketRef ? `${existing.ticketRef} · ` : ""}{existing.clientName}{project?.projectNumber ? ` · Project ${project.projectNumber}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRequest && (
            <button
              onClick={requestRfq}
              disabled={requestPending}
              title={requestPending ? "A quotation is already in progress for this ticket — you can request another once it's submitted." : "Request an RFQ from Technical"}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-600 text-white transition-colors ${requestPending ? "cursor-not-allowed bg-slate-300 dark:bg-white/15 dark:text-slate-400" : "bg-amber-600 hover:bg-amber-700"}`}
            >
              {requestPending ? "RFQ in progress" : "Request RFQ"}
            </button>
          )}
          {hasCompletedQuotation && mayEdit && (
            approved ? (
              <>
                {poApproved ? (
                  // Split pill: "PO Approved" | + (the + is a placeholder for now).
                  <div className="inline-flex items-stretch overflow-hidden rounded-full border-2 border-slate-800 dark:border-white/80">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-700 text-slate-800 dark:text-slate-100">
                      <Icon name="checkDouble" className="h-4 w-4" /> PO Approved
                    </span>
                    <span aria-hidden className="w-0.5 self-stretch bg-slate-800 dark:bg-white/80" />
                    <button type="button" aria-label="More" title="More options (coming soon)" className="inline-flex items-center justify-center px-3.5 text-lg font-600 leading-none text-slate-800 transition-colors hover:bg-slate-800/5 dark:text-slate-100 dark:hover:bg-white/10">+</button>
                  </div>
                ) : poPending ? (
                  <button disabled title="PO approval is pending — Management approves the PO and Finance issues the project number" className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-300 px-4 py-2.5 text-sm font-600 text-slate-500 dark:bg-white/10 dark:text-slate-400">
                    PO Pending Approval
                  </button>
                ) : (project && !project.projectNumber) ? (
                  <button onClick={() => setPoModal(true)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950">
                    <Icon name="external" className="h-4 w-4" /> Submit PO
                  </button>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2.5 text-sm font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Icon name="checkDouble" className="h-4 w-4" /> Approved
                </span>
              </>
            ) : approvalActive ? (
              <button onClick={cancelApproval} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-300 px-4 py-2.5 text-sm font-600 text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10">
                <Icon name="close" className="h-4 w-4" /> Cancel approval
              </button>
            ) : cooldownLeft > 0 ? (
              <button disabled title="Approval cooldown — please wait before sending again" className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-300 px-4 py-2.5 text-sm font-600 text-slate-500 dark:bg-white/10 dark:text-slate-500">
                Send for Approval ({mmss})
              </button>
            ) : (
              <button onClick={sendApproval} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700">
                <Icon name="checkDouble" className="h-4 w-4" /> Send for Approval
              </button>
            )
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Top row: Ticket Info (left) + Client card (right) */}
      <div className="grid gap-5 lg:grid-cols-3">
      {/* Ticket data (read-only) — pencil to edit, top-left of the card */}
      <div className={`${card} lg:col-span-2`}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Ticket info</p>
          {mayEdit && (
            <button onClick={() => setEditing(true)} title="Edit ticket" aria-label="Edit ticket" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-brand-700 transition-colors hover:bg-brand-500/10 dark:border-white/15 dark:text-brand-300">
              <Icon name="pencil" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field k="Client">{existing.clientName}</Field>
          <Field k="Owner">{nameOf(existing.assignedTo || existing.createdBy)}</Field>
          <div>
            <p className={dlabel}>Status</p>
            {approved && mayEdit ? (
              <select value={POST_APPROVAL_STATUSES.includes(existing.status) ? existing.status : ""} onChange={(e) => e.target.value && changeStatus(e.target.value)} className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-600 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-slate-200">
                <option value="">Select final status…</option>
                {POST_APPROVAL_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            ) : (
              <div className="mt-0.5 text-sm font-600 text-slate-800 dark:text-slate-100">{existing.status}</div>
            )}
          </div>
          <Field k="Contact name">{existing.contactName}{existing.contactPosition ? <span className="ms-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{existing.contactPosition}</span> : null}</Field>
          <Field k="Contact email">{existing.contactEmail}</Field>
          <Field k="Contact phone">{existing.contactPhone}</Field>
          <Field k="Location">{existing.location?.name || existing.location?.city ? (<span>{existing.location?.name}{existing.location?.city ? ` · ${existing.location.city}` : ""}{existing.location?.url ? <a href={existing.location.url} target="_blank" rel="noreferrer" className="ms-1 inline-flex text-brand-700 dark:text-brand-300"><Icon name="location" className="h-4 w-4" /></a> : null}</span>) : "—"}</Field>
          <Field k="Client Budget">{existing.clientBudget == null || existing.clientBudget === "" ? "—" : fmtMoney(existing.clientBudget)}</Field>
          <Field k="Value">{Number(existing.value) > 0 ? fmtMoney(existing.value) : <span className="text-slate-400">Not yet quoted</span>}</Field>
          <Field k="Submission deadline">{fmtDate(existing.deadline)}</Field>
          <Field k="Urgency"><span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[existing.urgency] || URGENCY_BADGE.Normal}`}>{existing.urgency || "Normal"}</span></Field>
          <Field k="Industry">{existing.industry}</Field>
          <Field k="Probability">{Number(existing.probability ?? 0)}%</Field>
          <Field k="Updated">{fmtDate(existing.updatedAt || existing.createdAt)}</Field>
          <Field k="Services" wide>
            {serviceNames.length === 0 ? "—" : (
              <div className="flex flex-wrap gap-1.5">
                {serviceNames.map((n) => (<span key={n} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{n}</span>))}
              </div>
            )}
          </Field>
          <Field k="Description" wide><span className="whitespace-pre-wrap">{existing.description}</span></Field>
        </div>
      </div>

      {/* Client card */}
      <div className={card}>
        <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Client</p>
        <div className="flex flex-col items-center text-center">
          {client?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logo} alt={existing.clientName} className="mb-3 h-20 w-20 rounded-2xl border border-slate-200 object-contain p-1 dark:border-white/10" />
          ) : (
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl font-700 text-slate-400 dark:border-white/10 dark:bg-[#191921]">
              {(existing.clientName || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="font-display text-base font-700 text-slate-900 dark:text-white">{existing.clientName || "—"}</p>
        </div>
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <div>
            <p className={dlabel}>Contact person</p>
            <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{existing.contactPosition ? <span className="me-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{existing.contactPosition}</span> : null}{existing.contactName || "—"}</div>
          </div>
          <div>
            <p className={dlabel}>Number</p>
            <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">
              {existing.contactPhone ? <a href={`tel:${existing.contactPhone}`} className="text-brand-700 hover:underline dark:text-brand-300">{existing.contactPhone}</a> : "—"}
            </div>
          </div>
          <div>
            <p className={dlabel}>Email</p>
            <div className="mt-0.5 break-all text-sm text-slate-800 dark:text-slate-100">
              {existing.contactEmail ? <a href={`mailto:${existing.contactEmail}`} className="text-brand-700 hover:underline dark:text-brand-300">{existing.contactEmail}</a> : "—"}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* RFQ requests */}
      <div className={`${card} mt-5`}>
        <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">RFQ requests</p>
        {ticketRfqs.length === 0 ? (
          <p className="text-sm text-slate-400">No RFQ requests sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="pb-2 pe-3 text-start font-600">RFQ</th>
                  <th className="pb-2 pe-3 text-start font-600">Requested</th>
                  <th className="pb-2 pe-3 text-start font-600">Completed</th>
                  <th className="pb-2 pe-3 text-start font-600">Technical status</th>
                  <th className="pb-2 text-end font-600">Quotation</th>
                </tr>
              </thead>
              <tbody>
                {ticketRfqs.map((r) => {
                  const q = r.quotationId ? quotations.find((x) => x.id === r.quotationId) : null;
                  const converted = r.status === "Converted" && q;
                  return (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-white/10">
                      <td className="py-2 pe-3 align-top">
                        <span className="font-600 text-slate-700 dark:text-slate-200">{r.reference}</span>
                        {q?.number && <span className="ms-1 text-[11px] font-500 text-slate-400">· {q.number}{Number(q.revision) > 1 ? ` Rev ${q.revision}` : ""}</span>}
                      </td>
                      <td className="py-2 pe-3 align-top text-xs text-slate-500 dark:text-slate-400">{fmtDate(r.createdAt)}</td>
                      <td className="py-2 pe-3 align-top text-xs text-slate-500 dark:text-slate-400">{q?.completedAt ? fmtDate(q.completedAt) : "—"}</td>
                      <td className="py-2 pe-3 align-top">
                        {converted ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Converted</span>
                            <span className="text-xs font-600 text-slate-600 dark:text-slate-300">{q.status}</span>
                          </span>
                        ) : (<span className="text-xs font-600 text-slate-500 dark:text-slate-400">{r.status}</span>)}
                      </td>
                      <td className="py-2 text-end align-top">
                        {q && q.status === "Completed" ? (
                          <a href={`/studio/quotations/${q.id}/builder`} title="Open quotation (view only)" aria-label="Open quotation" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                            <Icon name="open" className="h-3.5 w-3.5" />
                          </a>
                        ) : (<span className="text-xs text-slate-300 dark:text-slate-600">—</span>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comments — underneath the ticket data with a Send button */}
      <div className={`${card} mt-5`}>
        <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Comments</p>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : (
          <ul className="mb-4 space-y-2 text-sm">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-[#191921] dark:text-slate-300">
                <div className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">{c.authorUserId || "?"} · {fmtDateTime(c.createdAt)}</div>
                <div className="whitespace-pre-wrap">{c.text}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <MentionTextarea
              rows={2}
              className={`${input} resize-y`}
              placeholder="Write a comment… (type @ to mention)"
              value={commentText}
              mentions={commentMentions}
              onChange={(t, m) => { setCommentText(t); setCommentMentions(m); }}
              sectionKey="sales-list"
            />
          </div>
          <button onClick={sendComment} disabled={sendingComment || !commentText.trim()} className={btnPrimary}>
            <Icon name="external" className="h-4 w-4" /> {sendingComment ? "Sending…" : "Send"}
          </button>
        </div>
      </div>

      {/* Log — change history; unseen updates are outlined in red */}
      <div className={`${card} mt-5`}>
        <p className="mb-3 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Log</p>
        {(!Array.isArray(existing.log) || existing.log.length === 0) ? (
          <p className="text-sm text-slate-400">No activity yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...existing.log].sort((a, b) => (b.at || "").localeCompare(a.at || "")).map((l) => {
              const isNew = unreadLogIds.has(l.id);
              return (
                <li key={l.id} className={`flex items-start justify-between gap-3 pb-2 ${isNew ? "rounded-md border border-red-400/70 bg-red-500/5 px-2 py-1.5" : "border-b border-slate-50 last:border-0 dark:border-white/5"}`}>
                  <span className="text-slate-700 dark:text-slate-200">{l.desc}{l.by ? <span className="text-slate-400"> · {l.by}</span> : ""}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(l.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <TicketEditModal ticket={existing} services={services} me={me} positions={positions} cities={cities} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await load(true); }} />
      )}

      {poModal && (
        <PoSubmitModal onClose={() => setPoModal(false)} onSubmit={submitPo} />
      )}
    </div>
  );
}

function PoSubmitModal({ onClose, onSubmit }) {
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (file.size > 5 * 1024 * 1024) { setErr(`File is ${Math.round(file.size / 1024)} KB — the limit is 5 MB.`); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append("file", file);
      const res = await fetch("/api/media?kind=file", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setFileUrl(data.url); setFileName(file.name);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function confirm() {
    if (!fileUrl && !description.trim()) { setErr("Attach a file or add a description."); return; }
    setBusy(true);
    await onSubmit({ description: description.trim(), fileUrl });
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20202c] sm:p-7" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-lg font-700 text-slate-900 dark:text-white">Submit PO</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Attach the client PO file and/or add a note. This raises a two-party PO approval: Management approves the PO and enters the PO number, Finance enters the project number. The project stays frozen until both are done.</p>
        {err && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{err}</p>}
        <div className="space-y-4">
          <div>
            <label className={flabel}>PO file <span className="font-400 normal-case text-slate-400">(PDF or image, max 5 MB)</span></label>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={pick} disabled={busy} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-2 file:text-sm file:font-600 file:text-brand-700 hover:file:bg-brand-500/20 dark:text-slate-300 dark:file:bg-brand-500/20 dark:file:text-brand-400" />
            {fileUrl && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Attached: {fileName}</p>}
          </div>
          <div>
            <label className={flabel}>Description</label>
            <textarea rows={3} className={`${input} resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes for Finance…" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={confirm} disabled={busy} className={btnPrimary}>{busy ? "Submitting…" : "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function TicketEditModal({ ticket, services, me, positions = [], cities = [], onClose, onSaved }) {
  const industryKnown = ticket.industry && TICKET_INDUSTRIES.includes(ticket.industry);
  const [form, setForm] = useState({
    title: ticket.title || "",
    contactName: ticket.contactName || "",
    contactEmail: ticket.contactEmail || "",
    contactPhone: ticket.contactPhone || "",
    contactPosition: ticket.contactPosition || "",
    locationName: ticket.location?.name || "",
    locationCity: ticket.location?.city || "",
    locationUrl: ticket.location?.url || "",
    description: ticket.description || "",
    status: ticket.status || DEFAULT_STATUS,
    urgency: ticket.urgency || "Normal",
    deadline: ticket.deadline || "",
    industry: industryKnown ? ticket.industry : (ticket.industry ? OTHER_INDUSTRY : ""),
    industryOther: industryKnown ? "" : (ticket.industry || ""),
    serviceIds: Array.isArray(ticket.serviceIds) ? ticket.serviceIds : [],
    serviceRequirements: ticket.serviceRequirements && typeof ticket.serviceRequirements === "object" ? ticket.serviceRequirements : {},
    clientBudget: ticket.clientBudget ?? "",
    probability: Number(ticket.probability ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleService = (id) => setForm((s) => ({ ...s, serviceIds: s.serviceIds.includes(id) ? s.serviceIds.filter((x) => x !== id) : [...s.serviceIds, id] }));
  const setServiceReq = (id, patch) => setForm((s) => ({ ...s, serviceRequirements: { ...(s.serviceRequirements || {}), [id]: { ...((s.serviceRequirements || {})[id] || {}), ...patch } } }));

  async function save() {
    if (!form.title.trim() || !form.deadline || !form.industry || form.serviceIds.length === 0) {
      setError("Title, deadline, industry and at least one service are required.");
      return;
    }
    if (form.clientBudget !== "" && form.clientBudget != null && (!Number.isFinite(Number(form.clientBudget)) || Number(form.clientBudget) < 0)) {
      setError("Client Budget must be a positive number.");
      return;
    }
    const finalIndustry = form.industry === OTHER_INDUSTRY ? form.industryOther.trim() : form.industry;
    if (!finalIndustry) { setError("Please specify the industry."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        contactPosition: form.contactPosition,
        location: { name: form.locationName.trim(), city: form.locationCity, url: form.locationUrl.trim() },
        description: form.description.trim(),
        status: form.status,
        urgency: form.urgency,
        deadline: form.deadline,
        industry: finalIndustry,
        serviceIds: form.serviceIds,
        serviceRequirements: form.serviceRequirements,
        clientBudget: form.clientBudget === "" || form.clientBudget == null ? null : Number(form.clientBudget),
        probability: Number(form.probability),
      };
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      await onSaved();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#20202c]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">Edit ticket · {ticket.ticketRef || ""}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={flabel}>Title <span className="text-red-500">*</span></label>
              <input className={input} value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            </div>
            <div>
              <label className={flabel}>Contact name</label>
              <input className={input} value={form.contactName} onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))} />
            </div>
            <div>
              <label className={flabel}>Contact position</label>
              <select className={input} value={form.contactPosition} onChange={(e) => setForm((s) => ({ ...s, contactPosition: e.target.value }))}>
                <option value="">— none —</option>
                {positions.map((p) => (<option key={p} value={p}>{p}</option>))}
                {form.contactPosition && !positions.includes(form.contactPosition) && <option value={form.contactPosition}>{form.contactPosition}</option>}
              </select>
            </div>
            <div>
              <label className={flabel}>Contact email</label>
              <input type="email" className={input} value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
            </div>
            <div>
              <label className={flabel}>Contact phone</label>
              <input type="tel" className={input} value={form.contactPhone} onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={flabel}>Location <span className="font-500 normal-case text-slate-400">(carried to the client &amp; project)</span></label>
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={input} placeholder="Location name" value={form.locationName} onChange={(e) => setForm((s) => ({ ...s, locationName: e.target.value }))} />
                <select className={input} value={form.locationCity} onChange={(e) => setForm((s) => ({ ...s, locationCity: e.target.value }))}>
                  <option value="">City…</option>
                  {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
                  {form.locationCity && !cities.includes(form.locationCity) && <option value={form.locationCity}>{form.locationCity}</option>}
                </select>
                <input type="url" className={input} placeholder="Location link (Maps URL)" value={form.locationUrl} onChange={(e) => setForm((s) => ({ ...s, locationUrl: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={flabel}>Client Budget (SAR) <span className="font-500 normal-case text-slate-400">(optional)</span></label>
              <input type="number" min="0" step="0.01" className={input} value={form.clientBudget} onChange={(e) => setForm((s) => ({ ...s, clientBudget: e.target.value }))} />
            </div>
            <div>
              <label className={flabel}>Submission deadline <span className="text-red-500">*</span></label>
              <DateInput className={input} value={form.deadline} onChange={(v) => setForm((s) => ({ ...s, deadline: v }))} />
            </div>
            <div>
              <label className={flabel}>Type of industry <span className="text-red-500">*</span></label>
              <select className={input} value={form.industry} onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))}>
                <option value="">Select industry…</option>
                {TICKET_INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
                <option value={OTHER_INDUSTRY}>Other</option>
              </select>
              {form.industry === OTHER_INDUSTRY && (
                <input className={`${input} mt-2`} placeholder="Type the industry" value={form.industryOther} onChange={(e) => setForm((s) => ({ ...s, industryOther: e.target.value }))} />
              )}
            </div>
            <div>
              <label className={flabel}>Urgency {!canSetUrgency(me) && <span className="normal-case font-500 text-slate-400">(Leader only)</span>}</label>
              {canSetUrgency(me) ? (
                <select className={input} value={form.urgency} onChange={(e) => setForm((s) => ({ ...s, urgency: e.target.value }))}>
                  {TICKET_URGENCIES.map((u) => (<option key={u} value={u}>{u}</option>))}
                </select>
              ) : (
                <div className={`${input} flex items-center`}><span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[form.urgency] || URGENCY_BADGE.Normal}`}>{form.urgency}</span></div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={flabel}>Type of services <span className="text-red-500">*</span></label>
              {services.length === 0 ? (
                <p className="text-sm text-slate-400">No services configured yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
                  {services.map((svc) => {
                    const checked = form.serviceIds.includes(svc.id);
                    return (
                      <button type="button" key={svc.id} onClick={() => toggleService(svc.id)} className={`rounded-full border px-3 py-1.5 text-xs font-600 transition-colors ${checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-400 dark:border-white/15 dark:bg-[#20202c] dark:text-slate-300"}`}>
                        {svc.title_en || "Untitled"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={flabel}>Requirements per service</label>
              {form.serviceIds.length === 0 ? (
                <p className="text-sm text-slate-400">Select one or more services above to set their requirements.</p>
              ) : (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
                  {form.serviceIds.map((id) => {
                    const svc = services.find((s) => s.id === id);
                    if (!svc) return null;
                    const sla = isSlaService(svc);
                    const sr = (form.serviceRequirements || {})[id] || {};
                    return (
                      <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-[#20202c]">
                        <span className="text-sm font-600 text-slate-700 dark:text-slate-200">{svc.title_en || "Untitled"}</span>
                        {sla ? (
                          <span className="text-xs text-slate-400">SLA — no delivery scope</span>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-600 text-slate-600 dark:text-slate-300">
                              <input type="checkbox" checked={!!sr.withoutInstallation} onChange={(e) => setServiceReq(id, { withoutInstallation: e.target.checked })} className="h-3.5 w-3.5 accent-brand-600" />
                              Without Installation
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-600 text-slate-600 dark:text-slate-300">
                              <input type="checkbox" checked={!!sr.withoutProgramming} onChange={(e) => setServiceReq(id, { withoutProgramming: e.target.checked })} className="h-3.5 w-3.5 accent-brand-600" />
                              Without Programming
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-400">Delivery &amp; Handover always apply. Installation/Programming follow the item scope, minus any &quot;Without&quot; you tick here.</p>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={flabel}>Probability {form.probability}%</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="100" step="1" value={form.probability} onChange={(e) => setForm((s) => ({ ...s, probability: Number(e.target.value) }))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/10" />
                <input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((s) => ({ ...s, probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} className={`${input} w-20`} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={flabel}>Description</label>
              <textarea rows={3} className={`${input} resize-y`} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
