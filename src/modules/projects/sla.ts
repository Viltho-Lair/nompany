// Pure date helpers for Projects — the day arithmetic Sales and Tendering
// borrow. Safe on client & server.
//
// THE SERVICE-CONTRACT VISIT MATHS LEFT THIS FILE on 11/09/2026, with the
// screen: an SLA is a preventive maintenance contract, and its schedule is
// modules/maintenance/contracts now, where the visits become work orders. The
// file keeps its name because three modules import `daysUntil` from it.
//
// AND THE SUPPORT WINDOW LEFT IT on 27/09/2026. `supportStatus` counted a
// project's support from its END date and read a nought as 365, while the
// Closing-out tab (./closureModel) counted from HANDOVER and read a nought as
// "no support" — so the list's tag and the project's own tab could disagree
// about the same job. The tag reads `closurePosition` now. Its date formatter
// went with it: it was a `toLocaleDateString("en-GB")` copy of lib/format's
// `fmtDate`, which is the one that follows the studio's locale.

// Whole days from today (midnight) until `date`. Negative = in the past.
export function daysUntil(date: string | number | Date | null | undefined) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
