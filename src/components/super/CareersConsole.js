"use client";

import { useReload } from "@/components/studio2/useReload";
import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, CardHead, Empty, Icon, Table } from "@/app/super/_components/ui";
import { APPLICATION_STATUSES, EMPLOYMENT, cleanJob, jobProblem } from "@/shared/careers";

/* CAREERS, WRITTEN FROM THE CONSOLE (27/09/2026).
   ------------------------------------------------------------------
   The public /careers pages read openings nothing wrote until this screen.
   An opening is BILINGUAL — the pages read `<field>_en` / `<field>_ar` and fall
   back to English — so the editor puts the two languages side by side, the
   Arabic column typed right to left.

   Applications arrive through the public apply form. This is the only place
   they are read, and the only door to a candidate's CV. */

const PROBLEM = {
  "title-required": "An open position needs an English title.",
  "description-required": "An open position needs an English description.",
  notfound: "That no longer exists.",
};
const STATUS_TONE = { new: "primary", reviewing: "info", shortlisted: "success", declined: "warning", hired: "success" };
const STATUS_LABEL = { new: "New", reviewing: "Reviewing", shortlisted: "Shortlisted", declined: "Declined", hired: "Hired" };
const FIELD =
  "w-full rounded-lg border border-[var(--ad-border)] bg-[var(--ad-background)] px-3 py-2 text-sm text-[var(--ad-foreground)] outline-none focus:border-[var(--ad-primary)]";
const LABEL = "mb-1.5 block text-xs font-600 text-[var(--ad-muted-foreground)]";
const PILL_ON = "bg-[var(--ad-foreground)] text-[var(--ad-background)]";
const PILL_OFF = "text-[var(--ad-muted-foreground)]";

const blank = () => ({
  title_en: "",
  title_ar: "",
  dept_en: "",
  dept_ar: "",
  location_en: "",
  location_ar: "",
  employment: "full-time",
  descText_en: "",
  descText_ar: "",
  status: "open",
});

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
};

async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `failed-${res.status}`);
  return data;
}

