"use client";

import { useCallback, useState } from "react";
import { Card, CardHead, CardBody, Table, Button } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";

// WHAT A STUDIO CAN BE MEASURED ON — the owner, 03/10/2026: /super keeps the
// list, each studio types its own numbers in Studio settings.
//
// A MEASURE HAS NO NUMBER HERE, deliberately: "work orders done by their due
// date", "first delivery within … days of the project". Nothing on this screen
// can set a target, because a company's targets are its own and nompany never
// invents one for it.
//
// THE BUILT-INS ship with the product. One can be reworded or switched off,
// never removed — studios hold targets keyed by its id. A measure added here
// can be removed, unless a share measure is counted from it.

const input = "ad-input";
const label = "ad-label";
const muted = "text-sm text-[var(--ad-muted-foreground)]";

const KIND_WORDS = {
  reach: "Reach a step within … days",
  onTime: "Done by its own due date",
  count: "How many in a period",
  value: "How much money in a period",
  share: "Share that met another measure",
  avgDays: "Average days to finish (at most)",
};

const blank = { id: "", name: { en: "", ar: "" }, workType: "deal", kind: "reach", step: "", from: "", of: "", per: "month", active: true };

export default function KpiMeasures() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/kpi-measures", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the measures."); return; }
    setData(await res.json());
  }, []);
  useReload(load);

  const send = async (method, body) => {
    setBusy(true); setError("");
    const res = await fetch("/api/super/kpi-measures", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || out.error) {
      setError(out.error === "name" ? "A measure needs its name in English."
        : out.error === "in-use" ? "A share measure is counted from this one; remove or switch that off first."
          : String(out.error || "That did not save.").replace(/^measure-refused: /, ""));
      return false;
    }
    if (out.measures) setData((d) => ({ ...d, measures: out.measures }));
    return true;
  };

  if (error && !data) return <p className={muted}>{error}</p>;
  if (!data) return <p className={muted}>Loading…</p>;

  const { measures = [], workTypes = [], itemKinds = [], periods = [] } = data;
  const typeOf = (key) => workTypes.find((t) => t.key === key);
  const stepName = (type, token) => typeOf(type)?.steps.find((s) => s.token === token)?.label || token;
  const isItem = (kind) => itemKinds.includes(kind);

  const describe = (m) => {
    if (m.kind === "reach") return `${stepName(m.workType, m.step)}${m.from ? ` · timed from ${stepName(m.workType, m.from)}` : " · timed from opening"}`;
    if (m.kind === "share") return `of “${measures.find((x) => x.id === m.of)?.name.en || m.of}” · per ${m.per}`;
    if (!isItem(m.kind)) return `per ${m.per}`;
    return "";
  };

  const steps = draft ? (typeOf(draft.workType)?.steps || []) : [];
  const stepOptions = [{ value: "", label: "— choose —" }, ...steps.map((s) => ({ value: s.token, label: s.label }))];
  const ofOptions = [{ value: "", label: "— choose —" },
    ...measures.filter((m) => draft && m.workType === draft.workType && isItem(m.kind)).map((m) => ({ value: m.id, label: m.name.en }))];

  return (
    <Card>
      <CardHead
        title="KPI measures"
        sub="What a studio can be measured on, with no numbers: each studio sets its own targets in Studio settings, and can override one per deal flow. A changed target never re-judges work already under way."
        action={<Button onClick={() => setDraft({ ...blank, name: { ...blank.name } })} disabled={busy}>Add a measure</Button>}
      />
      <CardBody>
        {error && <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {draft && (
          <div className="mb-6 rounded-xl border border-[var(--ad-border)] p-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label}>Name (English)</label>
                <input className={input} value={draft.name.en} disabled={busy} placeholder="First delivery within … days of the project"
                  onChange={(e) => setDraft({ ...draft, name: { ...draft.name, en: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Name (Arabic)</label>
                <input className={input} dir="rtl" value={draft.name.ar} disabled={busy}
                  onChange={(e) => setDraft({ ...draft, name: { ...draft.name, ar: e.target.value } })} />
              </div>
              <div>
                <label className={label}>Kind of work</label>
                <SelectMenu className={input} value={draft.workType} disabled={!!draft.existing}
                  options={workTypes.map((t) => ({ value: t.key, label: t.name.en }))}
                  onChange={(v) => setDraft({ ...draft, workType: v, step: "", from: "", of: "" })} />
              </div>
              <div>
                <label className={label}>What it measures</label>
                <SelectMenu className={input} value={draft.kind} disabled={!!draft.existing}
                  options={Object.entries(KIND_WORDS).map(([value, l]) => ({ value, label: l }))}
                  onChange={(v) => setDraft({ ...draft, kind: v })} />
              </div>
              {draft.kind === "reach" && (
                <>
                  <div>
                    <label className={label}>The step to reach</label>
                    <SelectMenu className={input} value={draft.step} options={stepOptions} disabled={!!draft.existing}
                      onChange={(v) => setDraft({ ...draft, step: v })} />
                  </div>
                  <div>
                    <label className={label}>Timed from</label>
                    <SelectMenu className={input} value={draft.from} disabled={!!draft.existing}
                      options={[{ value: "", label: "When the work opened" }, ...steps.map((s) => ({ value: s.token, label: s.label }))]}
                      onChange={(v) => setDraft({ ...draft, from: v })} />
                  </div>
                </>
              )}
              {draft.kind === "share" && (
                <div>
                  <label className={label}>Share of</label>
                  <SelectMenu className={input} value={draft.of} options={ofOptions} disabled={!!draft.existing}
                    onChange={(v) => setDraft({ ...draft, of: v })} />
                </div>
              )}
              {!isItem(draft.kind) && (
                <div>
                  <label className={label}>Per</label>
                  <SelectMenu className={input} value={draft.per} disabled={!!draft.existing}
                    options={periods.map((p) => ({ value: p, label: p }))}
                    onChange={(v) => setDraft({ ...draft, per: v })} />
                </div>
              )}
            </div>
            {/* WHAT A MEASURE IS, ONCE SAVED, DOES NOT CHANGE: studios hold
                targets keyed by its id and set for what it measured. Only its
                words and whether it is offered can be edited afterwards. */}
            {draft.existing && <p className={`${muted} mt-4`}>Only the name can change once a measure exists — studios hold targets set for what it measures.</p>}
            <div className="mt-5 flex gap-3">
              <Button disabled={busy || !draft.name.en.trim()}
                onClick={async () => { const { existing: _e, builtIn: _b, ...body } = draft; if (await send("PUT", body)) setDraft(null); }}>Save</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {workTypes.map((t) => {
          const rows = measures.filter((m) => m.workType === t.key);
          if (!rows.length) return null;
          return (
            <div key={t.key} className="mb-6">
              <p className="mb-2 text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">{t.name.en}</p>
              <Table head={["Measure", "Kind", "Detail", "Offered", { label: "", align: "end" }]}>
                {rows.map((m) => (
                  <tr key={m.id} className={m.active ? "" : "opacity-60"}>
                    <td className="font-500">{m.name.en}<div className="text-xs text-[var(--ad-muted-foreground)]" dir="rtl">{m.name.ar}</div></td>
                    <td>{KIND_WORDS[m.kind] || m.kind}</td>
                    <td className="text-[var(--ad-muted-foreground)]">{describe(m) || "—"}</td>
                    <td>{m.active ? "Yes" : "Off"}</td>
                    <td className="text-end">
                      <Button variant="ghost" size="sm" disabled={busy}
                        onClick={() => setDraft({ ...blank, ...m, name: { ...m.name }, existing: true })}>Edit</Button>
                      <Button variant="ghost" size="sm" disabled={busy}
                        onClick={() => { const { builtIn: _b, ...body } = m; send("PUT", { ...body, active: !m.active }); }}>
                        {m.active ? "Switch off" : "Switch on"}
                      </Button>
                      {!m.builtIn && (
                        <Button variant="ghost" size="sm" disabled={busy}
                          onClick={() => send("DELETE", { id: m.id })}>Remove</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
