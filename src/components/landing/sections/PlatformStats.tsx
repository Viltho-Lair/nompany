import { readPlatformStats, showsFigure, statedFigure } from "@/platform/db/platformStats";
import { statsCopy, withFigure } from "@/shared/marketing/stats";

/* ==================================================================
   WHERE THE PRODUCT STANDS — figures when there are figures, facts
   until then.

   IT NEVER RENDERS NOTHING, which is the difference between this and
   the featured-companies band. A customer wall with no customers is
   dishonest; a "where it stands" section has things to say that are
   true on the day the product launches and true a decade later —
   fifteen departments, free to nine, both languages. Those are the
   default, not a placeholder.

   THREE SLOTS, NOT FOUR, because there are three figures. A fourth
   static line ("166 currencies") was here and said almost exactly what
   the foundation list above already says on the same page — a reader
   meeting the same fact twice in one scroll trusts both of them less.
   A slot exists because a count can eventually fill it.

   A FIGURE REPLACES A FACT, one slot at a time, as each count clears
   its own threshold. Nothing has to be switched on by hand and nothing
   CAN be switched on early: the thresholds are in
   platform/db/platformStats, beside the counting.

   EVERY FIGURE IS ROUNDED DOWN BEFORE IT IS RENDERED. An exact count
   published twice is a growth rate; rounded down, the number is one
   the product can always stand behind, because it is never larger than
   the truth — only older. The note under the row says so, so a reader
   is not left to discover that "40+" is not 40.

   A SERVER COMPONENT, reading the document directly. /api/stats exists
   for callers that are not this process; using it here would put the
   figures in a fetch instead of in the HTML, which is the exact defect
   the pricing page was rebuilt to fix.
================================================================== */

export async function PlatformStats({ locale }: { locale: string }) {
  const tr = statsCopy(locale);
  const stats = await readPlatformStats();

  // Each slot is a figure if the figure is worth stating, otherwise a fact.
  // Paired this way rather than as two lists so a slot cannot end up showing
  // both, or neither, as thresholds move.
  const slots = [
    showsFigure(stats, "studios")
      ? withFigure(tr.figureStudios, statedFigure(stats!.studios))
      : tr.factDepartments,
    showsFigure(stats, "people")
      ? withFigure(tr.figurePeople, statedFigure(stats!.people))
      : tr.factFree,
    showsFigure(stats, "records")
      ? withFigure(tr.figureRecords, statedFigure(stats!.records))
      : tr.factBilingual,
  ];

  const anyFigure =
    showsFigure(stats, "studios") || showsFigure(stats, "people") || showsFigure(stats, "records");

  return (
    <section className="border-t border-line/70 py-14 sm:py-16">
      <h2 className="text-xs tracking-[0.16em] text-fg-dim uppercase">{tr.heading}</h2>
      <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {slots.map((line) => (
          <li key={line} className="flex gap-3 text-fg-muted">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-iris-bright" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {/* The qualification appears only when there is a figure to qualify.
          Explaining that numbers are rounded, on a row with no numbers on it,
          is a sentence about nothing. */}
      {anyFigure ? <p className="mt-8 text-sm text-fg-dim">{tr.note}</p> : null}
    </section>
  );
}
