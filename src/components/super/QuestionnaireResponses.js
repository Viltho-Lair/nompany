"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// WHAT PEOPLE SAID — the screen a questionnaire exists for, and the one this
// product did not have. The answers were posted, dropped by a whitelist and
// never filed anywhere a second person could read them, so the list's Responses
// column showed "-" for every form forever.
//
// TWO VIEWS OF ONE THING, and they answer different questions. The SUMMARY is
// per question: how many said each thing, commonest first — the shape of the
// replies. The TABLE is per person: one row, in order, for when the question is
// "who said that" rather than "how many". Everything beyond either is the CSV,
// because a screen cannot anticipate the third question and a spreadsheet does
// not have to.
//
// It fills its container rather than the viewport: the console gives this route
// the full remaining height and no padding (it is inside the questionnaires
// prefix in FULL_BLEED), so a viewport-tall screen would push its own footer
// off the bottom and scroll the chrome with it — the same trap the builder
// beside it documents.

const card = "rounded-xl border border-[var(--ad-border)] bg-[var(--ad-card)]";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-600 transition-colors";
const ghost = `${btn} text-[var(--ad-foreground)] hover:bg-[var(--ad-muted)]`;
const dark = `${btn} bg-[var(--ad-foreground)] text-white hover:bg-[rgb(var(--ad-foreground-rgb)/0.75)]`;

const fmt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
};

export default function QuestionnaireResponses({ id }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState("summary");

  useEffect(() => {
    let alive = true;
    fetch(`/api/super/questionnaires/${id}/responses`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!alive) return; if (d) setData(d); else setFailed(true); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [id]);

  if (failed) {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-[var(--ad-muted)] p-6 text-sm text-[var(--ad-destructive)]">
        Couldn&apos;t load the responses.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-full w-full items-center justify-center bg-[var(--ad-muted)] text-sm text-[var(--ad-muted-foreground)]">
        Loading…
      </div>
    );
  }

  const { questionnaire: q, summary, responses, shown } = data;
  // Live questions first, in the author's order, then anything only older
  // responses carry — same spine as the summary, so the two views cannot
  // disagree about which columns exist.
  const columns = summary.fields;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--ad-muted)] text-[var(--ad-foreground)]">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--ad-border)] bg-[var(--ad-card)] px-5 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-700">{q.name}</h1>
          <p className="text-xs text-[var(--ad-muted-foreground)]">
            {summary.total === 0 ? "No responses yet" : `${summary.total} ${summary.total === 1 ? "response" : "responses"}`}
            {q.route ? <> · <span className="font-mono">{q.route}</span></> : " · unattached"}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[var(--ad-muted)] p-0.5">
          {["summary", "responses"].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-sm font-600 capitalize transition-colors ${
                view === v ? "bg-[var(--ad-card)] text-[var(--ad-foreground)]" : "text-[var(--ad-muted-foreground)]"}`}>
              {v}
            </button>
          ))}
        </div>

        <Link href={`/super/questionnaires/${id}`} className={ghost}>Edit form</Link>
        {/* A plain link, not a fetch: the browser already knows how to save a
            file the server marks as an attachment, and building a blob here
            would put every response through memory to do it worse. */}
        <a href={`/api/super/questionnaires/${id}/responses?format=csv`} className={dark} download>
          Export CSV
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {summary.total === 0 ? (
          <div className={`${card} p-10 text-center`}>
            <p className="font-600">Nobody has answered this yet.</p>
            <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">
              {q.route
                ? "Answers appear here as they arrive."
                : "This form is not attached to a route, so nothing can reach it."}
            </p>
          </div>
        ) : view === "summary" ? (
          <div className="mx-auto max-w-4xl space-y-4">
            {columns.map((f) => <FieldBlock key={f.field} f={f} total={summary.total} />)}
          </div>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--ad-border)] text-start text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">
                  <th className="px-4 py-2.5 text-start">Answered</th>
                  <th className="px-3 py-2.5 text-start">Who</th>
                  {columns.map((f) => (
                    <th key={f.field} className="px-3 py-2.5 text-start font-700">
                      {f.label}
                      {f.retired && <span className="ms-1 font-500 normal-case text-[var(--ad-muted-foreground)]">(retired)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--ad-border)] last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[var(--ad-muted-foreground)]">
                      {fmt(r.updatedAt || r.createdAt)}
                      {/* The form has been edited since this was answered, so
                          the columns above it are not quite the questions that
                          were put. Said out loud rather than left to be noticed. */}
                      {r.stale && <span className="ms-1.5 text-[var(--ad-muted-foreground)]" title="The form has changed since this was answered">·&nbsp;older form</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--ad-muted-foreground)]">{r.email || "—"}</td>
                    {columns.map((f) => {
                      const v = r.answers?.[f.field];
                      const text = Array.isArray(v) ? v.join(", ") : v === undefined || v === "" ? "" : String(v);
                      return (
                        <td key={f.field} className="px-3 py-2.5">
                          {/* An empty cell is "not answered", and a dash says so
                              — a blank reads as a rendering fault. */}
                          {text || <span className="text-[var(--ad-muted-foreground)]">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown < summary.total && (
              <p className="border-t border-[var(--ad-border)] px-4 py-2.5 text-xs text-[var(--ad-muted-foreground)]">
                Showing the {shown} most recent of {summary.total}. Export the CSV for all of them.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- one question, counted ---------------------------------------------------
function FieldBlock({ f, total }) {
  const top = f.tallies[0]?.count || 1;
  return (
    <div className={`${card} p-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-600">
          {f.label}
          {f.retired && (
            <span className="ms-2 rounded-full bg-[var(--ad-muted)] px-2 py-0.5 text-[11px] font-600 text-[var(--ad-muted-foreground)]">
              no longer asked
            </span>
          )}
        </h2>
        <p className="text-xs text-[var(--ad-muted-foreground)]">
          {/* ANSWERED AND SKIPPED, not a percentage of responses. With branching
              a question may not have been PUT to most people, and "12%" reads as
              indifference when it means they were never asked. */}
          {f.answered} answered · {f.skipped} not
        </p>
      </div>

      {f.tallies.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {f.tallies.map((t) => (
            <li key={t.value} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <span className="block truncate text-sm">{t.label}</span>
                {/* Bar width is relative to the COMMONEST answer, not to the
                    total: on a question where everything scored under a tenth,
                    bars against the total are all invisible and the chart says
                    nothing. The numbers beside them are absolute. */}
                <span className="mt-1 block h-1.5 rounded-full bg-[var(--ad-muted)]">
                  <span className="block h-full rounded-full bg-[rgb(var(--ad-foreground-rgb)/0.55)]"
                    style={{ width: `${Math.max(3, Math.round((t.count / top) * 100))}%` }} />
                </span>
              </div>
              <span className="text-sm tabular-nums text-[var(--ad-muted-foreground)]">
                {t.count}
                <span className="ms-1.5 text-xs">{total ? `${Math.round((t.count / total) * 100)}%` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {f.texts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {f.texts.slice(0, 50).map((t, i) => (
            <li key={i} className="rounded-lg bg-[var(--ad-muted)] px-3 py-2 text-sm">{t}</li>
          ))}
          {f.texts.length > 50 && (
            <li className="text-xs text-[var(--ad-muted-foreground)]">
              …and {f.texts.length - 50} more. Export the CSV for all of them.
            </li>
          )}
        </ul>
      )}

      {f.tallies.length === 0 && f.texts.length === 0 && (
        <p className="mt-3 text-sm text-[var(--ad-muted-foreground)]">Nobody has answered this one.</p>
      )}
    </div>
  );
}
