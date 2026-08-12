"use client";

import { useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

const MSG_TONE = {
  New: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Read: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Replied: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Archived: "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500",
};

const fmtAt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");

// WEBSITE — the studio's public company profile, and the messages it brings in.
// Nothing here is public until Publish is switched on.
export default function StudioWebsite({ slug }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("profile");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/website`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Website in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // A public enquiry can arrive at any moment — show it as it lands.
  useLiveUpdates(slug, "website", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const path = kind ? `/api/studios/${slug}/website/${kind}` : `/api/studios/${slug}/website`;
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "read-only" ? "You have view-only access to Website."
        : out.error === "headline" ? "Add a headline before publishing — an empty page is worse than none."
        : out.error === "title" ? "Give it a title."
        : "That didn't save."
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Website…</p>;

  const { canManage, profile, services, showcase, messages, summary, vocabulary } = data;
  const publicUrl = `/c/${slug}`;

  const tabs = [
    ["profile", "Profile"],
    ["services", `Services (${summary.services})`],
    ["showcase", `Selected work (${summary.showcase})`],
    ["inbox", `Inbox${summary.unread ? ` (${summary.unread})` : ""}`],
  ];

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${summary.published
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
                {summary.published ? "Published" : "Not published"}
              </span>
              <span className="font-mono text-sm text-slate-500 dark:text-slate-400">nompany.com{publicUrl}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {summary.published
                ? "Anyone with the link can see this page."
                : "Only people in this studio can see this. Publishing puts it on the public internet."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.published && (
              <a className={btnGhost} href={publicUrl} target="_blank" rel="noopener noreferrer">View page</a>
            )}
            {canManage && (
              <button className={summary.published ? btnGhost : btn} disabled={busy}
                onClick={() => send("", "PUT", { published: !summary.published })}>
                {summary.published ? "Unpublish" : "Publish"}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {tabs.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>

      {tab === "profile" && <Profile profile={profile} canManage={canManage} busy={busy} send={send} />}
      {tab === "services" && <Services rows={services} canManage={canManage} busy={busy} send={send} />}
      {tab === "showcase" && <Showcase rows={showcase} canManage={canManage} busy={busy} send={send} />}
      {tab === "inbox" && <Inbox rows={messages} statuses={vocabulary.messageStatuses} canManage={canManage} busy={busy} send={send} />}
    </div>
  );
}

// ---- profile ---------------------------------------------------------------
function Profile({ profile, canManage, busy, send }) {
  const [form, setForm] = useState({
    headline: profile?.headline || "", intro: profile?.intro || "", about: profile?.about || "",
    email: profile?.email || "", phone: profile?.phone || "", addressText: profile?.addressText || "",
    mapUrl: profile?.mapUrl || "", website: profile?.website || "", linkedin: profile?.linkedin || "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">Page content</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The headline is the one thing a visitor reads first — and the one field publishing requires.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Headline</label>
          <input className={input} value={form.headline} onChange={set("headline")} disabled={!canManage}
            placeholder="e.g. Electrical contracting across the Kingdom" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Intro</label>
          <textarea rows={2} className={input} value={form.intro} onChange={set("intro")} disabled={!canManage} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>About</label>
          <textarea rows={5} className={input} value={form.about} onChange={set("about")} disabled={!canManage} />
        </div>
        <div>
          <label className={label}>Contact email</label>
          <input className={input} value={form.email} onChange={set("email")} disabled={!canManage} />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input className={input} value={form.phone} onChange={set("phone")} disabled={!canManage} />
        </div>
        <div>
          <label className={label}>Address</label>
          <input className={input} value={form.addressText} onChange={set("addressText")} disabled={!canManage} />
        </div>
        <div>
          <label className={label}>Map link</label>
          <input className={input} value={form.mapUrl} onChange={set("mapUrl")} disabled={!canManage} placeholder="https://…" />
        </div>
        <div>
          <label className={label}>Website</label>
          <input className={input} value={form.website} onChange={set("website")} disabled={!canManage} placeholder="https://…" />
        </div>
        <div>
          <label className={label}>LinkedIn</label>
          <input className={input} value={form.linkedin} onChange={set("linkedin")} disabled={!canManage} placeholder="https://…" />
        </div>
      </div>

      {canManage && (
        <div className="mt-5">
          <button className={btn} disabled={busy} onClick={() => send("", "PUT", form)}>{busy ? "Saving…" : "Save"}</button>
        </div>
      )}
    </section>
  );
}

// ---- services --------------------------------------------------------------
function Services({ rows, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add service</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit service" : "New service"} busy={busy}
          fields={[
            { key: "title", label: "Title", required: true, value: editing?.title || "" },
            { key: "summary", label: "Summary", area: true, value: editing?.summary || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("services", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title="No services listed" body="These appear on your public page under “What we do”." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-600 text-slate-900 dark:text-white">{s.title}</p>
                  {s.summary && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.summary}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(s)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("services", "DELETE", { id: s.id })}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- showcase --------------------------------------------------------------
function Showcase({ rows, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add work</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit work" : "New work"} busy={busy}
          note="Client names are typed here on purpose — nothing is taken from Sales automatically, because naming a client publicly is a decision."
          fields={[
            { key: "title", label: "Title", required: true, value: editing?.title || "" },
            { key: "clientName", label: "Client", value: editing?.clientName || "" },
            { key: "year", label: "Year", value: editing?.year || "" },
            { key: "location", label: "Location", value: editing?.location || "" },
            { key: "summary", label: "Summary", area: true, value: editing?.summary || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("showcase", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title="Nothing shown yet" body="Selected work appears on your public page. Nothing from Projects is published automatically." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-600 text-slate-900 dark:text-white">{p.title}</p>
                    {p.year && <span className="text-xs text-slate-400">{p.year}</span>}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{[p.clientName, p.location].filter(Boolean).join(" · ")}</p>
                  {p.summary && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.summary}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(p)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("showcase", "DELETE", { id: p.id })}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- inbox -----------------------------------------------------------------
function Inbox({ rows, statuses, canManage, busy, send }) {
  if (rows.length === 0) return <Empty title="No messages yet" body="Messages sent through your published page arrive here." />;
  return (
    <section className={panel}>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {rows.map((m) => (
          <li key={m.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${MSG_TONE[m.status]}`}>{m.status}</span>
                  <span className="font-600 text-slate-900 dark:text-white">{m.name}</span>
                  <a className="text-sm text-brand-700 hover:underline dark:text-brand-300" href={`mailto:${m.email}`}>{m.email}</a>
                  {m.phone && <span className="text-sm text-slate-500 dark:text-slate-400">{m.phone}</span>}
                  <span className="text-xs text-slate-400">{fmtAt(m.createdAt)}</span>
                </div>
                {m.subject && <p className="mt-1 font-600 text-slate-700 dark:text-slate-200">{m.subject}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{m.message}</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <select className={`${input} w-auto`} value={m.status} disabled={busy}
                    onChange={(e) => send("messages", "PUT", { id: m.id, status: e.target.value })}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className={btnDanger} disabled={busy} onClick={() => send("messages", "DELETE", { id: m.id })}>Delete</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- shared bits -----------------------------------------------------------
function SimpleForm({ title, note, fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      {note && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{note}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.area
              ? <textarea rows={3} className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              : <input className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}