export default function CareersConsole() {
  const [tab, setTab] = useState("openings");
  const [jobs, setJobs] = useState(null);
  const [apps, setApps] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [j, a] = await Promise.all([send("/api/super/careers", "GET"), send("/api/super/careers/applications", "GET")]);
      setJobs(j.jobs || []);
      setApps(a.applications || []);
      setError("");
    } catch (e) {
      setError(String(e.message || e));
      setJobs((cur) => cur || []);
      setApps((cur) => cur || []);
    }
  }, []);
  useReload(load);

  if (editing) {
    const job = editing === "new" ? null : (jobs || []).find((j) => j.id === editing) || null;
    return (
      <JobForm
        key={editing}
        job={job}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setJobs((cur) => [{ ...saved, applications: job?.applications || 0 }, ...(cur || []).filter((j) => j.id !== saved.id)]);
          setEditing(saved.id);
        }}
        onDeleted={(id) => {
          setJobs((cur) => (cur || []).filter((j) => j.id !== id));
          setEditing(null);
        }}
      />
    );
  }

  const fresh = (apps || []).filter((a) => !a.status || a.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-[var(--ad-border)] p-0.5" role="tablist">
        {[
          ["openings", `Openings${jobs ? ` (${jobs.length})` : ""}`],
          ["applications", `Applications${apps ? ` (${apps.length}${fresh ? `, ${fresh} new` : ""})` : ""}`],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-md px-4 py-1.5 text-sm ${tab === key ? PILL_ON : PILL_OFF}`}>
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-[var(--ad-destructive-ink)]">Could not load ({error}).</p> : null}
      {tab === "openings" ? (
        <Openings jobs={jobs} onEdit={setEditing} />
      ) : (
        <Applications
          apps={apps}
          jobs={jobs || []}
          onChange={(row) => setApps((cur) => (cur || []).map((a) => (a.id === row.id ? { ...a, ...row } : a)))}
          onDeleted={(id) => {
            setApps((cur) => (cur || []).filter((a) => a.id !== id));
            setJobs((cur) => cur);
          }}
        />
      )}
    </div>
  );
}

function Openings({ jobs, onEdit }) {
  return (
    <Card>
      <CardHead
        title="Openings"
        sub="Open positions show on nompany.com/careers in English and Arabic. A closed one leaves the site and stops taking applications."
        action={
          <Button onClick={() => onEdit("new")}>
            <Icon name="plus" className="h-4 w-4" /> New opening
          </Button>
        }
      />
      <CardBody full>
        {jobs === null ? (
          <p className="px-6 py-10 text-sm text-[var(--ad-muted-foreground)]">Loading…</p>
        ) : jobs.length === 0 ? (
          <Empty icon="briefcase" title="No openings yet" sub="Add the first position; it shows on the careers page as soon as it is open." action={<Button onClick={() => onEdit("new")}>New opening</Button>} />
        ) : (
          <Table head={["Position", "Department", "Type", "State", "Applications", "Updated", { label: "", align: "end" }]} caption="Job openings">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>
                  <button type="button" onClick={() => onEdit(j.id)} className="text-start font-600 hover:underline">
                    {j.title_en || j.title_ar || "Untitled"}
                  </button>
                  {j.title_ar ? (
                    <span className="block text-xs text-[var(--ad-muted-foreground)]" dir="rtl">
                      {j.title_ar}
                    </span>
                  ) : null}
                </td>
                <td>{j.dept_en || "—"}</td>
                <td>{j.type_en || "—"}</td>
                <td>
                  <Badge tone={j.status === "closed" ? "warning" : "success"}>{j.status === "closed" ? "Closed" : "Open"}</Badge>
                </td>
                <td>{j.applications || 0}</td>
                <td>{fmt(j.updatedAt || j.createdAt)}</td>
                <td className="text-end">
                  {j.status !== "closed" ? (
                    <a href={`/en/careers/${j.id}`} target="_blank" rel="noreferrer" className="text-sm text-[var(--ad-primary)] hover:underline">
                      View
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

function JobForm({ job, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(() => (job ? { ...blank(), ...job } : blank()));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  async function save(status) {
    const body = { ...draft, status };
    const problem = jobProblem(cleanJob(body));
    if (problem) return setMessage({ tone: "error", text: PROBLEM[problem] || problem });
    setBusy(status);
    setMessage(null);
    try {
      const data = await send(job ? `/api/super/careers/${job.id}` : "/api/super/careers", job ? "PUT" : "POST", body);
      setDraft({ ...blank(), ...data.job });
      setMessage({ tone: "ok", text: status === "open" ? "Saved. It shows on the careers page." : "Saved as closed. It is not on the site." });
      onSaved(data.job);
    } catch (e) {
      const code = String(e.message || e);
      setMessage({ tone: "error", text: PROBLEM[code] || `Could not save (${code}).` });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!job) return onClose();
    if (!window.confirm(`Delete "${job.title_en || "this opening"}"? Its applications are kept.`)) return;
    setBusy("delete");
    try {
      await send(`/api/super/careers/${job.id}`, "DELETE");
      onDeleted(job.id);
    } catch (e) {
      setMessage({ tone: "error", text: `Could not delete (${String(e.message || e)}).` });
      setBusy("");
    }
  }

  const pair = (base, label, multiline = false) => (
    <div className="grid gap-3 md:grid-cols-2">
      {["en", "ar"].map((l) => {
        const props = {
          dir: l === "ar" ? "rtl" : "ltr",
          value: draft[`${base}_${l}`] || "",
          onChange: (e) => set({ [`${base}_${l}`]: e.target.value }),
          className: FIELD,
        };
        return (
          <label key={l} className="block">
            <span className={LABEL}>
              {label} · {l === "en" ? "English" : "العربية"}
            </span>
            {multiline ? <textarea rows={10} {...props} /> : <input {...props} />}
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHead
          title={job ? "Edit opening" : "New opening"}
          sub="English is required to open a position; Arabic falls back to English where it is empty."
          action={
            <Button variant="ghost" onClick={onClose}>
              <Icon name="arrowLeft" className="h-4 w-4" /> All openings
            </Button>
          }
        />
        <CardBody className="space-y-5">
          {pair("title", "Position")}
          {pair("dept", "Department")}
          {pair("location", "Location")}
          <div>
            <span className={LABEL}>Type</span>
            <div className="inline-flex flex-wrap rounded-lg border border-[var(--ad-border)] p-0.5" role="group" aria-label="Employment type">
              {Object.entries(EMPLOYMENT).map(([key, l]) => (
                <button key={key} type="button" aria-pressed={draft.employment === key} onClick={() => set({ employment: key })} className={`rounded-md px-4 py-1.5 text-sm ${draft.employment === key ? PILL_ON : PILL_OFF}`}>
                  {l.en}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--ad-muted-foreground)]">
              Description: a blank line starts a new paragraph, lines starting with <code>- </code> become a list, and <code>**bold**</code> is bold.
            </p>
            {pair("descText", "Description", true)}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Publish" sub={job ? `Now: ${job.status === "closed" ? "Closed" : "Open"}` : "Not saved yet"} />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save("open")} disabled={Boolean(busy)}>
              {busy === "open" ? "Saving…" : "Save and open"}
            </Button>
            <Button variant="outline" onClick={() => save("closed")} disabled={Boolean(busy)}>
              {busy === "closed" ? "Saving…" : job && job.status !== "closed" ? "Close position" : "Save closed"}
            </Button>
          </div>
          {message ? (
            <p role="status" className={`text-sm ${message.tone === "error" ? "text-[var(--ad-destructive-ink)]" : "text-[var(--ad-success-ink)]"}`}>
              {message.text}
            </p>
          ) : null}
          {job && job.status !== "closed" ? (
            <a href={`/en/careers/${job.id}`} target="_blank" rel="noreferrer" className="block text-sm text-[var(--ad-primary)] hover:underline">
              View on the site
            </a>
          ) : null}
          {job ? (
            <Button variant="destructive" size="sm" onClick={remove} disabled={Boolean(busy)}>
              {busy === "delete" ? "Deleting…" : "Delete opening"}
            </Button>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function Applications({ apps, jobs, onChange, onDeleted }) {
  const [job, setJob] = useState("all");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const shown = useMemo(() => (apps || []).filter((a) => job === "all" || a.jobId === job), [apps, job]);
  const withApps = jobs.filter((j) => (apps || []).some((a) => a.jobId === j.id));

  async function status(a, s) {
    setBusy(a.id);
    try {
      const data = await send(`/api/super/careers/applications/${a.id}`, "PATCH", { status: s });
      onChange(data.application);
      setError("");
    } catch (e) {
      setError(`Could not update (${String(e.message || e)}).`);
    } finally {
      setBusy("");
    }
  }
  async function remove(a) {
    if (!window.confirm(`Delete ${a.name}'s application and CV? This cannot be undone.`)) return;
    setBusy(a.id);
    try {
      await send(`/api/super/careers/applications/${a.id}`, "DELETE");
      onDeleted(a.id);
      setError("");
    } catch (e) {
      setError(`Could not delete (${String(e.message || e)}).`);
    } finally {
      setBusy("");
    }
  }

  return (
    <Card>
      <CardHead title="Applications" sub="Sent from the apply form on each opening. Each is also emailed to the support address with the CV attached." />
      <CardBody full>
        {withApps.length > 1 ? (
          <div className="flex flex-wrap gap-2 px-6 pt-4" role="group" aria-label="Filter by opening">
            {[{ id: "all", title_en: "All" }, ...withApps].map((j) => (
              <button key={j.id} type="button" aria-pressed={job === j.id} onClick={() => setJob(j.id)} className={`rounded-full border border-[var(--ad-border)] px-3 py-1 text-xs ${job === j.id ? PILL_ON : PILL_OFF}`}>
                {j.title_en}
              </button>
            ))}
          </div>
        ) : null}
        {error ? <p className="px-6 pt-4 text-sm text-[var(--ad-destructive-ink)]">{error}</p> : null}
        {apps === null ? (
          <p className="px-6 py-10 text-sm text-[var(--ad-muted-foreground)]">Loading…</p>
        ) : shown.length === 0 ? (
          <Empty icon="team" title="No applications yet" sub="They appear here as candidates apply on the careers page." />
        ) : (
          <Table head={["Candidate", "Position", "Received", "Status", { label: "", align: "end" }]} caption="Applications">
            {shown.map((a) => (
              <FragmentRows key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} busy={busy === a.id} onStatus={(s) => status(a, s)} onRemove={() => remove(a)} />
            ))}
          </Table>
        )}
      </CardBody>
    </Card>
  );
}

