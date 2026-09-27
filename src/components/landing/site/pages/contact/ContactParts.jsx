"use client";
import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import SelectMenu from "@/components/fields/SelectMenu";
import { EASE } from "@/components/landing/site/primitives";

/* THE CONTACT FORM'S CONTROLS IN THE SITE'S OWN LOOK.
   ------------------------------------------------------------------
   NOT `FloatingField`. That one is shared with the login screen, which is still
   in the account design, so restyling it would restyle the sign-in page from
   here. These are the site's: the label ABOVE the control rather than floating
   inside it (a label that moves is a label a person has to find again), the
   error BELOW it and tied to it by `aria-describedby`, and one accent focus
   ring on every control.

   THE TOPIC IS STILL `SelectMenu`, never a native <select>: the browser paints
   a native popup in the platform's colours, and on this dark page that is light
   ink on a white list. `testNoNativeSelectSurvivesInSource` holds the line. */

const BOX =
  "w-full rounded-2xl bg-white/[0.04] px-4 text-[15px] text-[#ececf1] ring-1 ring-inset transition-[box-shadow,background-color] duration-200 ease-out placeholder:text-white/30 hover:bg-white/[0.06] focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[#8b7cff]";

// The open panel is portalled to <body>, out of the page, so it is handed the
// site's colours as token values rather than inheriting the product's.
const PANEL =
  "!rounded-2xl [--menu-surface:#111117] [--menu-inset:#16161d] [--menu-ink:#ececf1] [--menu-muted:#8f8f9c] [--menu-line:rgba(255,255,255,0.1)] [--menu-hover:rgba(255,255,255,0.06)] [--menu-chosen:rgba(139,124,255,0.16)] [--menu-chosen-strong:rgba(139,124,255,0.24)] [--menu-chosen-ink:#c9c2ff]";

/**
 * One labelled control. `status` is the form's own verdict — "error", "valid"
 * or "idle" — and "valid" earns a small accent tick beside the label, the same
 * signal the old field drew inside itself.
 */
export function SiteField({ label, type = "text", value, onChange, status = "idle", error, multiline, autoComplete, options = null }) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = status === "error";
  const ring = invalid ? "ring-rose-400/60" : "ring-white/10";
  const described = error ? errorId : undefined;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-white/70">
          {label}
        </label>
        <AnimatePresence initial={false}>
          {status === "valid" ? (
            <motion.span
              key="ok"
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="grid size-4 place-items-center rounded-full bg-[#8b7cff]/20 text-[#c9c2ff]"
            >
              <Check size={10} strokeWidth={3} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {options ? (
        // `onChange` takes the VALUE here — SelectMenu calls it with the chosen
        // row's value, not with an event.
        <SelectMenu
          id={id}
          value={value}
          onChange={onChange}
          options={options}
          invalid={invalid}
          aria-describedby={described}
          menuClassName={PANEL}
          className={`${BOX} ${ring} h-12 [--menu-muted:rgba(255,255,255,0.45)]`}
        />
      ) : multiline ? (
        <textarea
          id={id}
          rows={5}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
          className={`${BOX} ${ring} block resize-y py-3 leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
          className={`${BOX} ${ring} h-12`}
        />
      )}

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="err"
            id={errorId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden pt-2 text-[13px] text-rose-300"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * The site's primary pill as a real submit button. Presses in under a finger or
 * a click; while the form is sending it is disabled and says so.
 */
export function SubmitButton({ disabled, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      aria-busy={disabled || undefined}
      whileTap={disabled || reduce ? undefined : { scale: 0.97 }}
      className="group relative inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#ececf1] px-7 text-[15px] font-medium text-[#0b0b10] transition-colors duration-200 ease-out hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070a] disabled:cursor-progress disabled:bg-[#ececf1]/70"
    >
      {disabled ? (
        <motion.span
          aria-hidden="true"
          className="size-3.5 rounded-full border-2 border-[#0b0b10]/25 border-t-[#0b0b10]"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
        />
      ) : null}
      {children}
    </motion.button>
  );
}
