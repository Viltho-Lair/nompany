"use client";

import { useCallback, useState } from "react";
import { Card, CardHead, CardBody, Table, Button } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";

// WHAT A DEAL IS MEASURED ON — declared here, copied by every deal that names
// the action.
//
// THE LIST STARTS EMPTY AND THAT IS DELIBERATE. Shipping twenty plausible
// targets would be twenty numbers this product invented, presented to studios
// as their own — so the owner declares them, and a studio with none is told
// plainly that nothing is being measured rather than shown a made-up score.
//
// WHY EACH FIELD IS HERE, in the words the screen reads them by:
//   Measures     the service action this applies to — "every deal" covers the
//                work nobody raised a ticket for
//   What         the sentence a person reads on the deal
//   Kind         done-or-not (a milestone) or how-many (a quantity). A
//                milestone has no percentage: there is no half-signed contract
//   Counted on   the stage the evidence lives in; nothing is keyed in by hand
//   Within       days from the moment the work starts. Blank means no clock,
//                so the target is never late

const input = "ad-input";
const label = "ad-label";
const muted = "text-sm text-[var(--ad-muted-foreground)]";

const blank = { id: "", action: "", label: "", kind: "milestone", stage: "", days: 0, target: 1 };

export default function ErpKpis() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/erp-kpis", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the KPIs."); return; }
    setData(await res.json());
  }, []);
  useReload(load);

  const send = async (method, body) => {
    setBusy(true); setError("");
    const res = await fetch("/api/super/erp-kpis", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(out.error === "label" ? "A KPI needs the sentence a person reads."
        : String(out.error || "That did not save.").replace(/^kpi-refused: /, ""));
      return false;
    }
    if (out.kpis) setData((d) => ({ ...d, kpis: out.kpis }));
    return true;
  };

  if (error && !data) return <p className={muted}>{error}</p>;
  if (!data) return <p className={muted}>Loading…</p>;

  const { kpis = [], stages = [], actions = [] } = data;
  const stageName = (type) => stages.find((s) => s.type === type)?.label || type || "—";
  const stageOptions = [{ value: "", label: "— choose —" }, ...stages.map((s) => ({ value: s.type, label: s.label }))];
  const actionOptions = [{ value: "", label: "Every deal" }, ...actions.map((a) => ({ value: a, label: a }))];
  const kindOptions = [
    { value: "milestone", label: "Milestone — done or not done" },
    { value: "quantity", label: "Quantity — how many" },
  ];

  return (
    <Card>
      <CardHead
        title="KPIs"
        sub="What the work behind a service action is expected to achieve. A deal copies these when it opens; editing one never re-judges work already under way."
        action={<Button onClick={() => setDraft({ ...blank })} disabled={busy}>Add a KPI</Button>}
      />
      <CardBody>
        {error && <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {draft && (
          <div className="mb-6 rounded-xl border border-[var(--ad-border)] p-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>What</label>
                <input className={input} value={draft.label} disabled={busy}
                  placeholder="The site survey is done"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
              </div>
              <div>
                <label className={label}>Measures</label>
                <SelectMenu className={input} value={draft.action} options={actionOptions}
                  onChange={(v) => setDraft({ ...draft, action: v })} />
              </div>
              <div>
                <label className={label}>Kind</label>
                <SelectMenu className={input} value={draft.kind} options={kindOptions}
                  onChange={(v) => setDraft({ ...draft, kind: v })} />
              </div>
              <div>
                <label className={label}>Counted on</label>
                <SelectMenu className={input} value={draft.stage} options={stageOptions}
                  onChange={(v) => setDraft({ ...draft, stage: v })} />
              </div>
              <div>
                <label className={label}>Within (days, blank for no clock)</label>
                <input className={input} type="number" min="0" value={draft.days} disabled={busy}
                  onChange={(e) => setDraft({ ...draft, days: e.target.value })} />
              </div>
              {draft.kind === "quantity" && (
                <div>
                  <label className={label}>How many</label>
                  <input className={input} type="number" min="1" value={draft.target} disabled={busy}
                    onChange={(e) => setDraft({ ...draft, target: e.target.value })} />
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <Button disabled={busy || !draft.label.trim() || !draft.stage}
                onClick={async () => { if (await send("PUT", draft)) setDraft(null); }}>Save</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {kpis.length === 0 && !draft && (
          <p className={muted}>Nothing is being measured yet. A deal with no KPIs says so on its own screen.</p>
        )}

        {kpis.length > 0 && (
          <Table head={["What", "Measures", "Kind", "Counted on", "Within", { label: "", align: "end" }]}>
            {kpis.map((k) => (
              <tr key={k.id}>
                <td className="font-500">{k.label}</td>
                <td className="text-[var(--ad-muted-foreground)]">{k.action || "Every deal"}</td>
                <td>{k.kind === "quantity" ? `${k.target} × ` : ""}{k.kind === "quantity" ? "quantity" : "milestone"}</td>
                <td>{stageName(k.stage)}</td>
                <td>{k.days ? `${k.days} days` : "—"}</td>
                <td className="text-end">
                  <Button variant="ghost" size="sm" disabled={busy}
                    onClick={() => setDraft({ ...blank, ...k })}>Edit</Button>
                  {/* WITHDRAWN, NOT UNDONE. Deals already carrying this KPI keep
                      measuring it — they hold a copy — so what stops here is new
                      deals taking it on. */}
                  <Button variant="ghost" size="sm" disabled={busy}
                    onClick={() => send("DELETE", { id: k.id })}>Withdraw</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
