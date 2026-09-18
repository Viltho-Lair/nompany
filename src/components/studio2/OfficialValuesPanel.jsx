"use client";

import { useCallback, useMemo, useState } from "react";
import SettingsFold from "@/components/studio2/SettingsFold";
import { useReload } from "@/components/studio2/useReload";
import { input, btn, fmtDateTime } from "@/components/studio2/ui";
import { officialValuesDict } from "@/shared/studio/officialValues";
import { sectionName } from "@/shared/studio/sections";
// PURE AND SHARED WITH THE SERVER, so a value is judged here by the same
// function that will judge it on save — the screen never accepts what the
// server would refuse, nor refuses what it would take.
import { valueProblem } from "@/shared/compliance/definition";

// OFFICIAL STUDIO VALUES — the country's official fields, filled in by the
// Studio. ITS OWN FETCH AND SAVE CYCLE against its own route, for the reason
// Service actions has one: a save is judged against the country's rule, written
// all-or-nothing, and recorded in a history, none of which the general settings
// PUT does.
//
// ONLY THE SELECTED COUNTRY'S FIELDS ARE EVER SHOWN — the server sends no
// other country's. Changing the country (Owner only, the row above) re-renders
// this section on the next load, and a value typed into a field both countries
// share is still there.

const DEPARTMENT_ORDER = ["company", "finance", "hr", "invoicing", "logistics"];

// MOUNTED WITH `key={country}` BY THE PARENT, so changing the country on the
// row above remounts this section and it reads the new country's fields. That is
// the whole re-render: no field of one country survives into the other's form.
export default function OfficialValuesPanel({ slug, locale = "en", country }) {
  const tr = officialValuesDict(locale);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [refused, setRefused] = useState({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings/official-values`, { cache: "no-store" });
    if (!res.ok) { setData({ unavailable: true }); return; }
    const body = await res.json();
    setData(body);
    setDraft(Object.fromEntries((body.fields || []).map((f) => [f.key, f.value])));
    setRefused({});
  }, [slug]);
  useReload(load);

  const fields = useMemo(() => data?.fields || [], [data]);
  const groups = useMemo(() => DEPARTMENT_ORDER
    .map((d) => ({ department: d, fields: fields.filter((f) => f.department === d) }))
    .filter((g) => g.fields.length), [fields]);

  if (!data) return null;
  if (data.unavailable) return null;

  const countryName = data.country ? (data.country.name?.[locale] || data.country.name?.en) : String(country || "");
  const lead = data.country ? tr.lead(countryName) : tr.leadNoCountry;
  const changed = fields.filter((f) => (draft[f.key] ?? "") !== (f.value ?? ""));
  const liveProblem = (f) => refused[f.key] || valueProblem(f, draft[f.key] ?? "");
  const hasLiveProblem = changed.some((f) => liveProblem(f));
  const labelOf = (key) => fields.find((f) => f.key === key)?.label?.[locale] || key;

  async function save() {
    if (!changed.length) { setStatus(tr.nothingChanged); return; }
    setBusy(true); setStatus(""); setRefused({});
    const res = await fetch(`/api/studios/${slug}/settings/official-values`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: Object.fromEntries(changed.map((f) => [f.key, draft[f.key] ?? ""])) }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setRefused(body.fields || {});
      setStatus(tr.failed);
      return;
    }
    setData(body);
    setDraft(Object.fromEntries((body.fields || []).map((f) => [f.key, f.value])));
    setStatus(body.changed?.length ? tr.saved : tr.nothingChanged);
  }

  return (
    <SettingsFold heading={tr.heading} lead={lead} attention={Boolean(status && Object.keys(refused).length)}>
      {!data.country ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {country ? tr.noDefinition(String(country)) : tr.noCountry}
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {!data.canEdit && <p className="text-sm text-slate-500 dark:text-slate-400">{tr.readOnly}</p>}

          {groups.map((g) => (
            <section key={g.department} className="space-y-3">
              <h4 className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.department(g.department)}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.fields.map((f) => {
                  const id = `official-${f.key}`;
                  const value = draft[f.key] ?? "";
                  const problem = liveProblem(f);
                  const section = f.appliesWhen?.sectionOn;
                  const notApplicable = !f.applicable
                    ? (f.appliesWhen?.vatRegistered
                      ? tr.notApplicableVat
                      : tr.notApplicableSection(sectionName(section, data.sectionNames?.[section] || section, locale)))
                    : "";
                  // A VALUE KEPT ACROSS A COUNTRY CHANGE that does not fit this
                  // country's rule — shown so the Owner can correct it, because
                  // the resolver will not print it as it stands.
                  const kept = f.problem && value === f.value;
                  return (
                    <div key={f.key} className={`space-y-1 ${f.applicable ? "" : "opacity-70"}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <label htmlFor={id} className="text-sm font-600 text-slate-800 dark:text-slate-100">{f.label?.[locale] || f.label?.en}</label>
                        <span className={`text-[11px] font-600 ${f.required === "mandatory" ? "text-brand-700 dark:text-brand-300" : "text-slate-400 dark:text-slate-500"}`}>
                          {tr.required(f.required)}
                        </span>
                      </div>
                      <input
                        id={id}
                        type={f.input === "date" ? "date" : "text"}
                        className={`${input} ${problem && value ? "border-rose-300 dark:border-rose-500/50" : ""}`}
                        value={value}
                        maxLength={f.maxLength}
                        disabled={!data.canEdit || busy}
                        aria-invalid={Boolean(problem && value)}
                        aria-describedby={`${id}-hint`}
                        onChange={(e) => { setDraft((d) => ({ ...d, [f.key]: e.target.value })); setStatus(""); setRefused((r) => ({ ...r, [f.key]: "" })); }}
                      />
                      <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{f.hint?.[locale] || f.hint?.en}</p>
                      {problem && value && !kept && <p className="text-xs text-rose-600 dark:text-rose-300">{tr.problem(problem)}</p>}
                      {kept && <p className="text-xs text-amber-700 dark:text-amber-300">{tr.keptInvalid}</p>}
                      {notApplicable && <p className="text-xs text-slate-500 dark:text-slate-400">{notApplicable}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {data.canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={btn} onClick={save} disabled={busy || hasLiveProblem}>
                {busy ? tr.saving : tr.save}
              </button>
              {status && <span className="text-sm text-slate-500 dark:text-slate-400" role="status">{status}</span>}
            </div>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500">{tr.researched(data.country.checked)}</p>

          {/* WHO CHANGED WHAT, AND WHEN — these values are printed on legal
              documents, so every change is kept (append-only) and shown here,
              newest first. A country change is part of the same history, since
              it decides which of these values print at all. */}
          <details className="rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
            <summary className="cursor-pointer text-sm font-600 text-slate-700 dark:text-slate-200">{tr.history}</summary>
            {(data.history || []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noHistory}</p>
            ) : (
              <ol className="mt-3 space-y-2 text-sm">
                {data.history.map((h) => (
                  <li key={h.id} className="grid gap-0.5">
                    <span className="text-slate-800 dark:text-slate-100">
                      <span className="font-600">{h.key === "country" ? tr.country : labelOf(h.key)}</span>
                      {" — "}
                      <span className="num">{h.from || "—"}</span> → <span className="num">{h.to || tr.cleared}</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {fmtDateTime(h.at)} {tr.changedBy(h.byAlias)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </details>
        </div>
      )}
    </SettingsFold>
  );
}
