import { fmtDate } from "@/components/studio2/ui";

// WHAT A REFUSAL FROM THE ROTA OR THE PERMIT REGISTER SAYS, in the reader's
// language. One function for both screens — the Schedule screen and Quality &
// HSE's Permits — because they write through the same services and meet the
// same tokens; two copies would drift, and the second one already had: the
// Permits screen printed the raw token ("controlled", "forbidden").
//
// THE DICTIONARY COMES IN AS AN ARGUMENT (module scope, see StudioFinance), so
// this carries no dictionary of its own and adds no words to anybody's chunk.
export function operationsRefusal(out, tr) {
  const error = String(out?.error || "");
  if (error === "read-only") return tr.mReadOnly;
  if (error === "duplicate") return tr.mDuplicate;
  if (error === "clash") return tr.mClash(out.startTime, out.endTime);
  if (error === "on-leave") return tr.mOnLeave(String(out.type || "").toLowerCase(), fmtDate(out.from), fmtDate(out.to));
  if (error === "in-use") {
    const bits = [];
    if (out.permits) bits.push(tr.countPermits(out.permits));
    if (out.shifts) bits.push(tr.countShifts(out.shifts));
    return tr.mInUse(tr.joinAnd(bits));
  }
  if (error === "range") return tr.mRange;
  if (error === "time") return tr.mTime;
  if (error === "person") return tr.mPerson;
  // A MOVE SOMEBODY ELSE BEAT US TO names where the permit really stands, so
  // the reader knows why the button they pressed no longer applies.
  if (error === "transition" && out.from && out.to) return tr.mPermitTransition(out.from, out.to);
  return (Object.hasOwn(tr.refusal, error) && tr.refusal[error]) || tr.mDidntSave;
}
