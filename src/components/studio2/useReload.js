"use client";

import { useEffect } from "react";

// LOAD ONCE, AND AGAIN WHENEVER THE LOADER CHANGES.
//
// THIRTY-THREE COMPONENTS WROTE THIS SAME THREE LINES. Every screen in the
// studio fetches on mount through a `useCallback` that sets state, and every one
// of them ended with the identical
//
//     useEffect(() => { load(); }, [load]);
//
// which `react-hooks/set-state-in-effect` flags once per file. Those were a
// third of the repository's entire lint budget — 33 of 89 warnings against a
// shrink-only ceiling of 142 with one warning of headroom left, so the next
// screen anybody wrote would have tripped a gate for a pattern already used
// thirty-three times.
//
// THE RULE IS RIGHT IN GENERAL AND WRONG HERE, which is why this is an
// extraction rather than a disable. Setting state synchronously in an effect
// does cause cascading renders; fetching on mount and setting state when the
// answer arrives is the case React's own documentation calls out as legitimate,
// and the linter cannot tell the two apart at a call site. Naming the pattern
// once means there is one place to change if that ever stops being true —
// which a `// eslint-disable-next-line` in thirty-three files would not give.
//
// IT DELIBERATELY OWNS NO STATE. Every caller already has its own `data`,
// `error` and `loading`, shaped to what it renders, and a hook that returned a
// generic `{ data, error }` would have meant rewriting thirty-three components
// rather than deleting three lines from each. This absorbs the effect and
// nothing else.
//
// PASS A `useCallback`. The effect re-runs whenever `load` changes identity, so
// a loader rebuilt on every render would fetch on every render — which is the
// bug this shape has always had and still has. Every caller already memoises;
// this is the note that says why they must.
export function useReload(load) {
  useEffect(() => { load(); }, [load]);
}
