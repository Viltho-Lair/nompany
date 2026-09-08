"use client";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SelectMenu } from "@/components/fields/SelectMenu";
import { EASE_OUT_EXPO, SPRING_SNAPPY } from "@/components/landing/lib/motion";
// `options` turns this into a dropdown, and it exists so one is not a second
// control style sitting beside the text fields. Every input on this form goes
// through this component precisely so they line up and share one focus
// treatment; a bare control, or the row of pills that used to be here, is
// something the eye has to learn separately on a form with four other fields.
//
// IT DRAWS `SelectMenu`, NEVER A NATIVE `<select>`, and this shipped wrong once.
// A native one renders its popup with the PLATFORM's colours while `<option>`
// inherits the theme's text colour — near-white ink painted onto the white popup
// the browser still believes it should draw, so the list is a blank rectangle in
// dark mode. Nothing catches it: not a compiler, not a render test, not the
// page in a light theme. `testNoNativeSelectSurvivesInSource` greps for it
// because grep is the only thing that can, and it blocks `npm test` for the
// whole repository when it fires — which it did, for every session, until this
// was changed back.
export function FloatingField({ label, type = "text", value, onChange, status = "idle", error, required, multiline, autoComplete, trailing = null, options = null, }) {
    const id = useId();
    const [focused, setFocused] = useState(false);
    // A SELECT IS NEVER EMPTY once a value is chosen, and its options must not
    // be hidden behind the label — so it floats on focus or on any value, the
    // same rule the text fields follow.
    const floated = focused || value.length > 0;
    const shared = {
        id,
        value,
        required,
        autoComplete,
        "aria-invalid": status === "error",
        "aria-describedby": error ? `${id}-error` : undefined,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onChange: (e) => onChange(e.target.value),
        className: "peer w-full resize-none bg-transparent px-4 pt-6 pb-2.5 pe-12 text-sm text-fg outline-none placeholder:text-transparent",
    };
    return (<div className="w-full">
      <div className={`relative overflow-hidden rounded-xl border bg-ink-soft/70 transition-colors duration-300 ${status === "error"
            ? "border-rose-500/60"
            : focused
                ? "border-iris/70"
                : "border-line hover:border-line/80"}`}>
        {options ? (
          // `onChange` takes the VALUE here, not an event — SelectMenu calls it
          // with the chosen row's value, where the native control handed back a
          // change event. The shared handler's `e.target.value` unwrapping is
          // therefore deliberately bypassed rather than reused.
          <SelectMenu
            id={id}
            value={value}
            onChange={onChange}
            options={options}
            required={required}
            invalid={status === "error"}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${shared.className} flex items-center text-start`}
          />
        ) : multiline ? (<textarea rows={4} {...shared}/>) : (<input type={type} {...shared}/>)}

        {/* Floating label */}
        <motion.label htmlFor={id} className="pointer-events-none absolute start-4 origin-left text-fg-muted rtl:origin-right" animate={{
            y: floated ? -10 : 0,
            scale: floated ? 0.78 : 1,
            color: focused
                ? "var(--color-iris-bright)"
                : "var(--color-fg-muted)",
        }} transition={{ duration: 0.28, ease: EASE_OUT_EXPO }} style={{ top: "1.15rem", fontSize: "0.9rem" }}>
          {label}
        </motion.label>

        {/* Focus underline: scaleX from the left edge */}
        <motion.span aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left" style={{
            background: "linear-gradient(90deg, var(--color-iris), var(--color-cyan))",
        }} initial={false} animate={{ scaleX: focused ? 1 : 0 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}/>

        {trailing && (
          <div className="absolute inset-y-0 end-1 flex items-center">{trailing}</div>
        )}

        {/* Success tick */}
        <AnimatePresence>
          {status === "valid" && (<motion.span className="absolute top-1/2 end-4 -translate-y-1/2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={SPRING_SNAPPY}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" fill="var(--color-mint)" opacity="0.16"/>
                <circle cx="10" cy="10" r="9" stroke="var(--color-mint)" strokeWidth="1.3"/>
                {/* Self-drawing tick (pathLength → stroke-dashoffset) */}
                <motion.path d="M6 10.2l2.6 2.6L14.2 7.2" stroke="var(--color-mint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}/>
              </svg>
            </motion.span>)}
        </AnimatePresence>
      </div>

      {/* Error text */}
      <AnimatePresence initial={false}>
        {error && (<motion.p id={`${id}-error`} initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -4 }} transition={{ duration: 0.24, ease: EASE_OUT_EXPO }} className="overflow-hidden pt-1.5 pl-1 text-xs text-rose-400">
            {error}
          </motion.p>)}
      </AnimatePresence>
    </div>);
}
