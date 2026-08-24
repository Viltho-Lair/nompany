"use client";

import { useId, useState } from "react";

// THE ONE FIELD for every studio form (UI/UX overhaul §2.2 / §3.2).
//
// A floating label that lifts on focus or when the field has a value, a hint
// line, and an error line — and NO visible placeholder, which was the studio's
// worst habit (71 of them) and your standing rule to be rid of. The label is
// what the placeholder used to be; the hint carries the example or the caveat.
//
// LIBRARY-FREE ON PURPOSE. The login's FloatingField draws on `motion/react`,
// which the studio's chunk is fenced from — so this floats with a focus flag and
// a CSS transition instead. Same effect, no library, usable anywhere.
//
// IT RENDERS THE PLAIN CONTROLS ITSELF (input, textarea, select) and WRAPS the
// ones it does not own (Combo, the MUI date field) as children — the caller says
// whether a wrapped control is `filled` so the label knows to float. One field,
// every control, one look.
//
// Logical insets throughout (`start-`, `ps-`, an inline-start transform origin),
// so it mirrors in Arabic without a second code path.

const BOX_BASE =
  "relative rounded-xl border bg-[var(--geex-inset)] transition-colors";
const BOX_STATE = (focused, error, disabled) =>
  error
    ? "border-rose-400 dark:border-rose-500/60"
    : focused
      ? "border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-[#191921]"
      : `border-slate-200 dark:border-white/15 ${disabled ? "opacity-60" : ""}`;

// The control sits with room at the top for the floated label: pt-5 pb-1.5.
const CONTROL =
  "peer w-full bg-transparent px-3.5 pt-5 pb-1.5 text-sm text-[var(--geex-ink)] outline-none disabled:cursor-not-allowed";

// Passed to a wrapped Combo so its own border/background fall away and it wears
// this field's box instead — flush with every plain control on the form.
export const BARE_CONTROL =
  "w-full bg-transparent px-3.5 pt-5 pb-1.5 pe-9 text-sm text-[var(--geex-ink)] outline-none";

function labelClass(floated, focused, error) {
  const base =
    "pointer-events-none absolute start-3.5 z-10 origin-[left_center] transition-all duration-200 rtl:origin-[right_center]";
  const place = floated
    ? "top-1.5 text-[11px] font-600 uppercase tracking-wide"
    : "top-1/2 -translate-y-1/2 text-sm";
  const tone = error
    ? "text-rose-500 dark:text-rose-300"
    : focused
      ? "text-brand-600 dark:text-brand-300"
      : "text-slate-500 dark:text-slate-400";
  return `${base} ${place} ${tone}`;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  as,                 // "textarea" | "select" | undefined
  options = [],       // for select: [{value,label}] or string[]
  hint,
  error,
  required = false,
  disabled = false,
  prefix,             // e.g. a currency glyph, rendered at the inline-start
  filled: filledProp, // for wrapped children (Combo/date): does it have a value?
  children,           // a control to wrap (Combo, StudioDate); label floats over it
  min,
  max,
  autoComplete,
  className = "",
  inputProps = {},
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  const wrapping = children != null;
  const hasValue = wrapping ? !!filledProp : String(value ?? "").length > 0;
  // A native date/time input paints its own format chrome (--:--, mm/dd/yyyy)
  // even while empty — exactly like the wrapped MUI date field. Flag it so the
  // resting label doesn't collide with that chrome; globals.css hides the chrome
  // until the label floats clear on focus.
  const nativeTemporal = !wrapping && (type === "time" || type === "date" || type === "datetime-local");
  // A <select> ALWAYS shows something — a chosen option, or a deliberate
  // empty-value one like "Studio" (meaning the studio's own currency). So its
  // label must always float clear of that text, never rest centred over it. A
  // value of "" is a real selection for a select, not an empty field.
  const floated = focused || hasValue || as === "select";
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  // The label text carries the required mark; the visible star stays.
  const lbl = required ? (
    <>
      {label} <span className="text-rose-500">*</span>
    </>
  ) : (
    label
  );

  let control;
  if (wrapping) {
    // The child (a Combo, the date field) is rendered as-is; the box below
    // tracks focus for it and the caller reports its value through `filled`.
    control = children;
  } else if (as === "textarea") {
    control = (
      <textarea
        id={id}
        rows={4}
        className={`${CONTROL} resize-none`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
    );
  } else if (as === "select") {
    control = (
      <select
        id={id}
        className={`${CONTROL} appearance-none pe-9`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      >
        {/* An empty first option so an unset select shows blank — UNLESS the
            caller already supplies its own empty-value option with a real label
            ("Unassigned", "Studio"), in which case doubling it would add a stray
            blank line above it. */}
        {!required && !options.some((o) => (typeof o === "string" ? o : o.value) === "") && <option value="" />}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const t = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    );
  } else {
    control = (
      <input
        id={id}
        type={type}
        className={`${CONTROL} ${prefix ? "ps-9" : ""}`}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
    );
  }

  return (
    <div className={className}>
      <div
        className={`${BOX_BASE} ${BOX_STATE(focused, error, disabled)}`}
        // For wrapped children, focus can land on any element inside; capture it
        // at the box so the label floats for a Combo or the date field too.
        onFocusCapture={wrapping ? () => setFocused(true) : undefined}
        onBlurCapture={wrapping ? () => setFocused(false) : undefined}
        // A control that draws its own resting placeholder — the MUI date field's
        // dd/mm/yyyy, or a native date/time input's --:-- / mm/dd/yyyy — collides
        // with this field's centred label. Flag the empty-and-blurred state (label
        // centred, nothing entered yet) so globals.css can hide that chrome until
        // the label floats clear on focus.
        data-field-empty={(wrapping || nativeTemporal) && !floated ? "" : undefined}
      >
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 start-3 z-10 flex items-center pt-3 text-sm text-slate-400">
            {prefix}
          </span>
        )}
        <label htmlFor={wrapping ? undefined : id} className={labelClass(floated, focused, error)}>
          {lbl}
        </label>
        {as === "select" && (
          // The chevron a native select loses to `appearance-none`.
          <span className="pointer-events-none absolute inset-y-0 end-3 z-10 flex items-center text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        )}
        {control}
      </div>

      {/* The hint line is always rendered so the box does not jump when an error
          replaces it (§3.2). Error takes the slot when present. */}
      {(hint || error) && (
        <p
          id={error ? `${id}-err` : `${id}-hint`}
          className={`mt-1 ps-1 text-[11px] ${
            error ? "text-rose-500 dark:text-rose-300" : "text-[var(--geex-faint)]"
          }`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export default Field;
