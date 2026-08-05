"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/studio/icons";
import DateInput from "@/components/studio/DateInput";
import { TICKET_STATUSES, TICKET_URGENCIES, TICKET_INDUSTRIES, DEFAULT_STATUS, canEditTicket, canSetUrgency, canRequestRfqStatus } from "@/lib/tickets";
import { SALES_TAG, canSeeAllIn } from "@/lib/authConstants";
import { normaliseClientName, normaliseContactName, clientContacts } from "@/lib/salesClients";
import { useLivePoll } from "@/lib/useLivePoll";
import { rfqInfo } from "@/lib/salesRfq";
import { isSlaService } from "@/lib/projectKpis";
import ColumnPickerModal from "@/components/studio/ColumnPickerModal";
import { loadUserPref, saveUserPref } from "@/lib/userPrefs";
import { confirmDialog } from "@/lib/appDialog";
import { unreadCount } from "@/lib/updates";

// Toggleable columns (Actions is always shown, not listed here).
const SALES_COLUMNS = [
  { key: "createdAt", label: "Created" },
  { key: "title", label: "Title" },
  { key: "client", label: "Client" },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value" },
  { key: "deadline", label: "Deadline" },
  { key: "status", label: "Status" },
  { key: "urgency", label: "Urgency" },
  { key: "rfq", label: "RFQ" },
  { key: "updatedAt", label: "Updated" },
  { key: "probability", label: "Prob." },
];
const SALES_DEFAULT_COLS = SALES_COLUMNS.map((c) => c.key);
const SALES_COLS_PREF = "mta-sales-cols";
const SALES_FILTERS_PREF = "mta-sales-filters";
const SALES_EMPTY_FILTERS = {
  client: "", urgency: "", status: "",
  probMin: "", probMax: "",
  createdFrom: "", createdTo: "",
  valueMin: "", valueMax: "",
  deadlineFrom: "", deadlineTo: "",
  updatedFrom: "", updatedTo: "",
};

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white dark:placeholder:text-slate-500";
const inputRO =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/10 dark:bg-[#14141c] dark:text-slate-400";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnAmber =
  "inline-flex items-center justify-center rounded-full bg-amber-600 px-3 py-1.5 text-xs font-600 text-white transition-colors hover:bg-amber-700 disabled:opacity-60";

const STATUS_TEXT = {
  New: "text-slate-600 dark:text-slate-300",
  Lead: "text-brand-700 dark:text-brand-300",
  Opportunity: "text-emerald-700 dark:text-emerald-300",
  "Technical Evaluation": "text-amber-700 dark:text-amber-300",
  "Proposal Ready": "text-brand-700 dark:text-brand-300",
  "Sent to Client": "text-sky-700 dark:text-sky-300",
  Commit: "text-emerald-700 dark:text-emerald-300",
  "Closed Won": "text-emerald-700 dark:text-emerald-300",
  "Closed Lost": "text-red-600 dark:text-red-400",
};

// Sentinel value for the industry <select>'s "Other" option — the actual
// free-typed text lives in form.industryOther and is what gets sent/stored.
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

export default function SalesList() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [services, setServices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(SALES_EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCols, setVisibleCols] = useState(SALES_DEFAULT_COLS);
  const [showCols, setShowCols] = useState(false);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [meRes, uRes, tRes, cRes, qRes, rRes, sRes, setRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/tickets", { cache: "no-store" }),
        fetch("/api/sales-clients", { cache: "no-store" }),
        fetch("/api/quotations", { cache: "no-store" }),
        fetch("/api/rfqs", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      if (tRes.status === 403) throw new Error("You need the Sales or admin tag.");
      const meJson = await meRes.json();
      setMe(meJson?.user || null);
      setUsers(await uRes.json());
      setTickets(await tRes.json());
      setClients(cRes.ok ? await cRes.json() : []);
      setQuotations(qRes.ok ? await qRes.json() : []);
      setRfqs(rRes.ok ? await rRes.json() : []);
      setServices(sRes.ok ? await sRes.json() : []);
      const setJson = setRes.ok ? await setRes.json() : {};
      setPositions(Array.isArray(setJson.salesContactPositions) ? setJson.salesContactPositions : []);
      setCities(Array.isArray(setJson.salesCities) ? setJson.salesCities : []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Keep the ticket list + the open ticket modal's RFQ box live.
  useLivePoll(() => load(true), 15000);

  // Per-user column + filter presets.
  useEffect(() => {
    if (!me?.id) return;
    const cols = loadUserPref(SALES_COLS_PREF, me.id, SALES_DEFAULT_COLS);
    setVisibleCols(Array.isArray(cols) && cols.length ? cols : SALES_DEFAULT_COLS);
    setFilters({ ...SALES_EMPTY_FILTERS, ...loadUserPref(SALES_FILTERS_PREF, me.id, SALES_EMPTY_FILTERS) });
  }, [me?.id]);

  const toggleCol = (key) => setVisibleCols((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    saveUserPref(SALES_COLS_PREF, me?.id, next);
    return next;
  });
  const resetCols = () => { setVisibleCols(SALES_DEFAULT_COLS); saveUserPref(SALES_COLS_PREF, me?.id, SALES_DEFAULT_COLS); };
  const col = (key) => visibleCols.includes(key);
  const setFilter = (patch) => setFilters((prev) => { const next = { ...prev, ...patch }; saveUserPref(SALES_FILTERS_PREF, me?.id, next); return next; });
  const clearFilters = () => { setFilters(SALES_EMPTY_FILTERS); saveUserPref(SALES_FILTERS_PREF, me?.id, SALES_EMPTY_FILTERS); };
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const nameOf = (id) => (id && usersById[id]?.fullName) || (id && usersById[id]?.userId) || (id ? "Removed" : "—");
  const seesAll = canSeeAllIn(me, SALES_TAG);
  const clientsByName = useMemo(() => {
    const map = {};
    for (const c of clients) map[normaliseClientName(c.name)] = c;
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    const num = (v) => (v === "" || v == null ? null : Number(v));
    const probMin = num(f.probMin), probMax = num(f.probMax);
    const valMin = num(f.valueMin), valMax = num(f.valueMax);
    return tickets.filter((t) => {
      if (f.status && t.status !== f.status) return false;
      if (f.urgency && (t.urgency || "Normal") !== f.urgency) return false;
      if (f.client && !`${t.clientName || ""}`.toLowerCase().includes(f.client.toLowerCase())) return false;
      const p = Number(t.probability ?? 0);
      if (probMin != null && Number.isFinite(probMin) && p < probMin) return false;
      if (probMax != null && Number.isFinite(probMax) && p > probMax) return false;
      const val = Number(t.value ?? 0);
      if (valMin != null && Number.isFinite(valMin) && val < valMin) return false;
      if (valMax != null && Number.isFinite(valMax) && val > valMax) return false;
      const created = (t.createdAt || "").slice(0, 10);
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
      const dl = (t.deadline || "").slice(0, 10);
      if (f.deadlineFrom && (!dl || dl < f.deadlineFrom)) return false;
      if (f.deadlineTo && (!dl || dl > f.deadlineTo)) return false;
      const upd = (t.updatedAt || t.createdAt || "").slice(0, 10);
      if (f.updatedFrom && upd < f.updatedFrom) return false;
      if (f.updatedTo && upd > f.updatedTo) return false;
      if (q) {
        const hay = `${t.title||""} ${t.clientName||""} ${t.ticketRef||""} ${t.description||""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [tickets, query, filters]);

  function openCreate() {
    setForm({
      mode: "create",
      title: "",
      status: DEFAULT_STATUS,
      clientName: "",        // free-typed search text
      clientPick: "",        // matched client id once one's chosen from the dropdown
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactPosition: "",
      locationName: "",
      locationCity: "",
      locationUrl: "",
      description: "",
      deadline: "",
      industry: "",
      industryOther: "",
      serviceIds: [],
      serviceRequirements: {},
      projectSize: "",
      clientBudget: "",
      probability: 0,
      newComment: "",
    });
  }

  function toggleFormService(id) {
    setForm((s) => {
      const has = s.serviceIds.includes(id);
      return { ...s, serviceIds: has ? s.serviceIds.filter((x) => x !== id) : [...s.serviceIds, id] };
    });
  }

  function setServiceReq(id, patch) {
    setForm((s) => ({ ...s, serviceRequirements: { ...(s.serviceRequirements || {}), [id]: { ...((s.serviceRequirements || {})[id] || {}), ...patch } } }));
  }

  // The client currently matched by the search box (create mode only) — its
  // contacts feed the Contact-name suggestions.
  const pickedClient = form?.clientPick ? clients.find((c) => c.id === form.clientPick) : null;

  const clientMatches = useMemo(() => {
    if (!form || form.mode !== "create" || form.clientPick) return [];
    const q = normaliseClientName(form.clientName || "");
    if (!q) return [];
    return clients.filter((c) => normaliseClientName(c.name).includes(q)).slice(0, 8);
  }, [form, clients]);

  const contactMatches = useMemo(() => {
    if (!form || !pickedClient) return [];
    const q = normaliseContactName(form.contactName || "");
    const contacts = clientContacts(pickedClient).filter((c) => c.name);
    if (!q) return contacts.slice(0, 8);
    return contacts.filter((c) => normaliseContactName(c.name).includes(q)).slice(0, 8);
  }, [form, pickedClient]);

  // Client search box — free typing always clears any prior pick; picking a
  // suggestion snaps the text to the canonical name and (since it's a
  // different client) resets whatever contact was entered.
  function onClientNameChange(v) {
    setForm((s) => (s.clientPick
      ? { ...s, clientName: v, clientPick: "", contactName: "", contactEmail: "", contactPhone: "" }
      : { ...s, clientName: v }));
    setClientDropdownOpen(true);
  }
  function pickClient(c) {
    setForm((s) => ({ ...s, clientName: c.name, clientPick: c.id, contactName: "", contactEmail: "", contactPhone: "" }));
    setClientDropdownOpen(false);
  }
  // The "+" button: lock in whatever's typed as-is (new or existing name),
  // closing the suggestion list — the dedupe check still runs on Save.
  function confirmClientText() {
    setClientDropdownOpen(false);
  }

  // Contact-name search — scoped to the picked client's own contacts. Typing
  // never overwrites email/phone; only picking a suggestion autofills them,
  // and the user can still freely edit either field afterward.
  function onContactNameChange(v) {
    setForm((s) => ({ ...s, contactName: v }));
    setContactDropdownOpen(true);
  }
  function pickContact(c) {
    setForm((s) => ({ ...s, contactName: c.name, contactEmail: c.email || "", contactPhone: c.phone || "", contactPosition: c.position || s.contactPosition || "" }));
    setContactDropdownOpen(false);
  }

  async function saveTicket() {
    setError("");
    if (form.mode === "create") {
      const finalClientName = form.clientName.trim();
      const finalIndustry = form.industry === OTHER_INDUSTRY ? form.industryOther.trim() : form.industry;
      if (!form.title.trim()) return setError("Title is required.");
      if (!finalClientName) return setError("Client is required.");
      if (!form.deadline) return setError("Deadline is required.");
      if (!finalIndustry) return setError("Type of industry is required.");
      if (form.serviceIds.length === 0) return setError("Type of services is required.");
      if (form.clientBudget !== "" && form.clientBudget != null && (!Number.isFinite(Number(form.clientBudget)) || Number(form.clientBudget) < 0)) return setError("Client Budget must be a positive number.");
      // Dedup: block creating a "new" client that already exists — unless it
      // was reached by picking a suggestion, in which case it's intentional.
      if (!form.clientPick && clientsByName[normaliseClientName(finalClientName)]) {
        return setError(`A client named "${finalClientName}" already exists — pick it from the suggestions instead.`);
      }

      setSaving(true);
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            clientName: finalClientName,
            contactName: form.contactName.trim(),
            contactEmail: form.contactEmail.trim(),
            contactPhone: form.contactPhone.trim(),
            contactPosition: form.contactPosition,
            location: { name: form.locationName.trim(), city: form.locationCity, url: form.locationUrl.trim() },
            description: form.description.trim(),
            deadline: form.deadline,
            industry: finalIndustry,
            serviceIds: form.serviceIds,
            serviceRequirements: form.serviceRequirements,
            clientBudget: form.clientBudget === "" || form.clientBudget == null ? null : Number(form.clientBudget),
            probability: Number(form.probability),
            status: form.status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
        setForm(null);
        await load();
      } catch (e) { setError(e.message); }
      finally { setSaving(false); }
    }
    // Editing is done on the ticket detail page, so this modal only creates.
  }

  async function requestRfq(row) {
    if (!(await confirmDialog({ title: "Request RFQ", message: `Send an RFQ request for "${row.title}" to Technical? They'll see it in the RFQ list as ${row.ticketRef || row.id.slice(0,6)}-R${(row.rfqCount || 0) + 1}.`, confirmLabel: "Send request" }))) return;
    try {
      const res = await fetch(`/api/tickets/${row.id}/request-rfq`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {seesAll ? "Showing tickets from every user (you have the Leader tag)." : "Showing your tickets."} {filtered.length} of {tickets.length}.
        </p>
        <button onClick={openCreate} className={btnPrimary}>
          <Icon name="plus" className="h-4 w-4" /> Create ticket
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="search" placeholder="Search title, client, ref or description…" value={query} onChange={(e) => setQuery(e.target.value)} className={`${input} sm:max-w-xs`} />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-600 transition-colors ${activeFilterCount ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-400 dark:text-brand-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}
        >
          <Icon name="search" className="h-4 w-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          <Icon name={showFilters ? "chevronUp" : "chevronDown"} className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setShowCols(true)} className={btnGhost}>
          <Icon name="menu" className="h-4 w-4" /> Columns
        </button>
      </div>

      {showFilters && (
        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#191921] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</label>
            <input className={input} placeholder="Client contains…" value={filters.client} onChange={(e) => setFilter({ client: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</label>
            <select className={input} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="">Any status</option>
              {TICKET_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Urgency</label>
            <select className={input} value={filters.urgency} onChange={(e) => setFilter({ urgency: e.target.value })}>
              <option value="">Any urgency</option>
              {TICKET_URGENCIES.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Probability (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" placeholder="min" className={input} value={filters.probMin} onChange={(e) => setFilter({ probMin: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="number" min="0" max="100" placeholder="max" className={input} value={filters.probMax} onChange={(e) => setFilter({ probMax: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Value (SAR)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="min" className={input} value={filters.valueMin} onChange={(e) => setFilter({ valueMin: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="number" min="0" placeholder="max" className={input} value={filters.valueMax} onChange={(e) => setFilter({ valueMax: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</label>
            <div className="flex items-center gap-2">
              <DateInput className={input} value={filters.createdFrom} onChange={(v) => setFilter({ createdFrom: v })} />
              <span className="text-slate-400">–</span>
              <DateInput className={input} value={filters.createdTo} onChange={(v) => setFilter({ createdTo: v })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Deadline</label>
            <div className="flex items-center gap-2">
              <DateInput className={input} value={filters.deadlineFrom} onChange={(v) => setFilter({ deadlineFrom: v })} />
              <span className="text-slate-400">–</span>
              <DateInput className={input} value={filters.deadlineTo} onChange={(v) => setFilter({ deadlineTo: v })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Updated</label>
            <div className="flex items-center gap-2">
              <DateInput className={input} value={filters.updatedFrom} onChange={(v) => setFilter({ updatedFrom: v })} />
              <span className="text-slate-400">–</span>
              <DateInput className={input} value={filters.updatedTo} onChange={(v) => setFilter({ updatedTo: v })} />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button onClick={clearFilters} className="text-xs font-600 text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">Clear all filters</button>
          </div>
        </div>
      )}

      {showCols && (
        <ColumnPickerModal
          columns={SALES_COLUMNS}
          selected={visibleCols}
          onToggle={toggleCol}
          onReset={resetCols}
          onClose={() => setShowCols(false)}
          title="Ticket columns"
        />
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-geex border border-slate-200/70 shadow-geex-sm bg-white dark:border-white/10 dark:bg-[#20202c]">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">{tickets.length === 0 ? "No tickets yet." : "No tickets match those filters."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
                  {col("createdAt") && <th className="px-4 py-3.5 text-start font-600">Created</th>}
                  {col("title") && <th className="px-4 py-3.5 text-start font-600">Title</th>}
                  {col("client") && <th className="px-4 py-3.5 text-start font-600">Client</th>}
                  {col("owner") && <th className="px-4 py-3.5 text-start font-600">Owner</th>}
                  {col("value") && <th className="px-4 py-3.5 text-start font-600">Value</th>}
                  {col("deadline") && <th className="px-4 py-3.5 text-start font-600">Deadline</th>}
                  {col("status") && <th className="px-4 py-3.5 text-start font-600">Status</th>}
                  {col("urgency") && <th className="px-4 py-3.5 text-start font-600">Urgency</th>}
                  {col("rfq") && <th className="px-4 py-3.5 text-start font-600">RFQ</th>}
                  {col("updatedAt") && <th className="px-4 py-3.5 text-start font-600">Updated</th>}
                  {col("probability") && <th className="px-4 py-3.5 text-start font-600">Prob.</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const mayEdit = canEditTicket(me, r);
                  const rfq = rfqInfo(r, rfqs, quotations, usersById);
                  // "Unresolved" = a pre-technical ticket (New/Lead/Opportunity)
                  // not yet pushed to Technical (the same rule the sidebar's red
                  // badge counts). Accented with a left stripe so it stands
                  // apart from handled rows.
                  const unresolved = canRequestRfqStatus(r.status) && !rfq.requested;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/studio/sales/tickets/${r.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/studio/sales/tickets/${r.id}`); } }}
                      className={`cursor-pointer border-s-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/[0.03] ${unresolved ? "border-s-amber-400 bg-amber-50/40 dark:border-s-amber-500/70 dark:bg-amber-500/[0.06]" : "border-s-transparent"}`}
                    >
                      {col("createdAt") && <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{fmtDate(r.createdAt)}</td>}
                      {col("title") && (
                      <td className="px-4 py-3.5 font-600 text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-1.5"><span>{r.title}</span>{(() => { const n = unreadCount(r.log, r.id, me); return n ? <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-700 leading-none text-white" title={`${n} update${n === 1 ? "" : "s"}`}>{n}</span> : null; })()}</div>
                        {r.ticketRef && <div className="text-[11px] font-500 text-slate-400">{r.ticketRef}</div>}
                      </td>
                      )}
                      {col("client") && <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{r.clientName}</td>}
                      {col("owner") && <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{nameOf(r.assignedTo || r.createdBy)}</td>}
                      {col("value") && (
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <span className="whitespace-nowrap">{fmtMoney(r.value)}</span>
                      </td>
                      )}
                      {col("deadline") && <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(r.deadline)}</td>}
                      {col("status") && <td className={`px-4 py-3.5 font-600 ${STATUS_TEXT[r.status] || ""}`}>{r.status}</td>}
                      {col("urgency") && (
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[r.urgency] || URGENCY_BADGE.Normal}`}>
                          {r.urgency || "Normal"}
                        </span>
                      </td>
                      )}
                      {col("rfq") && (
                      <td className="px-4 py-3.5">
                        {!rfq.requested
                          ? (canRequestRfqStatus(r.status) && mayEdit
                              ? <button onClick={(e) => { e.stopPropagation(); requestRfq(r); }} className={btnAmber}>Request RFQ</button>
                              : <span className="text-slate-400">—</span>)
                          : (
                            <div>
                              <div className={`text-xs font-600 ${rfq.tone}`}>{rfq.text}</div>
                              {canRequestRfqStatus(r.status) && mayEdit && rfq.status === "Completed" && <button onClick={(e) => { e.stopPropagation(); requestRfq(r); }} className="mt-1 text-[11px] font-500 text-amber-600 hover:underline dark:text-amber-400">+ another RFQ</button>}
                            </div>
                          )
                        }
                      </td>
                      )}
                      {col("updatedAt") && <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{fmtDate(r.updatedAt || r.createdAt)}</td>}
                      {col("probability") && <td className="px-4 py-3.5 font-600 text-slate-700 dark:text-slate-200">{Number(r.probability ?? 0)}%</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#20202c]">
            <div className="shrink-0 border-b border-slate-100 px-6 py-4 dark:border-white/10">
              <h2 className="font-display text-lg font-700 text-slate-900 dark:text-white">
                {form.mode === "create" ? "Create ticket" : `Ticket · ${form.existing?.ticketRef || ""}`}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Title <span className="text-red-500">*</span></label>
                <input className={input} value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
              </div>

              {form.mode === "create" ? (
                <>
                  <div className="relative">
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        className={`${input} pe-10`}
                        placeholder="Search or type a new client name"
                        value={form.clientName}
                        onChange={(e) => onClientNameChange(e.target.value)}
                        onFocus={() => setClientDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setClientDropdownOpen(false), 120)}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={confirmClientText}
                        title="Use this as a new client"
                        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                      </button>
                      {clientDropdownOpen && clientMatches.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#191921]">
                          {clientMatches.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickClient(c)}
                                className="block w-full px-3.5 py-2 text-start text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200"
                              >
                                {c.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {!form.clientPick && form.clientName.trim() && clientsByName[normaliseClientName(form.clientName)] && (
                      <p className="mt-1 text-[11px] font-600 text-amber-600 dark:text-amber-400">
                        A client named &quot;{clientsByName[normaliseClientName(form.clientName)].name}&quot; already exists — pick it from the suggestions instead.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Owner</label>
                    <input className={inputRO} value={me?.fullName || me?.userId || ""} readOnly />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Client</label>
                    <input className={inputRO} value={form.clientName} readOnly />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Owner</label>
                    <input className={inputRO} value={nameOf(form.existing?.assignedTo || form.existing?.createdBy)} readOnly />
                  </div>
                </>
              )}

              {form.mode === "create" ? (
                <div className="relative sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact name</label>
                  <input
                    className={input}
                    placeholder={pickedClient ? "Search existing contacts or type a new name" : "Pick a client first, or type a new contact name"}
                    value={form.contactName}
                    onChange={(e) => onContactNameChange(e.target.value)}
                    onFocus={() => setContactDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setContactDropdownOpen(false), 120)}
                    autoComplete="off"
                  />
                  {contactDropdownOpen && contactMatches.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/15 dark:bg-[#191921]">
                      {contactMatches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickContact(c)}
                            className="flex w-full flex-col px-3.5 py-2 text-start text-sm hover:bg-brand-500/10"
                          >
                            <span className="text-slate-700 dark:text-slate-200">{c.name}</span>
                            <span className="text-xs text-slate-400">{c.email || "—"} · {c.phone || "—"}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact name</label>
                  <input className={input} value={form.contactName} onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))} />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact email</label>
                <input type="email" className={input} value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact phone</label>
                <input type="tel" className={input} value={form.contactPhone} onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact position</label>
                <select className={input} value={form.contactPosition} onChange={(e) => setForm((s) => ({ ...s, contactPosition: e.target.value }))}>
                  <option value="">— none —</option>
                  {positions.map((p) => (<option key={p} value={p}>{p}</option>))}
                  {form.contactPosition && !positions.includes(form.contactPosition) && <option value={form.contactPosition}>{form.contactPosition}</option>}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Location <span className="font-500 normal-case text-slate-400">(carried to the client &amp; project)</span></label>
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
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Client Budget (SAR) <span className="font-500 normal-case text-slate-400">(optional reference)</span>
                </label>
                <input type="number" min="0" step="0.01" className={input} value={form.clientBudget} onChange={(e) => setForm((s) => ({ ...s, clientBudget: e.target.value }))} />
                <p className="mt-1 text-[11px] text-slate-400">The ticket <span className="font-600">Value</span> is set automatically from the latest completed quotation.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Submission deadline <span className="text-red-500">*</span></label>
                <DateInput className={input} value={form.deadline} onChange={(v) => setForm((s) => ({ ...s, deadline: v }))} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Type of industry <span className="text-red-500">*</span></label>
                <select
                  className={input}
                  value={form.industry}
                  onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))}
                >
                  <option value="">Select industry…</option>
                  {TICKET_INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
                  <option value={OTHER_INDUSTRY}>Other</option>
                </select>
                {form.industry === OTHER_INDUSTRY && (
                  <input
                    className={`${input} mt-2`}
                    placeholder="Type the industry"
                    value={form.industryOther}
                    onChange={(e) => setForm((s) => ({ ...s, industryOther: e.target.value }))}
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Type of services <span className="text-red-500">*</span></label>
                {services.length === 0 ? (
                  <p className="text-sm text-slate-400">No services configured yet — add some under Services first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
                    {services.map((svc) => {
                      const checked = form.serviceIds.includes(svc.id);
                      return (
                        <button
                          type="button"
                          key={svc.id}
                          onClick={() => toggleFormService(svc.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-600 transition-colors ${
                            checked
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-brand-400 dark:border-white/15 dark:bg-[#20202c] dark:text-slate-300"
                          }`}
                        >
                          {svc.title_en || "Untitled"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Requirements per service</label>
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

              <div>
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Project size <span className="font-500 normal-case text-slate-400">(auto from quotation value)</span></label>
                <div className={`${input} flex items-center text-slate-400`}>
                  Not yet quoted
                </div>
              </div>

              {/* Status is automated (Lead → Opportunity → post-approval), not set here. */}

              {form.mode !== "create" && (
                <div>
                  <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Urgency {!canSetUrgency(me) && <span className="normal-case font-500 text-slate-400">(Leader only)</span>}
                  </label>
                  {canSetUrgency(me) ? (
                    <select className={input} value={form.urgency} onChange={(e) => setForm((s) => ({ ...s, urgency: e.target.value }))}>
                      {TICKET_URGENCIES.map((u) => (<option key={u} value={u}>{u}</option>))}
                    </select>
                  ) : (
                    <div className={`${inputRO} flex items-center`}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${URGENCY_BADGE[form.urgency] || URGENCY_BADGE.Normal}`}>{form.urgency}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Probability {form.probability}%</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="100" step="1" value={form.probability} onChange={(e) => setForm((s) => ({ ...s, probability: Number(e.target.value) }))} className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/10" />
                  <input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((s) => ({ ...s, probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} className={`${input} w-20`} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</label>
                <textarea rows={3} className={`${input} resize-y`} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              </div>

              {form.mode !== "create" && (() => {
                const ticketRfqs = rfqs
                  .filter((r) => r.sourceTicketId === form.id)
                  .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
                return (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#191921]">
                    <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">RFQ requests</p>
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
                              // The quotation this RFQ became, if any. Its status
                              // (live-synced from Technical) and completion date
                              // drive the last two columns; before conversion we
                              // fall back to the RFQ's own status.
                              const q = r.quotationId ? quotations.find((x) => x.id === r.quotationId) : null;
                              const converted = r.status === "Converted" && q;
                              return (
                                <tr key={r.id} className="border-t border-slate-100 dark:border-white/10">
                                  <td className="py-2 pe-3 align-top">
                                    <span className="font-600 text-slate-700 dark:text-slate-200">{r.reference}</span>
                                    {q?.number && <span className="ms-1 text-[11px] font-500 text-slate-400">· {q.number}</span>}
                                  </td>
                                  <td className="py-2 pe-3 align-top text-xs text-slate-500 dark:text-slate-400">{fmtDate(r.createdAt)}</td>
                                  <td className="py-2 pe-3 align-top text-xs text-slate-500 dark:text-slate-400">{q?.completedAt ? fmtDate(q.completedAt) : "—"}</td>
                                  <td className="py-2 pe-3 align-top">
                                    {converted ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-700 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Converted</span>
                                        <span className="text-xs font-600 text-slate-600 dark:text-slate-300">{q.status}</span>
                                      </span>
                                    ) : (
                                      <span className="text-xs font-600 text-slate-500 dark:text-slate-400">{r.status}</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-end align-top">
                                    {/* Sales can open a finalised (Completed) quotation as view-only. */}
                                    {q && q.status === "Completed" ? (
                                      <a
                                        href={`/studio/quotations/${q.id}/builder`}
                                        title="Open quotation (view only)"
                                        aria-label="Open quotation"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-500/10 dark:text-brand-300"
                                      >
                                        <Icon name="open" className="h-3.5 w-3.5" />
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                      &quot;Completed&quot; = date Technical marked the linked quotation Completed. &quot;Technical status&quot; is that quotation&apos;s live status (or the RFQ&apos;s status before it&apos;s converted).
                    </p>
                  </div>
                );
              })()}

              {form.mode !== "create" && (
                <div className="sm:col-span-2 rounded-xl border border-black bg-slate-50 p-4 dark:border-white dark:bg-[#191921]">
                  <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Comments</p>
                  {(!form.existing.comments || form.existing.comments.length === 0) ? (
                    <p className="text-sm text-slate-400">No comments yet.</p>
                  ) : (
                    <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                      {[...form.existing.comments].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map((c) => (
                        <li key={c.id} className="rounded-lg bg-white p-2.5 text-slate-700 dark:bg-[#20202c] dark:text-slate-300">
                          <div className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">{c.authorUserId || "?"} · {fmtDateTime(c.createdAt)}</div>
                          <div className="whitespace-pre-wrap">{c.text}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Add a comment</label>
                  <textarea rows={2} className={`${input} resize-y`} value={form.newComment || ""} onChange={(e) => setForm((s) => ({ ...s, newComment: e.target.value }))} />
                </div>
              )}
            </div>
            </div>
            <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
              <button onClick={() => setForm(null)} className={btnGhost}>Cancel</button>
              <button onClick={saveTicket} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
