"use client";

import Autocomplete from "@mui/material/Autocomplete";


// A real dropdown for the studio's vocabulary fields (industry, city, and any
// other Settings-driven list).
//
// WHY MUI: these were native `<input list>` + `<datalist>`, which is a hint, not
// a control — no chevron, nothing to click open, no styling hooks, and every
// browser renders it differently (Safari shows nothing until you type). Unlike
// the phone field, MUI Core DOES ship the right component here — Autocomplete —
// and it is already a dependency, so it costs nothing to use and brings proper
// keyboard navigation, filtering and ARIA with it.
//
// MUI supplies only the BEHAVIOUR. The input is the studio's own Tailwind field
// so it sits flush with every other control on the form, and the popup is
// painted with the same tokens as the panels around it.
//
// FREE TEXT IS DELIBERATE. The options come from each studio's Settings, so a
// strict select would be empty for a studio that has not filled them in yet —
// and industry is a required field, which would make raising a ticket
// impossible. Typing a value that is not on the list stays allowed, exactly as
// the datalist allowed it.
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pe-9 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white";

export default function Combo({ value, onChange, options = [], placeholder = "", disabled = false, id, inputClassName = INPUT, paperClassName = "" }) {
  return (
    <Autocomplete
      freeSolo
      disabled={disabled}
      options={options}
      // freeSolo means the value IS the text, so one controlled string drives
      // both typing and picking — no second `value` prop to fall out of step.
      inputValue={value || ""}
      onInputChange={(_, next) => onChange(next || "")}
      openOnFocus
      autoHighlight
      handleHomeEndKeys
      selectOnFocus
      clearOnBlur={false}
      // MUI's default filter is a plain substring test, which answers "re" with
      // Healthcare above Real Estate. Rank instead: options starting with what
      // was typed first, then ones with a word starting with it, then matches
      // buried mid-word — which stay reachable rather than being dropped.
      filterOptions={(opts, { inputValue }) => {
        const q = String(inputValue || "").trim().toLowerCase();
        if (!q) return opts;
        const rank = (o) => {
          const s = String(o).toLowerCase();
          if (s.startsWith(q)) return 0;
          if (s.split(/[\s-]+/).some((w) => w.startsWith(q))) return 1;
          if (s.includes(q)) return 2;
          return 3;
        };
        return opts.filter((o) => rank(o) < 3).sort((a, b) => rank(a) - rank(b));
      }}
      slotProps={{
        paper: {
          className: paperClassName || "mt-1 rounded-xl border border-slate-200 bg-white shadow-geex dark:border-white/15 dark:bg-[#20202c]",
        },
        listbox: { className: "max-h-[240px] py-1 text-sm" },
      }}
      renderOption={(props, option) => {
        // MUI supplies the key on props; React wants it passed explicitly.
        const { key, ...rest } = props;
        return (
          <li key={key} {...rest}
            className="cursor-pointer px-3.5 py-2 text-slate-700 aria-selected:bg-brand-500/10 aria-selected:text-brand-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5 dark:aria-selected:text-brand-300">
            {option}
          </li>
        );
      }}
      renderInput={(params) => {
        // MUI v9 hands these over as slotProps.input (the popup ANCHOR, which
        // must go on the wrapper) and slotProps.htmlInput (the field's own
        // props). Earlier majors called them InputProps and inputProps.
        // MUI's own className is dropped: it styles the field for MUI's Input
        // wrapper, which is not what surrounds it here.
        const { ref, onMouseDown } = params.slotProps?.input || {};
        const { className: _muiClass, ...htmlInput } = params.slotProps?.htmlInput || {};
        return (
          <div ref={ref} onMouseDown={onMouseDown} className="relative">
            <input {...htmlInput} id={id} disabled={disabled} placeholder={placeholder} className={inputClassName} />
            {/* The affordance the datalist never had: something that says this
                opens. Not focusable — the input already owns the interaction. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </div>
        );
      }}
    />
  );
}
