"use client";

import { useCallback, useState } from "react";
import { useReload } from "@/components/studio2/useReload";
import SelectMenu from "@/components/fields/SelectMenu";

// THE SANDBOX CLOCK'S CONTROL — rehearse the unpaid ladder on a test studio:
// move it to "closed", "shut down" or "due for deletion" and open the studio to
// see what its people would see, or preview the warning email.
//
// IT DRAWS NOTHING UNLESS THE ROUTE ANSWERS, and the route answers 404 outside
// the sandbox (lib/sandbox) — so on the live site this component asks once,
// is told there is no such door, and renders nothing. Developer tooling, so its
// words are not translated.

const STEPS = [
  { value: "reset", label: "Complimentary (reset)" },
  { value: "-5", label: "Paid, 5 days left" },
  { value: "0", label: "Payment due (day 0)" },
  { value: "20", label: "Closed (day 20)" },
  { value: "83", label: "Closed, 7 days to shut-down (day 83)" },
  { value: "90", label: "Shut down (day 90)" },
  { value: "358", label: "Shut down, 7 days to deletion (day 358)" },
  { value: "365", label: "Due for deletion (day 365)" },
  { value: "free-ended", label: "Standard's free period just ended" },
];

export default function SandboxClock({ slug }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/studios/${slug}/sandbox-clock`;

  const load = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" }).catch(() => null);
    setState(res?.ok ? await res.json() : null);
  }, [url]);
  useReload(load);

  if (!state?.sandbox) return null;

  async function move(to) {
    setBusy(true);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }) });
    setBusy(false);
    if (res.ok) setState(await res.json());
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
      <span className="font-700">Sandbox clock</span> — now <b>{state.status}</b>
      {state.dates ? ` · closes ${state.dates.closesOn} · shuts down ${state.dates.shutsDownOn} · deleted ${state.dates.deletedOn}` : ""}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="min-w-[16rem]">
          <SelectMenu aria-label="Move the sandbox clock" value="" disabled={busy}
            onChange={(v) => v && move(v)}
            options={[{ value: "", label: "Move to…" }, ...STEPS]} />
        </div>
        <a className="underline" href={`${url}?preview=shut-down`} target="_blank" rel="noreferrer">Preview shut-down email</a>
        <a className="underline" href={`${url}?preview=deletion`} target="_blank" rel="noreferrer">Preview deletion email</a>
        <a className="underline" href={`/${slug}`}>Open the studio</a>
      </div>
    </div>
  );
}
