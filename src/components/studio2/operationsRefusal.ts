import { fmtDate } from "@/components/studio2/ui";
import type { operationsDict } from "@/shared/studio/operations";

// WHAT A REFUSAL FROM THE ROTA OR THE PERMIT REGISTER SAYS, in the reader's
// language. One function for both screens — the Schedule screen and Quality &
// HSE's Permits — because they write through the same services and meet the
// same tokens; two copies would drift, and the second one already had: the
// Permits screen printed the raw token ("controlled", "forbidden").
//
// THE DICTIONARY COMES IN AS AN ARGUMENT (module scope, see StudioFinance), so
// this carries no dictionary of its own and adds no words to anybody's chunk.
/** What an operations route says when it refuses: the token, and whatever the sentence needs. */
type Refused = { error?: string; startTime?: string; endTime?: string; type?: string; from?: string; to?: string; permits?: number; shifts?: number };

export function operationsRefusal(out: Refused | null | undefined, tr: ReturnType<typeof operationsDict>) {
  const o: Refused = out || {};
  const error = String(o.error || "");
  if (error === "read-only") return tr.mReadOnly;
  if (error === "duplicate") return tr.mDuplicate;
  if (error === "clash") return tr.mClash(o.startTime || "", o.endTime || "");
  if (error === "on-leave") return tr.mOnLeave(String(o.type || "").toLowerCase(), fmtDate(o.from), fmtDate(o.to));
  if (error === "in-use") {
    const bits: string[] = [];
    if (o.permits) bits.push(tr.countPermits(o.permits));
    if (o.shifts) bits.push(tr.countShifts(o.shifts));
    return tr.mInUse(tr.joinAnd(bits));
  }
  if (error === "range") return tr.mRange;
  if (error === "time") return tr.mTime;
  if (error === "person") return tr.mPerson;
  // A MOVE SOMEBODY ELSE BEAT US TO names where the permit really stands, so
  // the reader knows why the button they pressed no longer applies.
  if (error === "transition" && o.from && o.to) return tr.mPermitTransition(o.from, o.to);
  return (Object.hasOwn(tr.refusal, error) && tr.refusal[error]) || tr.mDidntSave;
}
