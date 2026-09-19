// CAMPAIGNS — the Marketing department's register (19/09/2026), the parent of
// every marketing activity.
//
// Each campaign reads as one card: what it is for, where it runs, when, whose it
// is, what it may spend, what it should bring in, and the tracked link to put in
// front of people. Every figure on the card — the link, the budget handed to
// sub-campaigns, whether it needs somebody — is the server's, so this list and
// the dashboard cannot disagree.
"use client";
import { useCallback, useEffect, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingDeptDict } from "@/shared/studio/marketingDept";
import { CAMPAIGN_MOVES, CHANNELS, OBJECTIVES, isFinal, campaignDeletable } from "@/modules/marketing/model";

const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Planned: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Paused: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Completed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};
const ATTENTION_TONE = "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";

function Chip({ tone, children }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${tone}`}>{children}</span>;
}

const blank = (v) => (v === null || v === undefined ? "" : String(v));

export default function StudioCampaigns({ slug }) {
  const tr = marketingDeptDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("open");
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState("");
  const [lead, setLead] = useState(null);
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/campaigns`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useEffect(() => {
    let current = true;
    (async () => { if (current) await reload(); })();
    return () => { current = false; };
  }, [reload]);
  useLiveUpdates(slug, "marketing-campaigns", reload);

  // THE SERVER'S REFUSAL, IN WORDS; a token with no sentence is shown as itself
  // rather than replaced with "failed", which would throw the only clue away.
  const send = async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/campaigns`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || "failed"); return false; }
    await reload();
    return true;
  };

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { campaigns = [], people = [], currency = "", canCreate, canEdit, canDelete, canAssign, canSendLeads } = data;
  const cur = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;
  const shown = filter === "all" ? campaigns
    : campaigns.filter((c) => (filter === "open" ? !isFinal(c.status) : isFinal(c.status)));
  // ONLY A TOP-LEVEL CAMPAIGN CAN BE A PARENT, and never the one being edited —
  // the same rule `campaignProblem` refuses on the server.
  const parents = (id) => campaigns.filter((c) => !c.parentId && c.id !== id && !isFinal(c.status));

  const openForm = (c) => setForm(c ? {
    id: c.id, name: c.name, description: c.description, objective: c.objective, channels: c.channels || [],
    parentId: c.parentId, startOn: c.startOn, endOn: c.endOn, ownerCollaboratorId: c.ownerCollaboratorId,
    budget: blank(c.budget), expectedLeads: blank(c.expectedLeads), expectedCustomers: blank(c.expectedCustomers),
    expectedRevenue: blank(c.expectedRevenue), landingUrl: c.landingUrl, utmSource: c.utmSource, utmMedium: c.utmMedium,
    utmCampaign: c.utmCampaign, utmContent: c.utmContent, utmTerm: c.utmTerm, hasChildren: c.children > 0,
    leadDeadlineHours: blank(c.leadDeadlineHours),
  } : {
    name: "", description: "", objective: "leads", channels: [], parentId: "", startOn: "", endOn: "",
    ownerCollaboratorId: "", budget: "", expectedLeads: "", expectedCustomers: "", expectedRevenue: "",
    landingUrl: "", utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "", hasChildren: false,
    leadDeadlineHours: "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleChannel = (ch) => setForm((f) => ({
    ...f, channels: f.channels.includes(ch) ? f.channels.filter((x) => x !== ch) : [...f.channels, ch],
  }));

  const save = async () => {
    const { id, hasChildren, ...fields } = form;
    // A NEW campaign with no owner chosen is owned by whoever raises it, which
    // the server does by itself; sending "" would say "nobody" instead.
    if (!id && !fields.ownerCollaboratorId) delete fields.ownerCollaboratorId;
    // THE OWNER IS THE MANAGER'S TO CHOOSE; without the right it is not sent.
    if (!canAssign) delete fields.ownerCollaboratorId;
    const done = id ? await send("PUT", { id, ...fields }) : await send("POST", fields);
    if (done) setForm(null);
  };

  const sendLead = async () => {
    const { campaignId, ...fields } = lead;
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/campaigns`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaignId, action: "lead", ...fields }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || "failed"); return; }
    setLead(null);
    setNotice(tr.leadSent);
    setTimeout(() => setNotice(""), 2500);
    await reload();
  };

  const copy = async (c) => {
    try { await navigator.clipboard.writeText(c.link); setCopied(c.id); setTimeout(() => setCopied(""), 1500); } catch { /* the link is on screen to select by hand */ }
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.campaigns}</h2>
          <p className={sub}>{tr.campaignsSub}</p>
        </div>
        {canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newCampaign}</button>}
      </div>

      {campaigns.length > 0 && (
        <div role="tablist" aria-label={tr.campaigns} className="flex flex-wrap gap-2">
          {[["open", tr.filterOpen], ["finished", tr.filterFinished], ["all", tr.filterAll]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-600 transition-colors ${filter === key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"}`}>
              {label}
              <span className="ms-1.5 tabular-nums opacity-70">
                {key === "all" ? campaigns.length
                  : campaigns.filter((c) => (key === "open" ? !isFinal(c.status) : isFinal(c.status))).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {!campaigns.length ? (
        <Empty title={tr.noCampaigns} body={tr.noCampaignsBody} />
      ) : !shown.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingHere}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((c) => {
            const moves = CAMPAIGN_MOVES[c.status] || [];
            const deletable = !campaignDeletable(c.status, c.children > 0);
            return (
              <section key={c.id} className={panel}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.reference}</span>
                    <span className="font-600">{c.name}</span>
                    <Chip tone={STATUS_TONE[c.status] || STATUS_TONE.Draft}>{tr.status(c.status)}</Chip>
                    {c.attention && <Chip tone={ATTENTION_TONE}>{tr.attention(c.attention)}</Chip>}
                  </p>
                  {c.parentName && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.subCampaignOf(c.parentName)}</p>}
                  {c.description && <p className="mt-1 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{c.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tone="bg-brand-500/10 text-brand-800 dark:text-brand-200">{tr.objectiveName(c.objective)}</Chip>
                    {(c.channels || []).map((ch) => (
                      <Chip key={ch} tone="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">{tr.channelName(ch)}</Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {tr.when(c.startOn ? fmtDate(c.startOn) : "", c.endOn ? fmtDate(c.endOn) : "")}
                    {c.ownerAlias ? ` · ${tr.ownedBy(c.ownerAlias)}` : ""}
                  </p>
                  {(c.budget !== null || c.split.allocated > 0) && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {c.budget !== null && <span className="num font-600">{tr.budget}: {cur(c.budget)}</span>}
                      {c.children > 0 && (
                        <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                          {tr.subCampaigns(c.children)} · {c.split.left === null
                            ? tr.allocatedNoBudget(cur(c.split.allocated))
                            : tr.allocated(cur(c.split.allocated), cur(c.split.left))}
                        </span>
                      )}
                    </p>
                  )}
                  {(c.expectedLeads !== null || c.expectedCustomers !== null || c.expectedRevenue !== null) && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {[
                        c.expectedLeads !== null && `${tr.expectedLeads}: ${c.expectedLeads}`,
                        c.expectedCustomers !== null && `${tr.expectedCustomers}: ${c.expectedCustomers}`,
                        c.expectedRevenue !== null && `${tr.expectedRevenue}: ${cur(c.expectedRevenue)}`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {/* WHAT IT BROUGHT IN, from the Sales tickets that name it. */}
                  <p className="mt-1 text-xs font-600 text-slate-700 dark:text-slate-200">
                    {c.results?.leads ? tr.results(c.results.leads, c.results.won, cur(c.results.wonValue)) : tr.noResults}
                  </p>
                  {c.link && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-600 text-slate-500 dark:text-slate-400">{tr.trackedLink}</span>
                      <code dir="ltr" className="min-w-0 max-w-full truncate rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-200">{c.link}</code>
                      <button type="button" className={`${btnRow} text-xs`} onClick={() => copy(c)}>
                        {copied === c.id ? tr.copied : tr.copy}
                      </button>
                    </div>
                  )}
                </div>

                {(canEdit || canCreate || canDelete) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    {canEdit && moves.map((to) => (
                      <button key={to} type="button" className={to === "Cancelled" ? btnRowDanger : btnRow} disabled={busy}
                        onClick={() => send("PUT", { id: c.id, action: "move", status: to })}>
                        {tr.moveTo} {tr.status(to)}
                      </button>
                    ))}
                    {canEdit && !isFinal(c.status) && (
                      <button type="button" className={btnRow} disabled={busy} onClick={() => openForm(c)}>{tr.edit}</button>
                    )}
                    {canCreate && (
                      <button type="button" className={btnRow} disabled={busy}
                        onClick={() => send("PUT", { id: c.id, action: "clone" })}>{tr.clone}</button>
                    )}
                    {canSendLeads && c.status !== "Cancelled" && (
                      <button type="button" className={btnRow} disabled={busy}
                        onClick={() => setLead({ campaignId: c.id, clientName: "", contactName: "", contactPhone: "", contactEmail: "", title: "", description: "" })}>
                        {tr.sendLead}
                      </button>
                    )}
                    {canDelete && deletable && (
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => { if (window.confirm(tr.confirmRemove)) send("DELETE", { id: c.id }); }}>{tr.remove}</button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editCampaign : tr.newCampaign} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <Field label={tr.name} required value={form.name} onChange={set("name")} inputProps={{ maxLength: 200 }} />
            <Field label={tr.description} as="textarea" value={form.description} onChange={set("description")}
              inputProps={{ maxLength: 4000 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.objective} as="select" required value={form.objective} onChange={set("objective")}
                options={OBJECTIVES.map((o) => ({ value: o, label: tr.objectiveName(o) }))} />
              {!form.hasChildren && (
                <Field label={tr.parent} as="select" value={form.parentId} onChange={set("parentId")}
                  options={[{ value: "", label: tr.noParent },
                    ...parents(form.id).map((p) => ({ value: p.id, label: `${p.reference} · ${p.name}` }))]} />
              )}
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.channelsLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => {
                  const on = form.channels.includes(ch);
                  return (
                    <button key={ch} type="button" aria-pressed={on} onClick={() => toggleChannel(ch)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${on
                        ? "border-brand-500 bg-brand-500/10 font-600 text-brand-800 dark:text-brand-200"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                      {tr.channelName(ch)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.starts} type="date" value={form.startOn} onChange={set("startOn")} />
              <Field label={tr.ends} type="date" value={form.endOn} onChange={set("endOn")} />
              {canAssign ? (
                <Field label={tr.owner} as="select" value={form.ownerCollaboratorId} onChange={set("ownerCollaboratorId")}
                  options={[{ value: "", label: tr.nobody }, ...people.map((p) => ({ value: p.id, label: p.alias || p.id }))]} />
              ) : (
                <p className="self-center text-xs text-slate-500 dark:text-slate-400">{tr.ownerManaged}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.budget} type="number" value={form.budget} onChange={set("budget")}
                hint={tr.budgetHint(currency)} inputProps={{ min: 0, step: "any" }} />
              <Field label={tr.leadDeadline} type="number" value={form.leadDeadlineHours} onChange={set("leadDeadlineHours")}
                hint={tr.leadDeadlineHint} inputProps={{ min: 1, max: 168, step: 1 }} />
            </div>

            <div>
              <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.expectedHeading}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr.expectedHint}</p>
              <div className="mt-2 grid gap-4 sm:grid-cols-3">
                <Field label={tr.expectedLeads} type="number" value={form.expectedLeads} onChange={set("expectedLeads")} inputProps={{ min: 0, step: 1 }} />
                <Field label={tr.expectedCustomers} type="number" value={form.expectedCustomers} onChange={set("expectedCustomers")} inputProps={{ min: 0, step: 1 }} />
                <Field label={tr.expectedRevenue} type="number" value={form.expectedRevenue} onChange={set("expectedRevenue")} inputProps={{ min: 0, step: "any" }} />
              </div>
            </div>

            <div>
              <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.trackingHeading}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr.trackingHint}</p>
              <div className="mt-2 space-y-4">
                <Field label={tr.landingUrl} value={form.landingUrl} onChange={set("landingUrl")}
                  inputProps={{ maxLength: 1000, dir: "ltr", inputMode: "url", placeholder: "https://" }} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={tr.utmSource} value={form.utmSource} onChange={set("utmSource")} inputProps={{ maxLength: 100, dir: "ltr" }} />
                  <Field label={tr.utmMedium} value={form.utmMedium} onChange={set("utmMedium")} inputProps={{ maxLength: 100, dir: "ltr" }} />
                  <Field label={tr.utmCampaign} value={form.utmCampaign} onChange={set("utmCampaign")} hint={tr.utmCampaignHint} inputProps={{ maxLength: 100, dir: "ltr" }} />
                  <Field label={tr.utmContent} value={form.utmContent} onChange={set("utmContent")} inputProps={{ maxLength: 100, dir: "ltr" }} />
                  <Field label={tr.utmTerm} value={form.utmTerm} onChange={set("utmTerm")} inputProps={{ maxLength: 100, dir: "ltr" }} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.name.trim()} onClick={save}>
                {busy ? tr.saving : tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {lead && (
        <Dialog title={tr.sendLeadTitle} description={tr.sendLeadHint} onClose={() => setLead(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <Field label={tr.leadName} required value={lead.clientName} inputProps={{ maxLength: 160 }}
              onChange={(v) => setLead((l) => ({ ...l, clientName: v }))} />
            <Field label={tr.leadContact} value={lead.contactName} inputProps={{ maxLength: 120 }}
              onChange={(v) => setLead((l) => ({ ...l, contactName: v }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.leadPhone} type="tel" value={lead.contactPhone} inputProps={{ maxLength: 60, dir: "ltr" }}
                onChange={(v) => setLead((l) => ({ ...l, contactPhone: v }))} />
              <Field label={tr.leadEmail} type="email" value={lead.contactEmail} inputProps={{ maxLength: 200, dir: "ltr" }}
                onChange={(v) => setLead((l) => ({ ...l, contactEmail: v }))} />
            </div>
            <Field label={tr.leadWants} value={lead.title} inputProps={{ maxLength: 200 }}
              onChange={(v) => setLead((l) => ({ ...l, title: v }))} />
            <Field label={tr.leadNotes} as="textarea" value={lead.description} inputProps={{ maxLength: 4000 }}
              onChange={(v) => setLead((l) => ({ ...l, description: v }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setLead(null)}>{tr.cancel}</button>
              <button type="button" className={btn} onClick={sendLead}
                disabled={busy || !lead.clientName.trim() || (!lead.contactPhone.trim() && !lead.contactEmail.trim())}>
                {busy ? tr.saving : tr.send}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
