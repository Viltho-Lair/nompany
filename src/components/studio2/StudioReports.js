import nextDynamic from "next/dynamic";
import { exportableFor } from "@/modules/reports/datasets";
import { reportsDict } from "@/shared/studio/reports";

// THE BUILDER IS A CLIENT MODULE and this page is a SERVER component, so it
// arrives through `nextDynamic` — which here defers only the server render,
// not the download (HeavyScreens.jsx). It is imported this way so the export
// list, which needs no client state at all, keeps rendering on the server.
const ReportBuilderPanel = nextDynamic(() => import("@/components/studio2/ReportBuilderPanel"));

// REPORTS & BI — the last section that rendered nothing.
//
// A SERVER COMPONENT, and deliberately. Every other panel in the studio fetches
// on mount, which is fine and which is also why `react-hooks/set-state-in-effect`
// accounts for 89 of the repo's 141 lint warnings against a ceiling of 142. This
// screen needs no client state at all: the list is resolved on the server from
// the access already in hand, and an export is a LINK. A download is a
// navigation, not a fetch — making it one would mean holding a whole CSV in
// memory to hand back to an anchor that could have asked for it directly.
//
// WHICH ROWS APPEAR IS THE SECOND GATE. `reports.exports.view` opens this page;
// each data set still asks the right its own section already required, so this
// list is exactly what the reader could already have read on the screens that
// own it. Somebody granted the export right and nothing else sees an empty page,
// which is the truthful answer rather than a refusal.
export default function StudioReports({ slug, access, locale = "en" }) {
  const tr = reportsDict(locale);
  const sets = exportableFor((key) => access.has(key));

  // GROUPED BY SECTION, in catalogue order, so a studio finds its invoice export
  // under Finance rather than in an alphabetised list of eight nouns.
  const groups = [];
  for (const d of sets) {
    const last = groups[groups.length - 1];
    if (last && last.group === d.group) last.rows.push(d);
    else groups.push({ group: d.group, rows: [d] });
  }

  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{tr.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {sets.length === 0 ? (
        // NOT A REFUSAL. This person may open the export surface and holds no
        // section right that has anything behind it; "nothing to export" is the
        // truth, and telling them they are forbidden would be wrong as well as
        // unhelpful.
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tr.nothing}</p>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.group}>
              <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{g.group}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {g.rows.map((d) => (
                  <a
                    key={d.key}
                    href={`/api/studios/${slug}/reports/export?dataset=${encodeURIComponent(d.key)}`}
                    // `download` asks the browser to save rather than navigate;
                    // the Content-Disposition header says the same thing, and
                    // both are here because a proxy that strips one still leaves
                    // the other.
                    download
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-600 text-slate-900 dark:text-white">{d.label}</span>
                      {/* WHAT WILL BE IN THE FILE, said before it is downloaded.
                          The columns are declared, so this is the actual list
                          rather than a promise about it. */}
                      <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">
                        {d.columns.map((c) => c.label).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-400 dark:text-slate-500">CSV</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* THE BUILDER, THE SAVED LIST AND THE TARGETS. Below the exports rather
          than in a tab, because this page is a Server Component and a tab strip
          would make the whole of it client state for one toggle. */}
      <div className="mt-8">
        <ReportBuilderPanel slug={slug} locale={locale} />
      </div>

      {/* WHAT THIS SECTION IS STILL NOT. Scheduling and analytics are unbuilt,
          and a page that quietly offered everything else would read as a
          finished section. The same rule every functionality file's "Not built
          yet" follows. */}
      <p className="mt-8 border-t border-slate-200/70 pt-4 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
        {tr.notYet}
      </p>
    </div>
  );
}
