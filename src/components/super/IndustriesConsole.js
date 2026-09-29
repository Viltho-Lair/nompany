"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Card, CardBody, CardHead, Table } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";

// THE INDUSTRIES A COMPANY PICKS FROM — the owner, 29/09/2026: "i need to
// control these industries, set in-active industries, and each industry will
// have its own profile, what sections and departments does it offer ...
// locking a department so no changes done on it unintentionally."
//
// WHAT EACH PART OF AN INDUSTRY DOES, in the words a studio meets them by:
//   Names          what the create screen, Studio settings and the website show
//   Sentence       the one line under the industry's name on the website
//   Active         off: not offered to NEW studios and not on the website; a
//                  studio that already chose it keeps working exactly as before
//   Specialisms    what a company actually picks. Each starts from one of the
//                  25 setup templates (service actions, roles, deal flow). A
//                  saved one is switched off, never removed — studios hold it
//   Sections       the departments a new studio starts with switched on. Only
//                  pre-filled: the owner may add any other at creation or later
//   Departments    the org chart seeded into a new studio's department register
//   Locked         every change refused until somebody unlocks it on purpose
//
// A PROFILE IS A SEED. Editing one changes the next studio created, never one
// that exists — their switches and org charts are their own.

const input = "ad-input";
const label = "ad-label";
const muted = "text-sm text-[var(--ad-muted-foreground)]";
const chip = (on) =>
  `rounded-full px-2.5 py-1 text-xs transition-colors ${on ? "bg-[var(--ad-primary)] text-white" : "bg-[var(--ad-muted)] text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]"}`;

const blankIndustry = () => ({
  key: "", en: "", ar: "", lead: { en: "", ar: "" }, active: true, locked: false,
  profile: { sections: ["crm-sales", "hr", "finance", "reports"], departments: [
    { name: "Finance & Accounting", code: "FIN", parent: "", sectionKeys: ["finance"] },
    { name: "Human Resources", code: "HR", parent: "", sectionKeys: ["hr"] },
    { name: "Administration", code: "ADM", parent: "", sectionKeys: ["administration"] },
  ] },
  specialisms: [{ key: "", en: "", ar: "", field: "", active: true }],
  builtIn: false,
});

// The service answers in codes; each is said here in words, with the thing it
// is about, so a refusal points at the row to fix.
function explain(problem) {
  const [code, what = ""] = String(problem).split(/:(.*)/s);
  return {
    key: "The industry needs an English name made of letters or digits.",
    name: "The industry needs a name in English and in Arabic.",
    "no-specialisms": "Add at least one specialism.",
    "specialism-key": `Specialism “${what}” needs an English name made of letters or digits.`,
    "specialism-taken": `Specialism “${what}” already exists — in this industry or another. Names must be unique across all industries.`,
    "specialism-name": `Specialism “${what}” needs a name in English and in Arabic.`,
    "specialism-field": `Specialism “${what}” needs a setup template.`,
    "no-sections": "Choose at least one section a new studio starts with.",
    section: `“${what}” is not a department a studio can switch on.`,
    "no-departments": "Add at least one department to the org chart.",
    department: what,
  }[code] || problem;
}

const refusal = (out) => ({
  locked: "This industry is locked. Unlock it first — on purpose.",
  taken: "An industry with that name already exists.",
  name: "The industry needs an English name.",
  notfound: "That industry no longer exists. Reload the page.",
  "not-built-in": "Only a built-in industry can go back to the code's version.",
}[out.error] || (out.error === "invalid" ? "" : out.error || "That did not save."));

