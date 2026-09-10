"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/studio2/icons";

/* A STUDIO SETTINGS SECTION THAT OPENS ON DEMAND — the owner's instruction,
   10/09/2026: every section folded by default, so Studio settings reads as a
   list of headings to pick from rather than one long scroll through all of
   them.

   A NATIVE <details>, not a hand-rolled toggle: the keyboard, the
   expanded/collapsed announcement and the click target come with the element,
   and nothing about them can drift. It also keeps its content MOUNTED while
   closed, which matters here — Service actions and the deal flows each load
   their own data, and a fold that unmounted them would refetch on every open
   and throw away a half-typed edit on every close.

   THE HEADING AND ITS ONE-LINE LEAD STAY VISIBLE when closed, because a bare
   heading ("Legal information") does not say what is behind it and the lead
   does. Every child of <summary> is heading or phrasing content, which is all
   the element allows — laid out with a grid rather than wrapper blocks.

   `attention` OPENS IT when something inside has to be read: an error banner
   in a closed section is an error nobody sees. It opens and never closes — the
   reader decides that. */
export default function SettingsFold({
  heading,
  lead,
  tone = "default",
  defaultOpen = false,
  attention = false,
  children,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (attention && ref.current) ref.current.open = true;
  }, [attention]);
  const danger = tone === "danger";
  return (
    <details
      ref={ref}
      open={defaultOpen || undefined}
      className={`group mt-8 rounded-geex border p-5 ${danger ? "border-rose-200 dark:border-rose-500/30" : "border-slate-200/70 dark:border-white/10"}`}
    >
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 [&::-webkit-details-marker]:hidden">
        <h3 className={`font-display text-base font-700 ${danger ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
          {heading}
        </h3>
        <Icon name="chevronDown" className="row-span-2 mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500" />
        {lead ? <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{lead}</span> : null}
      </summary>
      {children}
    </details>
  );
}