function FragmentRows({ a, open, onToggle, busy, onStatus, onRemove }) {
  const s = a.status || "new";
  return (
    <>
      <tr>
        <td>
          <button type="button" onClick={onToggle} className="text-start font-600 hover:underline" aria-expanded={open}>
            {a.name}
          </button>
          <span className="block text-xs text-[var(--ad-muted-foreground)]">{a.email}</span>
        </td>
        <td>{a.jobTitle || a.jobId}</td>
        <td>
          {fmt(a.createdAt)}
          {a.notified === false ? (
            <span className="ms-2">
              <Badge tone="warning">Email not sent</Badge>
            </span>
          ) : null}
        </td>
        <td>
          <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>
        </td>
        <td className="text-end">
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {open ? "Hide" : "Open"}
          </Button>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={5}>
            <div className="grid gap-4 py-2 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-2 text-sm">
                <p>
                  <a href={`mailto:${a.email}`} className="text-[var(--ad-primary)] hover:underline">
                    {a.email}
                  </a>
                  {a.phone ? <span className="ms-3">{a.phone}</span> : null}
                  {a.linkedin && /^https?:\/\//i.test(a.linkedin) ? (
                    <a href={a.linkedin} target="_blank" rel="noopener noreferrer" className="ms-3 text-[var(--ad-primary)] hover:underline">
                      LinkedIn
                    </a>
                  ) : null}
                </p>
                <p className="whitespace-pre-wrap text-[var(--ad-muted-foreground)]">{a.message || "No message."}</p>
                {a.cvMediaId ? (
                  <a href={`/api/super/careers/applications/${a.id}/cv`} className="inline-flex items-center gap-1.5 text-[var(--ad-primary)] hover:underline">
                    <Icon name="download" className="h-4 w-4" /> Download CV{a.cvFilename ? ` (${a.cvFilename})` : ""}
                  </a>
                ) : null}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
                  {APPLICATION_STATUSES.map((st) => (
                    <button key={st} type="button" disabled={busy} aria-pressed={s === st} onClick={() => onStatus(st)} className={`rounded-full border border-[var(--ad-border)] px-3 py-1 text-xs ${s === st ? PILL_ON : PILL_OFF}`}>
                      {STATUS_LABEL[st]}
                    </button>
                  ))}
                </div>
                <Button variant="destructive" size="sm" onClick={onRemove} disabled={busy}>
                  Delete application
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
