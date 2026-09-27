import type { CSSProperties, ReactNode } from "react";

/* ==================================================================
   A SECTION OPENS LIKE A FIELD ON A FORM: a ruled line, the label in
   the margin, the heading beside it — the "Re:" of a letter rather than
   an eyebrow stacked over a headline.

   The label is the copy modules' existing `…Eyebrow` string, moved into
   the margin; nothing was rewritten. On a phone the margin folds above.
   One component, because every section on the page opens this way and
   eight hand-written copies of a grid drift apart by a pixel each.

   IN MOTION: the rule draws itself from the reading edge, then the
   label, heading and lead rise into place one after another
   (`data-reveal`, globals.css). The rule is its own element rather than
   a border so it can scale without dragging the text with it.
================================================================== */

export const MARGIN = "lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function SectionHead({ label, title, lead, children }: {
  label: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative">
      <span data-reveal="rule" aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className={`grid gap-3 pt-6 ${MARGIN}`}>
        <p data-reveal="rise" style={delay(120)} className="pt-1.5 text-[13px] text-fg-dim">{label}</p>
        <div className="min-w-0">
          <h2 data-reveal="rise" style={delay(200)} className="max-w-3xl font-display text-[clamp(1.95rem,3.5vw,2.95rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance text-fg rtl:leading-[1.3] rtl:tracking-normal">
            {title}
          </h2>
          {lead ? <p data-reveal="rise" style={delay(320)} className="mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-fg-muted">{lead}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
