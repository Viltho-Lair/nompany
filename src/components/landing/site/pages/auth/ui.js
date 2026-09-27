// THE SIGN-IN SCREENS' CONTROLS, in the public site's dark glass (27/09/2026).
//
// Class strings rather than components, because the forms that use them live in
// `components/public` and own their behaviour down to the last attribute — a
// wrapper component would be a second place a field's `autoComplete` or `id`
// could be dropped. These only say how a thing LOOKS; nothing here imports
// Motion, so a form may import it without crossing the motion fence.
//
// Contrast is measured against the card over the ground (#07070a): ink
// #ececf1, muted #8f8f9c (about 6:1), the accent link #c9c2ff and rose-300 for
// a refusal all clear WCAG AA for body text. `text-white/45` does not, which is
// why no sentence here is set in it.

/** A text input: dark glass, the accent ring on focus, rose when invalid. 16px on
 *  a phone so iOS does not zoom the page when the field takes focus. */
export const FIELD =
  "block h-12 w-full rounded-2xl bg-white/[0.04] px-4 text-[16px] text-[#ececf1] ring-1 ring-inset ring-white/10 " +
  "placeholder:text-white/30 transition-[box-shadow,background-color] duration-200 ease-out " +
  "hover:ring-white/20 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#8b7cff] " +
  "aria-[invalid=true]:ring-rose-400/70 sm:text-[15px]";

/** The label, above its field. */
export const LABEL = "mb-2 block text-[13px] font-medium text-white/75";

/** Help text and quiet lines under a field or at the foot of a form. */
export const HINT = "text-[13px] leading-relaxed text-[#8f8f9c]";

/** A refusal under a field or above the button. */
export const ERROR = "text-[13px] leading-relaxed text-rose-300";

/** A link inside a sentence, in the accent's light tint. */
export const LINK =
  "rounded-sm font-medium text-[#c9c2ff] underline-offset-4 transition-colors duration-200 hover:text-white hover:underline " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]";

/** A quiet text button (resend, cancel, use a different account). */
export const TEXT_BUTTON =
  "rounded-full text-[13px] font-medium text-white/70 transition-colors duration-200 hover:text-white " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] disabled:cursor-not-allowed disabled:opacity-50";

const PILL =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium " +
  "transition-[background-color,transform,opacity] duration-200 ease-out active:scale-[0.97] motion-reduce:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b10] " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/** The one primary act on a step: the home page's light pill. Add `w-full` where it spans. */
export const PRIMARY = `${PILL} bg-[#ececf1] text-[#0b0b10] hover:bg-white`;

/** Everything else a pill: glass, as the home page's ghost call to action. */
export const GHOST =
  `${PILL} bg-white/[0.05] text-[#ececf1] ring-1 ring-inset ring-white/10 backdrop-blur-md ` +
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.09]";

/** A checkbox, tinted with the accent. */
export const CHECKBOX = "size-4 shrink-0 cursor-pointer rounded accent-[#8b7cff]";

/** One box of the six-digit code. */
export const CODE_BOX =
  "h-14 w-full min-w-0 rounded-2xl bg-white/[0.04] text-center text-2xl font-medium tabular-nums text-[#ececf1] " +
  "ring-1 ring-inset ring-white/10 transition-[box-shadow,background-color] duration-200 ease-out " +
  "focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#8b7cff] disabled:opacity-60";

/** A step's heading inside the card (the page's own h1 sits above it). */
export const STEP_TITLE = "text-[19px] font-medium tracking-[-0.02em] text-[#ececf1] rtl:tracking-normal";

/**
 * A step's wrapper. It crossfades in with a short blur whenever it mounts —
 * which is why every step is KEYED by its stage: the same element type at the
 * same position would otherwise be reused and the change would snap. The
 * keyframes live with the frame (site/pages/auth/AuthScene) and stand down
 * under reduced motion.
 */
export const STEP = "auth-step";

/** The tick-or-dot list of password rules. */
export function ruleClass(met, idle = false) {
  return `flex items-center gap-2 text-[12.5px] ${!idle && met ? "text-emerald-300" : "text-[#8f8f9c]"}`;
}
export function ruleDotClass(met) {
  return `inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold ${
    met ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-white/40"
  }`;
}