export default function IndustriesConsole() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null); // { mode: "add" | "edit", industry }
  const [confirmUnlock, setConfirmUnlock] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/industries", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the industries."); return; }
    setData(await res.json());
  }, []);
  useReload(load);

  async function send(url, method, body) {
    setBusy(true); setError(""); setProblems([]);
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(refusal(out));
      setProblems(Array.isArray(out.problems) ? out.problems.map(explain) : []);
      return false;
    }
    // Re-read rather than splice: the list carries `customised`, which only the GET knows.
    await load();
    return true;
  }

  if (error && !data) return <p className={muted}>{error}</p>;
  if (!data) return <p className={muted}>Loading…</p>;

  const { industries = [], options = { sections: [], departmentSections: [], fields: [] } } = data;
  const sectionName = (k) => [...options.sections, ...options.departmentSections].find((s) => s.key === k)?.name || k;

  const save = async () => {
    const ind = draft.industry;
    const ok = draft.mode === "add"
      ? await send("/api/super/industries", "POST", ind)
      : await send(`/api/super/industries/${encodeURIComponent(ind.key)}`, "PUT", ind);
    if (ok) setDraft(null);
  };

  return (
    <Card>
      <CardHead
        title="Industries"
        sub="What a company picks when it creates a studio, and what each industry starts a new studio with. Changes reach the next studio created — never one that exists."
        action={<Button disabled={busy || !!draft} onClick={() => { setError(""); setProblems([]); setDraft({ mode: "add", industry: blankIndustry() }); }}>Add an industry</Button>}
      />
      <CardBody>
        {error && <p className="mb-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        {problems.length > 0 && (
          <ul className="mb-4 list-disc space-y-1 ps-5 text-sm text-rose-600 dark:text-rose-400">
            {problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        )}

        {draft && (
          <Editor
            draft={draft}
            setDraft={setDraft}
            options={options}
            busy={busy}
            onSave={save}
            onCancel={() => { setDraft(null); setError(""); setProblems([]); }}
          />
        )}

        <Table head={["Industry", "Specialisms", "Starts with", "Org chart", "Status", { label: "", align: "end" }]}>
          {industries.map((i) => {
            const onSpecs = i.specialisms.filter((s) => s.active).length;
            return (
              <tr key={i.key}>
                <td>
                  <span className="font-500">{i.en}</span>
                  <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]" dir="rtl" lang="ar">{i.ar}</p>
                </td>
                <td>{onSpecs === i.specialisms.length ? i.specialisms.length : `${onSpecs} of ${i.specialisms.length}`}</td>
                <td title={i.profile.sections.map(sectionName).join(", ")}>{i.profile.sections.length} sections</td>
                <td>{i.profile.departments.length}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={i.active ? "success" : "muted"}>{i.active ? "Active" : "Inactive"}</Badge>
                    {i.locked && <Badge tone="warning">Locked</Badge>}
                    <Badge tone="muted">{i.builtIn ? (i.customised ? "Built-in · changed" : "Built-in") : "Added here"}</Badge>
                  </div>
                </td>
                <td className="whitespace-nowrap text-end">
                  {i.locked ? (
                    confirmUnlock === i.key ? (
                      <>
                        <span className="me-2 text-xs text-[var(--ad-muted-foreground)]">Unlock {i.en}?</span>
                        <Button size="sm" variant="destructive" disabled={busy}
                          onClick={async () => { if (await send(`/api/super/industries/${encodeURIComponent(i.key)}`, "PATCH", { locked: false })) setConfirmUnlock(""); }}>Unlock</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmUnlock("")}>Keep locked</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy || !!draft} onClick={() => setConfirmUnlock(i.key)}>Unlock…</Button>
                    )
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" disabled={busy || !!draft}
                        onClick={() => { setError(""); setProblems([]); setDraft({ mode: "edit", industry: structuredClone(i) }); }}>Edit</Button>
                      <Button size="sm" variant="ghost" disabled={busy || !!draft}
                        onClick={() => send(`/api/super/industries/${encodeURIComponent(i.key)}`, "PATCH", { locked: true })}>Lock</Button>
                      {/* BACK TO THE CODE'S VERSION, built-ins only — an
                          industry added here has no code version to go back
                          to, and is switched off rather than removed. */}
                      {i.builtIn && i.customised && (
                        <Button size="sm" variant="ghost" disabled={busy || !!draft}
                          onClick={() => send(`/api/super/industries/${encodeURIComponent(i.key)}`, "DELETE")}>Revert</Button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      </CardBody>
    </Card>
  );
}

function Editor({ draft, setDraft, options, busy, onSave, onCancel }) {
  const ind = draft.industry;
  const saved = new Set(draft.mode === "edit" ? ind.specialisms.filter((s) => s.key).map((s) => s.key) : []);
  const set = (patch) => setDraft({ ...draft, industry: { ...ind, ...patch } });
  const setProfile = (patch) => set({ profile: { ...ind.profile, ...patch } });
  const setSpec = (i, patch) => set({ specialisms: ind.specialisms.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setDept = (i, patch) => setProfile({ departments: ind.profile.departments.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const toggle = (list, k) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const fieldOptions = [{ value: "", label: "— choose a template —" }, ...options.fields.map((f) => ({ value: f, label: f }))];
  const codes = ind.profile.departments.map((d) => d.code).filter(Boolean);

  return (
    <div className="mb-6 space-y-6 rounded-xl border border-[var(--ad-border)] p-4">
      <p className="text-sm font-600">{draft.mode === "add" ? "A new industry" : `Editing ${ind.en}`}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Name (English)</label>
          <input className={input} value={ind.en} disabled={busy} onChange={(e) => set({ en: e.target.value })} />
          {draft.mode === "add" && <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">Its address is made from this name and cannot change afterwards.</p>}
        </div>
        <div>
          <label className={label}>Name (Arabic)</label>
          <input className={input} dir="rtl" lang="ar" value={ind.ar} disabled={busy} onChange={(e) => set({ ar: e.target.value })} />
        </div>
        <div>
          <label className={label}>Website sentence (English)</label>
          <textarea className={input} rows={2} value={ind.lead.en} disabled={busy} onChange={(e) => set({ lead: { ...ind.lead, en: e.target.value } })} />
        </div>
        <div>
          <label className={label}>Website sentence (Arabic)</label>
          <textarea className={input} rows={2} dir="rtl" lang="ar" value={ind.lead.ar} disabled={busy} onChange={(e) => set({ lead: { ...ind.lead, ar: e.target.value } })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ind.active} disabled={busy} onChange={(e) => set({ active: e.target.checked })} />
        Active — offered to new studios and shown on the website
      </label>

      <section>
        <p className="text-sm font-600">Specialisms</p>
        <p className={`${muted} mb-3`}>What a company actually picks. A saved specialism is switched off rather than removed: studios may hold it.</p>
        <div className="space-y-2">
          {ind.specialisms.map((s, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto_auto]">
              <input className={input} placeholder="English" value={s.en} disabled={busy} onChange={(e) => setSpec(i, { en: e.target.value })} />
              <input className={input} placeholder="العربية" dir="rtl" lang="ar" value={s.ar} disabled={busy} onChange={(e) => setSpec(i, { ar: e.target.value })} />
              <SelectMenu className={input} value={s.field} options={fieldOptions} onChange={(v) => setSpec(i, { field: v })} aria-label="Setup template" />
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={s.active} disabled={busy} onChange={(e) => setSpec(i, { active: e.target.checked })} />
                Active
              </label>
              {saved.has(s.key)
                ? <span className="w-16" />
                : <Button size="sm" variant="ghost" disabled={busy} onClick={() => set({ specialisms: ind.specialisms.filter((_, j) => j !== i) })}>Remove</Button>}
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3" disabled={busy}
          onClick={() => set({ specialisms: [...ind.specialisms, { key: "", en: "", ar: "", field: "", active: true }] })}>Add a specialism</Button>
      </section>

      <section>
        <p className="text-sm font-600">Sections a new studio starts with</p>
        <p className={`${muted} mb-3`}>Pre-filled on the create screen. The owner can still add any other department there, or later in Studio settings.</p>
        <div className="flex flex-wrap gap-1.5">
          {options.sections.map((sec) => (
            <button key={sec.key} type="button" disabled={busy} aria-pressed={ind.profile.sections.includes(sec.key)}
              className={chip(ind.profile.sections.includes(sec.key))}
              onClick={() => setProfile({ sections: toggle(ind.profile.sections, sec.key) })}>{sec.name}</button>
          ))}
        </div>
      </section>

      <section>
        <p className="text-sm font-600">Org chart</p>
        <p className={`${muted} mb-3`}>Seeded into a new studio&apos;s department register. A code is short and unique; a department may sit under another by its code.</p>
        <div className="space-y-3">
          {ind.profile.departments.map((d, i) => (
            <div key={i} className="rounded-lg border border-[var(--ad-border)] p-3">
              <div className="grid items-center gap-2 sm:grid-cols-[1.6fr_0.6fr_1fr_auto]">
                <input className={input} placeholder="Department" value={d.name} disabled={busy} onChange={(e) => setDept(i, { name: e.target.value })} />
                <input className={input} placeholder="Code" value={d.code} disabled={busy} onChange={(e) => setDept(i, { code: e.target.value.toUpperCase() })} />
                <SelectMenu className={input} value={d.parent} aria-label="Sits under"
                  options={[{ value: "", label: "— top level —" }, ...codes.filter((c) => c !== d.code).map((c) => ({ value: c, label: `Under ${c}` }))]}
                  onChange={(v) => setDept(i, { parent: v })} />
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => setProfile({ departments: ind.profile.departments.filter((_, j) => j !== i) })}>Remove</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {options.departmentSections.map((sec) => (
                  <button key={sec.key} type="button" disabled={busy} aria-pressed={d.sectionKeys.includes(sec.key)}
                    className={chip(d.sectionKeys.includes(sec.key))}
                    onClick={() => setDept(i, { sectionKeys: toggle(d.sectionKeys, sec.key) })}>{sec.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="mt-3" disabled={busy}
          onClick={() => setProfile({ departments: [...ind.profile.departments, { name: "", code: "", parent: "", sectionKeys: [] }] })}>Add a department</Button>
      </section>

      <div className="flex gap-3">
        <Button disabled={busy || !ind.en.trim()} onClick={onSave}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
