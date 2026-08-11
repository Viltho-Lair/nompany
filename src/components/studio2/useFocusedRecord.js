"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Deep-link focus. Arriving at /<slug>/sales?ticket=abc should land you ON that
// ticket, not at the top of a list you then have to search.
//
// Returns the focused id (or "") and a `focusProps(id)` helper that scrolls the
// matching row into view and rings it briefly, so the eye lands in the right
// place without the highlight becoming permanent visual noise.
export function useFocusedRecord(param) {
  const search = useSearchParams();
  const id = search.get(param) || "";
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    setFaded(false);
    if (!id) return;
    const timer = setTimeout(() => setFaded(true), 2600);
    return () => clearTimeout(timer);
  }, [id]);

  const focusProps = (rowId) => {
    if (!rowId || rowId !== id) return {};
    return {
      ref: (el) => { if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); },
      className: faded ? "" : "ring-2 ring-brand-500 ring-offset-2 rounded-geex transition-shadow dark:ring-offset-[#191921]",
    };
  };

  return { focusedId: id, focusProps };
}
