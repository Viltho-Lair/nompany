"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/studio/icons";
import DateInput from "@/components/studio/DateInput";
import { useLivePoll } from "@/lib/useLivePoll";
import { confirmDialog } from "@/lib/appDialog";
import { APPROVER_DEPARTMENTS, canApprove, bothApproved, canSendToProjects, isLeader, isAssignee, canApprovePo, canEnterProjectNumber, MATERIAL_APPROVER_DEPARTMENTS, canApproveMaterial } from "@/lib/tasks";
import { downloadMaterialPo } from "@/lib/materialPoPdf";
import { canAccessSection } from "@/lib/sectionAccessConstants";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]";
const dlabel = "text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";
function fmtDateTime(v) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); } }

export default function TaskDetail({ taskId }) {
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [poNum, setPoNum] = useState("");
  const [projNum, setProjNum] = useState("");
  const [idExpiry, setIdExpiry] = useState("");
  const [permitNote, setPermitNote] = useState("");
  const [serialInfo, setSerialInfo] = useState({ items: [], ready: false });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tRes, meRes, uRes, aRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { cache: "no-store" }),
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/section-access", { cache: "no-store" }),
      ]);
      if (tRes.status === 404 || tRes.status === 403) { setNotFound(true); return; }
      const t = tRes.ok ? await tRes.json() : null;
      setTask(t);
      if (t?.type === "delivery" && !t.done) {
        fetch(`/api/tasks/${taskId}/serials`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) setSerialInfo(d); })
          .catch(() => {});
      }
      setMe((await meRes.json())?.user || null);
      setUsers(uRes.ok ? await uRes.json() : []);
      setAccessMap(aRes.ok ? ((await aRes.json())?.access || {}) : {});
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [taskId]);
  useEffect(() => { load(); }, [load]);
  useLivePoll(() => load(true), 5000);
  useEffect(() => { if (task?.type === "po") { setPoNum(task.poNumber || ""); setProjNum(task.projectNumber || ""); } if (task?.type === "id-update") { setIdExpiry(task.newIdExpiry || task.currentIdExpiry || ""); } }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmIdUpdate() {
    if (!idExpiry) { setError("A new ID expiry date is required."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm-id-update", idExpiry }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function completePermit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete-permit", resolution: permitNote.trim() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not complete");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function approvePo() {
    if (!poNum.trim()) { setError("A PO number is required."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "po-approve", poNumber: poNum.trim() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not approve the PO");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function enterProjectNumber() {
    if (!projNum.trim()) { setError("A project number is required."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "po-project-number", projectNumber: projNum.trim() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save the project number");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function approveMaterial(dept) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "material-approve", department: dept }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not approve");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function confirmRelease() {
    if (!(await confirmDialog({ title: "Release material", message: "This will release the requested material and create a delivery note for the project. This action cannot be reversed. Continue?", confirmLabel: "Release material", tone: "danger" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm-delivery-release" }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not release");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function cancelDeliveryTask() {
    const isDelivery = task?.type === "delivery";
    if (!(await confirmDialog({ title: isDelivery ? "Reject request" : "Cancel request", message: isDelivery ? "Reject this delivery request and delete the task? It will be recorded in the project log." : "Cancel this request and delete the task? It will be recorded in the project log.", confirmLabel: isDelivery ? "Reject request" : "Cancel request", tone: "danger" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not cancel");
      router.push("/studio/tasks");
    } catch (e) { setError(e.message); setBusy(false); }
  }

  async function decideQtyChange(approve) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: approve ? "approve-qty-change" : "reject-qty-change" }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not update the request");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function confirmReturnReceipt() {
    if (!(await confirmDialog({ title: "Confirm return", message: "Confirm receipt of the returned material? The serial numbers will be reassigned to available stock.", confirmLabel: "Confirm receipt" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm-return-receipt" }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not confirm");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function approve(dept) {
    if (!(await confirmDialog({ title: `${dept} approval`, message: `Approve this quotation on behalf of ${dept}?`, confirmLabel: "Approve" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", department: dept }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Approval failed");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function setManager(userId) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-manager", userId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not assign manager");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function sendToProjects() {
    if (!(await confirmDialog({ title: "Send to Projects", message: "Create a project from this approved quotation? This cannot be undone.", confirmLabel: "Send to Projects" }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send-to-projects" }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not create project");
      await load(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-10 text-center text-sm text-slate-400">Loading…</div>;
  if (notFound) return (
    <div className={`${card} text-center`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">This task doesn&apos;t exist or isn&apos;t assigned to you.</p>
      <Link href="/studio/tasks" className="mt-3 inline-block text-sm font-600 text-brand-700 hover:underline dark:text-brand-300">← Back to tasks</Link>
    </div>
  );
  if (!task) return null;

  const done = bothApproved(task);
  const meIsLeader = isLeader(me) || isAssignee(me, task);
  // Project managers = employees who can reach the Projects section (excluding
  // admins). They're the only valid owners for the resulting project.
  const projectManagers = users.filter(
    (u) => !(u.tags || []).includes("admin") &&
      (canAccessSection(u, "projects-list", accessMap) || canAccessSection(u, "projects", accessMap))
  );
  const Field = ({ k, children }) => (
    <div>
      <p className={dlabel}>{k}</p>
      <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{children || "—"}</div>
    </div>
  );

  const Header = () => (
    <div className="mb-5 flex items-center gap-3">
      <Link href="/studio/tasks" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5" title="Back to tasks" aria-label="Back to tasks">
        <Icon name="arrowLeft" className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{task.name}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Created {fmtDateTime(task.createdAt)} by {task.createdByLabel || "—"}</p>
      </div>
    </div>
  );

  // --- Delivery request task (logistics releases material) -----------------
  if (task.type === "delivery") {
    const reqItems = Array.isArray(task.items) ? task.items : [];
    const bookedByItem = Object.fromEntries((serialInfo.items || []).map((s) => [s.itemId, s]));
    const serialsReady = !!serialInfo.ready;
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Delivery request</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Client">{task.clientName}</Field>
            <Field k="Project">{task.projectName || task.projectNumber}</Field>
            <Field k="Quotation">
              {task.quotationId ? (
                <Link href={`/studio/quotations/${task.quotationId}/builder?view=1`} className="inline-flex items-center gap-1.5 font-600 text-brand-700 hover:underline dark:text-brand-300">{task.quotationNumber || "Open"} <Icon name="open" className="h-3.5 w-3.5" /></Link>
              ) : task.quotationNumber}
            </Field>
          </div>
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  <th className="px-3 py-2 text-start font-600">Item</th>
                  <th className="px-3 py-2 text-start font-600">Model</th>
                  <th className="w-20 whitespace-nowrap px-3 py-2 text-end font-600">Qty</th>
                  {!task.done && <th className="w-28 whitespace-nowrap px-3 py-2 text-end font-600">Serials booked</th>}
                </tr>
              </thead>
              <tbody>
                {reqItems.length === 0 ? (
                  <tr><td colSpan={task.done ? 3 : 4} className="px-3 py-4 text-center text-xs text-slate-400">No items.</td></tr>
                ) : reqItems.map((it, i) => {
                  const b = bookedByItem[it.itemId];
                  const enough = b && b.available >= (Number(it.qty) || 0);
                  return (
                  <tr key={i} className="border-t border-slate-50 dark:border-white/5">
                    <td className="px-3 py-2 font-600 text-slate-800 dark:text-slate-100">{it.name || "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{it.model || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-end text-slate-700 dark:text-slate-200">{it.qty}</td>
                    {!task.done && (
                      <td className={`whitespace-nowrap px-3 py-2 text-end font-600 ${enough ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {b ? `${b.available}/${it.qty}` : `0/${it.qty}`}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {task.qtyChange?.status === "pending" && !task.done && (() => {
          const curById = Object.fromEntries(reqItems.map((it) => [it.itemId, Number(it.qty) || 0]));
          const canDecide = isAssignee(me, task) || isLeader(me);
          return (
            <div className={`${card} mt-5 border-amber-300/60 dark:border-amber-500/30`}>
              <p className="mb-1 text-xs font-600 uppercase tracking-wide text-amber-600 dark:text-amber-400">Requested quantity change</p>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{task.qtyChange.byLabel || "The requester"} proposed new quantities. Approve to apply them (an item set to 0 is removed; if none remain the request is cancelled).</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                      <th className="px-3 py-2 text-start font-600">Item</th>
                      <th className="w-24 px-3 py-2 text-end font-600">Current</th>
                      <th className="w-24 px-3 py-2 text-end font-600">Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(task.qtyChange.items || []).map((it, i) => {
                      const cur = curById[it.itemId] ?? "—";
                      const changed = Number(it.qty) !== Number(cur);
                      return (
                        <tr key={i} className="border-t border-slate-50 dark:border-white/5">
                          <td className="px-3 py-2 font-600 text-slate-800 dark:text-slate-100">{it.name || it.itemId}</td>
                          <td className="px-3 py-2 text-end text-slate-500 dark:text-slate-400">{cur}</td>
                          <td className={`px-3 py-2 text-end font-600 ${changed ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>{it.qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canDecide ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => decideQtyChange(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"><Icon name="checkDouble" className="h-4 w-4" /> Approve change</button>
                  <button onClick={() => decideQtyChange(false)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-red-400 px-5 py-2.5 text-sm font-600 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"><Icon name="close" className="h-4 w-4" /> Reject change</button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Awaiting Logistics to approve the change.</p>
              )}
            </div>
          );
        })()}

        <div className={`${card} mt-5`}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Logistics — release material</p>
          {task.done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="font-600">Released by {task.doneBy || "Logistics"} · {fmtDateTime(task.doneAt)}</p>
              {task.deliveryRef && <p className="mt-1">Delivery note: <span className="font-600">{task.deliveryRef}</span></p>}
            </div>
          ) : (
            <div className="space-y-3">
              {serialsReady ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">All serial numbers are booked. Releasing creates a delivery note (In-progress) under the quotation. <span className="font-600 text-slate-700 dark:text-slate-200">This action cannot be reversed.</span></p>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-600">Serial numbers must be booked before this can be released.</p>
                  <p className="mt-1">Go to <Link href="/studio/inventory/sheets" className="font-600 underline">Inventory → Project Sheets</Link>, open this project, and book serials for the requested items. The counts above update automatically.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={confirmRelease}
                  disabled={busy || !serialsReady}
                  title={serialsReady ? "Release the material (cannot be reversed)" : "Book all serial numbers first"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
                >
                  <Icon name="checkDouble" className="h-4 w-4" /> Release material
                </button>
                <button onClick={cancelDeliveryTask} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-red-400 px-5 py-2.5 text-sm font-600 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10">
                  <Icon name="trash" className="h-4 w-4" /> Reject request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Material return task (logistics confirms receipt) -------------------
  if (task.type === "delivery-return") {
    const returns = Array.isArray(task.returns) ? task.returns : [];
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Returned material · {task.deliveryRef}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Client">{task.clientName}</Field>
            <Field k="Project">{task.projectName || task.projectNumber}</Field>
            <Field k="Delivery">{task.deliveryRef}</Field>
          </div>
          <div className="mt-5 space-y-3">
            {returns.length === 0 ? (
              <p className="text-sm text-slate-400">No returned items listed.</p>
            ) : returns.map((r, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <p className="mb-1 text-sm font-600 text-slate-800 dark:text-slate-100">{r.itemId}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(r.serials || []).map((sn) => (
                    <span key={sn} className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-600 text-amber-700 dark:text-amber-300">{sn}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} mt-5`}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Logistics — confirm receipt</p>
          {task.done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="font-600">Received by {task.doneBy || "Logistics"} · {fmtDateTime(task.doneAt)}</p>
              <p className="mt-1">Returned serial numbers were reassigned to available stock.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">Confirming receipt returns these serial numbers to available stock and un-books them from the project sheet.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={confirmReturnReceipt} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                  <Icon name="checkDouble" className="h-4 w-4" /> Confirm receipt &amp; reassign to stock
                </button>
                <button onClick={cancelDeliveryTask} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-red-400 px-5 py-2.5 text-sm font-600 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10">
                  <Icon name="trash" className="h-4 w-4" /> Cancel request
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Vendor material-PO task (two-party: Finance + Management approve) ------
  if (task.type === "material-po") {
    const items = Array.isArray(task.items) ? task.items : [];
    const totalQty = items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Vendor purchase order</p>
            <button onClick={() => downloadMaterialPo(task)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5">
              <Icon name="open" className="h-4 w-4" /> Export PDF
            </button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Vendor">{task.vendorName}</Field>
            <Field k="Project">{task.projectName}</Field>
            <Field k="Total quantity">{totalQty}</Field>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="pb-2 pe-3 text-start font-600">Item</th>
                  <th className="pb-2 pe-3 text-start font-600">Model</th>
                  <th className="pb-2 text-end font-600">Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-white/10">
                    <td className="py-2 pe-3 font-600 text-slate-700 dark:text-slate-200">{it.name}</td>
                    <td className="py-2 pe-3 text-xs text-slate-500 dark:text-slate-400">{it.model || "—"}</td>
                    <td className="py-2 text-end text-slate-700 dark:text-slate-200">{it.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${card} mt-5`}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Approval — two-party</p>
            {task.done && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Icon name="checkDouble" className="h-3.5 w-3.5" /> Completed</span>}
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Both Finance and Management must approve before the purchase order is issued to the vendor.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {MATERIAL_APPROVER_DEPARTMENTS.map((dept) => {
              const appr = task.approvals?.[dept];
              const may = canApproveMaterial(me, dept, task);
              return (
                <div key={dept} className={`rounded-xl border p-4 ${appr?.approved ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-200 dark:border-white/10"}`}>
                  <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{dept}</p>
                  {appr?.approved ? (
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">
                      <p className="font-600">Approved</p>
                      <p className="mt-0.5 text-xs">by {appr.byLabel || dept} · {fmtDateTime(appr.at)}</p>
                    </div>
                  ) : may ? (
                    <button onClick={() => approveMaterial(dept)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                      <Icon name="checkDouble" className="h-4 w-4" /> Approve
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400">Awaiting {dept} approval.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- PO task (two-party: Management approves PO, Finance issues project #) --
  if (task.type === "po") {
    const mayApprovePo = canApprovePo(me, task);
    const mayEnterProjNum = canEnterProjectNumber(me, task);
    const poDone = !!task.poApproved;
    const projDone = !!task.projectNumber;
    const isImage = task.poFileUrl && !/\.pdf($|\?)/i.test(task.poFileUrl);
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">PO approval</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Client">{task.clientName}</Field>
            <Field k="Project">{task.projectName}</Field>
            <Field k="Quotation">
              {task.quotationId ? (
                <Link href={`/studio/quotations/${task.quotationId}/builder`} className="inline-flex items-center gap-1.5 font-600 text-brand-700 hover:underline dark:text-brand-300">
                  {task.quotationNumber || "Open"} <Icon name="open" className="h-3.5 w-3.5" />
                </Link>
              ) : task.quotationNumber}
            </Field>
            <div className="sm:col-span-2 lg:col-span-3"><Field k="Description"><span className="whitespace-pre-wrap">{task.poDescription}</span></Field></div>
          </div>
          {task.poFileUrl && (
            <div className="mt-4">
              <a href={task.poFileUrl} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-4 w-4" /> View submitted PO {isImage ? "image" : "file"}</a>
            </div>
          )}
        </div>

        <div className={`${card} mt-5`}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">PO approval — two-party</p>
            {task.done && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Icon name="checkDouble" className="h-3.5 w-3.5" /> Completed</span>}
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Both steps are required. The project stays frozen until the PO is approved and a project number is issued.</p>
          {task.quotationId && !task.done && (
            <Link href={`/studio/quotations/${task.quotationId}/builder`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"><Icon name="open" className="h-4 w-4" /> Revise the approved quotation</Link>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Management — approve PO + PO number */}
            <div className={`rounded-xl border p-4 ${poDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-200 dark:border-white/10"}`}>
              <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Management — approve PO</p>
              {poDone ? (
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-600">PO {task.poNumber}</p>
                  <p className="mt-0.5 text-xs">Approved by {task.poApprovedBy || "Management"} · {fmtDateTime(task.poApprovedAt)}</p>
                </div>
              ) : mayApprovePo ? (
                <div className="space-y-3">
                  <div>
                    <p className={dlabel}>PO Number <span className="text-red-500">*</span></p>
                    <input value={poNum} onChange={(e) => setPoNum(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" placeholder="Client PO number" />
                  </div>
                  <button onClick={approvePo} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                    <Icon name="checkDouble" className="h-4 w-4" /> Approve PO
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Awaiting Management approval.</p>
              )}
            </div>
            {/* Finance — project number */}
            <div className={`rounded-xl border p-4 ${projDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-200 dark:border-white/10"}`}>
              <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">Finance — project number</p>
              {projDone ? (
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-600">Project {task.projectNumber}</p>
                  <p className="mt-0.5 text-xs">Issued by {task.projectNumberBy || "Finance"} · {fmtDateTime(task.projectNumberAt)}</p>
                </div>
              ) : mayEnterProjNum ? (
                <div className="space-y-3">
                  <div>
                    <p className={dlabel}>Project Number <span className="text-red-500">*</span></p>
                    <input value={projNum} onChange={(e) => setProjNum(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" placeholder="Issue a project number" />
                  </div>
                  <button onClick={enterProjectNumber} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                    <Icon name="checkDouble" className="h-4 w-4" /> Save project number
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Awaiting Finance to enter the project number.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Information update task (assigned handler sets the new ID expiry) ----
  if (task.type === "permit-request") {
    const mayComplete = isAssignee(me, task) || (Array.isArray(me?.tags) && me.tags.includes("admin"));
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Permit request</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Client">{task.clientName || "—"}</Field>
            <Field k="Project">{task.projectName || "—"}{task.projectNumber ? ` · ${task.projectNumber}` : ""}</Field>
            <Field k="City">{task.city || "—"}</Field>
            <Field k="Location">
              {task.locationName || "—"}
              {task.locationUrl && <a href={task.locationUrl} target="_blank" rel="noreferrer" className="ms-1.5 inline-flex text-brand-700 dark:text-brand-300" title="Open location"><Icon name="location" className="h-3.5 w-3.5" /></a>}
            </Field>
            <Field k="Requested">{fmtDateTime(task.createdAt)}</Field>
          </div>
          {(task.permitContact?.name || task.permitContact?.email || task.permitContact?.phone) && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p className="mb-2 text-[11px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Permit contact</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {task.permitContact.name || "—"}
                {task.permitContact.email ? ` · ${task.permitContact.email}` : ""}
                {task.permitContact.phone ? ` · ${task.permitContact.phone}` : ""}
              </p>
            </div>
          )}
          {task.note && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300"><span className="font-600">Note:</span> {task.note}</p>}
        </div>

        <div className={`${card} mt-5`}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Issue the permit</p>
          {task.done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="font-600">Issued by {task.doneBy || "—"} · {fmtDateTime(task.doneAt)}</p>
              {task.resolution && <p className="mt-1">{task.resolution}</p>}
            </div>
          ) : mayComplete ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Once the permit has been issued for this project&apos;s city, mark it done. Optionally record the new permit number or a note.</p>
              <div className="max-w-md">
                <p className={dlabel}>Note (optional)</p>
                <input value={permitNote} onChange={(e) => setPermitNote(e.target.value)} placeholder="e.g. Permit no. 12345, valid 1 year" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
              </div>
              <button onClick={completePermit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Icon name="checkDouble" className="h-4 w-4" /> Mark permit issued
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Awaiting the permit team to issue the permit.</p>
          )}
        </div>
      </div>
    );
  }

  if (task.type === "id-update") {
    const fmtD = (v) => { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); } };
    return (
      <div>
        <Header />
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className={card}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Information update</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field k="Employee">{task.employeeName}</Field>
            <Field k="Requested">{fmtDateTime(task.createdAt)}</Field>
            <Field k="Current ID expiry">{fmtD(task.currentIdExpiry)}</Field>
          </div>
        </div>

        <div className={`${card} mt-5`}>
          <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Update the ID expiry date</p>
          {task.done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              <p className="font-600">Updated by {task.doneBy || "—"} · {fmtDateTime(task.doneAt)}</p>
              <p className="mt-1">New ID expiry: <span className="font-600">{fmtD(task.newIdExpiry)}</span></p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">The employee changed their ID image and requested an information update. Enter the new ID expiry date to update their profile. This is mandatory.</p>
              <div className="max-w-xs">
                <p className={dlabel}>New ID expiry <span className="text-red-500">*</span></p>
                <DateInput value={idExpiry} onChange={setIdExpiry} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white" />
              </div>
              <button onClick={confirmIdUpdate} disabled={busy || !idExpiry} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Icon name="checkDouble" className="h-4 w-4" /> Confirm update
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Details */}
      <div className={card}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field k="Client">{task.clientName}</Field>
          <Field k="Project name">{task.projectName}</Field>
          <Field k="Quotation">
            <Link href={`/studio/quotations/${task.quotationId}/builder`} className="inline-flex items-center gap-1.5 font-600 text-brand-700 hover:underline dark:text-brand-300">
              {task.quotationNumber}{Number(task.quotationRevision) > 1 ? ` Rev ${task.quotationRevision}` : ""} <Icon name="open" className="h-3.5 w-3.5" />
            </Link>
          </Field>
          <Field k="Handled by (Technical)">{task.handledByTechnicalLabel}</Field>
          <Field k="Handled by (Sales)">{task.handledBySalesLabel}</Field>
          <Field k="Contact">{task.contactName}{task.contactPhone ? ` · ${task.contactPhone}` : ""}</Field>
        </div>
      </div>

      {/* Project manager — a leader must assign before Management approves */}
      <div className={`${card} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-600 text-slate-800 dark:text-slate-100">Project manager</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{task.projectManagerId ? `Assigned: ${task.projectManagerLabel}` : "Not assigned — required before Management approves."}</p>
          </div>
          {meIsLeader && !task.sentToProjects ? (
            <select value={task.projectManagerId || ""} disabled={busy} onChange={(e) => setManager(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] dark:text-white">
              <option value="">— select project manager —</option>
              {projectManagers.length === 0 && <option value="" disabled>No project managers (grant staff the Projects section)</option>}
              {projectManagers.map((u) => (<option key={u.id} value={u.id}>{u.fullName || u.userId}</option>))}
            </select>
          ) : task.projectManagerId ? (
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-sm font-600 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{task.projectManagerLabel}</span>
          ) : (
            <span className="text-xs text-slate-400">Awaiting a leader to assign.</span>
          )}
        </div>
      </div>

      {/* Approvals */}
      <div className={`${card} mt-5`}>
        <p className="mb-4 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Approvals</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {APPROVER_DEPARTMENTS.map((dept) => {
            const a = task.approvals?.[dept] || {};
            const mayApprove = canApprove(me, dept, task);
            return (
              <div key={dept} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="font-600 text-slate-800 dark:text-slate-100">{dept} Leader</p>
                  {a.approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><Icon name="checkDouble" className="h-3.5 w-3.5" /> Approved</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-600 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Pending</span>
                  )}
                </div>
                {a.approved ? (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">by {a.byLabel} · {fmtDateTime(a.at)}</p>
                ) : mayApprove && dept === "Management" && !task.projectManagerId ? (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">A project manager must be assigned before you can approve.</p>
                ) : mayApprove ? (
                  <button onClick={() => approve(dept)} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
                    <Icon name="checkDouble" className="h-4 w-4" /> Approve as {dept}
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">Awaiting the {dept} leader&apos;s approval.</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">The person assigned to each department in Tasks → Task settings approves for that department. Both Sales and Management must approve before it can be sent to Projects.</p>
      </div>

      {/* Send to Projects */}
      <div className={`${card} mt-5 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="font-600 text-slate-800 dark:text-slate-100">Send to Projects</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {task.sentToProjects ? "A project was created from this quotation." : done ? "Both approvals received — ready to create the project." : "Enabled once Sales and Management have approved."}
          </p>
        </div>
        {task.sentToProjects ? (
          <Link href={`/studio/projects/list/${task.projectId}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950">
            <Icon name="open" className="h-4 w-4" /> Open project
          </Link>
        ) : (
          <button
            onClick={sendToProjects}
            disabled={busy || !done || !canSendToProjects(me, task)}
            title={!done ? "Both approvals are required first" : !canSendToProjects(me, task) ? "Only Sales or Management leaders can send to Projects" : "Create the project"}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
          >
            <Icon name="external" className="h-4 w-4" /> Send to Projects
          </button>
        )}
      </div>
    </div>
  );
}
