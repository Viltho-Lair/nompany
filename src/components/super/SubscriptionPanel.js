"use client";

import { useCallback, useState } from "react";
import { useReload } from "@/components/studio2/useReload";
import { Badge, Button, Num } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";

// ONE STUDIO'S SUBSCRIPTION, inside the studio dialog. What it is, what it may
// do today, and the hand-driven events an admin records until a payment
// provider records them itself: a transfer received, a payment that bounced,
// complimentary on or off, a longer trial, cancel and resume, seats.
//
// EVERY ACTION CARRIES AN EVENT ID MINTED BEFORE IT IS SENT, and a new one only
// after it succeeds. So pressing "Record payment" again after a timeout sends
// the SAME id, and the server applies it once — a retry is never a second
// payment (shared/subscription).

// The owner's ladder (24/09/2026): due at day 0, closed at 20, shut down at 90,
// deleted at 365 (shared/subscription).
export const STATUS = {
  trial: { label: "Standard free", tone: "info" },
  active: { label: "Active", tone: "success" },
  complimentary: { label: "Complimentary", tone: "primary" },
  due: { label: "Payment due", tone: "warning" },
  closed: { label: "Closed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
  shut_down: { label: "Shut down", tone: "danger" },
  expired: { label: "Due for deletion", tone: "danger" },
};

const EVENT_LABEL = {
  paid: "Payment recorded", reversed: "Payment reversed", failed: "Payment failed",
  comp: "Complimentary", "trial-extended": "Trial extended", cancel: "Cancelled",
  resume: "Resumed", "plan-changed": "Plan changed",
};

const REFUSAL = {
  complimentary: "This studio is complimentary. Take that off before recording a payment.",
  "bad-periods": "Periods must be a whole number from 1 to 36.",
  "not-trial": "Only a trial can be extended.",
  "bad-date": "The new end must be a date after the current one.",
};

const newId = () => (globalThis.crypto?.randomUUID?.() || `ev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
const fmtDay = (d) => {
  const t = Date.parse(`${d}T00:00:00Z`);
  return d && Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
};

export default function SubscriptionPanel({ studioId, onChanged, packages = [], tiers = [] }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventId, setEventId] = useState(newId);
  const [form, setForm] = useState({ periods: "1", amount: "", currency: "", reference: "", until: "", seats: "", period: "monthly", reason: "", packageId: "", tierId: "" });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const load = useCallback(async () => {
    const res = await fetch(`/api/super/subscriptions/${studioId}`, { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the subscription."); return; }
    const d = await res.json();
    setData(d);
    setForm((f) => ({ ...f, seats: String(d.subscription.seats || ""), period: d.subscription.period }));
    return d;
  }, [studioId]);
  useReload(load);

  async function send(type, extra = {}) {
    setBusy(true); setError("");
    const res = await fetch(`/api/super/subscriptions/${studioId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, eventId, ...extra }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(REFUSAL[body.error] || "That didn't save."); return; }
    setEventId(newId());
    // The table's row learns the new status from here, not from a page reload.
    const d = await load();
    if (d) onChanged?.({ subStatus: d.status, subKind: d.subscription.kind, paidUntil: d.subscription.paidUntil });
  }

  if (!data) return <p className="text-sm text-[var(--ad-muted-foreground)]">{error || "Loading subscription…"}</p>;

  const s = data.subscription;
  const st = STATUS[data.status] || STATUS.active;
  const muted = "text-xs text-[var(--ad-muted-foreground)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span className={muted}>
          {s.kind === "comp" ? "Given by nompany — never lapses."
            : data.status === "trial" ? `Standard's free period ends ${fmtDay(s.paidUntil)}; the studio closes that day unless a paid package is paid for.`
            : data.status === "active" ? `Paid until ${fmtDay(s.paidUntil)}.`
            : data.status === "due" ? `Due since ${fmtDay(data.dates.dueOn)}. Closes ${fmtDay(data.dates.closesOn)}.`
            : data.status === "closed" || data.status === "cancelled" ? `View and export only since ${fmtDay(data.dates.closesOn)}. Shuts down ${fmtDay(data.dates.shutsDownOn)}.`
            : data.status === "shut_down" ? `Members locked out since ${fmtDay(data.dates.shutsDownOn)}. Deleted ${fmtDay(data.dates.deletedOn)} unless paid.`
            : `Its year is up: deleted by the next run of the deletion job unless paid now.`}
          {data.access !== "full" ? " A payment restores it at once." : ""}
          {s.cancelAt && data.status !== "cancelled" ? ` Cancels on ${fmtDay(s.cancelAt)}.` : ""}
        </span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <div><span className="ad-label">Period</span><p className="capitalize">{s.period}</p></div>
        <div><span className="ad-label">Renews on day</span><Num as="p">{s.anchorDay}</Num></div>
        <div><span className="ad-label">Paid until</span><Num as="p">{fmtDay(s.paidUntil)}</Num></div>
        <div><span className="ad-label">Seats</span><Num as="p">{s.seats || "Package limit"}</Num></div>
      </div>

      {/* A TRANSFER RECEIVED. The only way money moves a date until a provider
          sends it; the reference is what finds the transfer in the bank later. */}
      {s.kind !== "comp" && (
        <fieldset className="rounded-md border p-3" style={{ borderColor: "var(--ad-border)" }}>
          <legend className="px-1 text-xs font-600">Record a payment received</legend>
          <div className="grid gap-2 sm:grid-cols-[5rem,1fr,5rem,1fr]">
            <input className="ad-input" type="number" min="1" max="36" value={form.periods} aria-label="Periods paid" onChange={(e) => set({ periods: e.target.value })} />
            <input className="ad-input" type="number" min="0" step="any" placeholder="Amount" value={form.amount} aria-label="Amount" onChange={(e) => set({ amount: e.target.value })} />
            <input className="ad-input uppercase" maxLength={3} placeholder="JOD" value={form.currency} aria-label="Currency" onChange={(e) => set({ currency: e.target.value })} />
            <input className="ad-input" placeholder="Bank reference" value={form.reference} aria-label="Bank reference" onChange={(e) => set({ reference: e.target.value })} />
          </div>
          {/* THE PACKAGE THE MONEY IS FOR. A paid package applies once it is paid
              (24/09/2026), so this is where a studio moves onto one. Blank keeps
              whatever it is on. */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <SelectMenu className="ad-select" value={form.packageId} aria-label="Paid for package" onChange={(v) => set({ packageId: v })}
              options={[{ value: "", label: "Package: keep current" }, ...packages.map((p) => ({ value: p.id, label: p.name }))]} />
            <SelectMenu className="ad-select" value={form.tierId} aria-label="Paid for tier" onChange={(v) => set({ tierId: v })}
              options={[{ value: "", label: "Tier: keep current" }, ...tiers.map((t) => ({ value: t.id, label: t.name }))]} />
          </div>
          <p className={`mt-1.5 ${muted}`}>
            Periods are {s.period === "yearly" ? "years" : "months"}. Paid on time or within 20 days, the new period runs on from the due date; during Standard&apos;s free period, or once closed or shut down, it starts today.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => send("paid", { periods: Number(form.periods), amount: Number(form.amount) || 0, currency: form.currency, reference: form.reference, packageId: form.packageId, tierId: form.tierId })}>Record payment</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("reversed", { periods: Number(form.periods), reason: form.reference || "Payment returned" })}>It bounced — reverse {form.periods || 1}</Button>
          </div>
        </fieldset>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="ad-label">Seats and billing period</span>
          <div className="flex gap-2">
            <input className="ad-input w-24" type="number" min="0" placeholder="0" value={form.seats} aria-label="Seats" onChange={(e) => set({ seats: e.target.value })} />
            <SelectMenu className="ad-select" value={form.period} aria-label="Billing period" onChange={(v) => set({ period: v })}
              options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} />
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("plan-changed", { seats: Number(form.seats) || 0, period: form.period })}>Save</Button>
          </div>
          <p className={`mt-1 ${muted}`}>Members beyond the seats are refused until the studio upgrades. 0 uses the package&apos;s own limit.</p>
        </div>
        {s.kind === "trial" && (
          <div>
            <span className="ad-label">Extend the trial to</span>
            <div className="flex gap-2">
              <input className="ad-input" type="date" value={form.until} aria-label="Trial ends" onChange={(e) => set({ until: e.target.value })} />
              <Button size="sm" variant="ghost" disabled={busy || !form.until} onClick={() => send("trial-extended", { until: form.until })}>Extend</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("comp", { on: s.kind !== "comp" })}>
          {s.kind === "comp" ? "Remove complimentary (due today)" : "Make complimentary"}
        </Button>
        {s.cancelAt
          ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("resume")}>Resume</Button>
          : <Button size="sm" variant="ghost" disabled={busy} onClick={() => send("cancel")}>Cancel at period end</Button>}
      </div>

      {error && <p className="text-sm text-[var(--ad-destructive-ink)]" role="alert">{error}</p>}

      {/* THE HISTORY, newest first and never edited: why a studio is where it is. */}
      <div>
        <span className="ad-label">History</span>
        {data.history.length === 0 ? (
          <p className={muted}>Nothing recorded yet.</p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
            {data.history.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <Num className={muted}>{new Date(h.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Num>
                <span className="font-500">{EVENT_LABEL[h.type] || h.type}{h.type === "comp" ? (h.detail.on ? " on" : " off") : ""}</span>
                {h.detail.periods ? <span className={muted}>× {h.detail.periods}</span> : null}
                {h.detail.amount ? <Num className={muted}>{h.detail.amount} {h.detail.currency}</Num> : null}
                {h.detail.reference || h.detail.reason ? <span className={muted}>{h.detail.reference || h.detail.reason}</span> : null}
                {h.before.paidUntil !== h.after.paidUntil && <Num className={muted}>{fmtDay(h.before.paidUntil)} → {fmtDay(h.after.paidUntil)}</Num>}
                <span className={muted}>{h.by === "system" ? "system" : "console"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
