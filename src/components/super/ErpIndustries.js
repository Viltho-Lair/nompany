"use client";

import { useCallback, useState } from "react";
import { Card, CardHead, CardBody, Table, Button } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";

// THE TRADES THE PRODUCT KNOWS — the console's list, read by every studio.
//
// THE OWNER, 20/09/2026: the industries were hardcoded, so adding one was a
// release. They are rows now, and this is where they are kept. The code's
// twenty-five are the seed underneath: a row edited here replaces one of them,
// a row reverted falls back to it, and a studio that genuinely works a trade
// differently keeps its own copy on top of both.
//
// WHY EACH FIELD IS HERE, in the words a studio reads them by:
//   Trade          the name a studio picks when it says what it does
//   Starts on      which deal flow a new deal in that trade begins on
//   Also common    the OTHER business the same company usually runs — not a
//                  fallback: at creation a studio gets the departments BOTH
//                  flows touch, which is the one place industries and sections
//                  meet today
//   Field of work  the same trade's name in the studio-facing list, character
//                  for character; the join that makes the two one list
//   Why            the reasoning for the pairing, so a later reader can check it

const input = "ad-input";
const label = "ad-label";
const muted = "text-sm text-[var(--ad-muted-foreground)]";

const blank = { key: "", name: "", primary: "", secondary: "", note: "", field: "" };

export default function ErpIndustries() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/erp-industries", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the industries."); return; }
    setData(await res.json());
  }, []);
  useReload(load);

  const send = async (method, body) => {
    setBusy(true); setError("");
    const res = await fetch("/api/super/erp-industries", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // The service answers with the field that was wrong; anything else is
      // shown as it came rather than flattened to "that did not work".
      setError(out.error === "name" ? "A trade needs a name."
        : out.error === "industry-primary" ? "Starts on must name a flow every studio has."
          : out.error || "That did not save.");
      return false;
    }
    if (out.industries) setData((d) => ({ ...d, industries: out.industries }));
    return true;
  };

  if (error && !data) return <p className={muted}>{error}</p>;
  if (!data) return <p className={muted}>Loading…</p>;

  const { industries = [], templates = [], fields = [] } = data;
  const flowName = (id) => templates.find((t) => t.id === id)?.name || (id ? `Flow ${id}` : "—");
  const flowOptions = [{ value: "", label: "— none —" }, ...templates.map((t) => ({ value: t.id, label: t.name }))];
  const fieldOptions = [{ value: "", label: "— none —" }, ...fields.map((f) => ({ value: f, label: f }))];

  return (
    <Card>
      <CardHead
        title="Industries"
        sub="Which deal flow a studio's work starts on, by the trade it belongs to. Every studio reads this list; a studio may still keep its own copy of one trade."
        action={<Button onClick={() => setDraft({ ...blank })} disabled={busy}>Add a trade</Button>}
      />
      <CardBody>
        {error && <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {draft && (
          <div className="mb-6 rounded-xl border border-[var(--ad-border)] p-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label}>Trade</label>
                <input className={input} value={draft.name} disabled={busy}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <label className={label}>Starts on</label>
                <SelectMenu className={input} value={draft.primary} options={flowOptions}
                  onChange={(v) => setDraft({ ...draft, primary: v })} />
              </div>
              <div>
                <label className={label}>Also common</label>
                <SelectMenu className={input} value={draft.secondary} options={flowOptions}
                  onChange={(v) => setDraft({ ...draft, secondary: v })} />
              </div>
              <div>
                <label className={label}>Field of work</label>
                <SelectMenu className={input} value={draft.field} options={fieldOptions}
                  onChange={(v) => setDraft({ ...draft, field: v })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Why</label>
                <input className={input} value={draft.note} disabled={busy}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button disabled={busy || !draft.name.trim()}
                onClick={async () => { if (await send("PUT", draft)) setDraft(null); }}>Save</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <Table head={["Trade", "Starts on", "Also common", "Field of work", { label: "", align: "end" }]}>
          {industries.map((i) => (
            <tr key={i.key}>
              <td>
                <span className="font-500">{i.name}</span>
                {i.note ? <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">{i.note}</p> : null}
              </td>
              <td>{flowName(i.primary)}</td>
              <td>{i.secondary ? flowName(i.secondary) : "—"}</td>
              <td className="text-[var(--ad-muted-foreground)]">{i.field || "—"}</td>
              <td className="text-end">
                <Button variant="ghost" size="sm" disabled={busy}
                  onClick={() => setDraft({ ...blank, ...i })}>Edit</Button>
                {/* REVERT RATHER THAN DELETE. Taking the console's row away
                    restores the built-in underneath it; a studio mid-deal on
                    that trade keeps reading the code's answer, which is the
                    safe direction. A trade the code never had disappears — it
                    only ever existed here. */}
                <Button variant="ghost" size="sm" disabled={busy}
                  onClick={() => send("DELETE", { key: i.key })}>Revert</Button>
              </td>
            </tr>
          ))}
        </Table>
      </CardBody>
    </Card>
  );
}
