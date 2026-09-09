"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/app/super/_components/ui";

/* THE DAILY GREETING, edited platform-wide.
   ------------------------------------------------------------------
   TWO MODES AND NOT A TOGGLE PER FIELD. `default` rotates a built-in set of
   greetings and quotations; `custom` shows exactly what is typed. A studio
   reads one or the other, never a mixture — a half-custom message where the
   greeting was written here and the quotation came from the rotation is a
   pairing nobody chose and nobody can predict.

   THE PREVIEW IS THE SERVER'S ANSWER, not this screen's guess. It comes back
   from the same `resolveGreeting` a studio calls, so what is shown here is
   literally what is being read right now — including on `default`, where the
   message depends on the date and this screen has no business computing it. */
export default function GreetingEditor() {
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/super/greeting", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setConfig(d.config); setPreview(d.preview); } else setError("Couldn't load the greeting."); })
      .catch(() => setError("Couldn't load the greeting."));
  }, []);

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    const res = await fetch("/api/super/greeting", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    setBusy(false);
    if (!res.ok) { setError("Couldn't save."); return; }
    const d = await res.json();
    setConfig(d.config); setPreview(d.preview); setSaved(true);
  }

  if (!config) {
    return <Card><CardBody><p className="text-sm text-[var(--ad-muted-foreground)]">{error || "Loading…"}</p></CardBody></Card>;
  }

  const custom = config.mode === "custom";
  const field = "w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm";

  return (
    <>
      <Card className="mb-6">
        <CardBody>
          <p className="text-sm text-[var(--ad-muted-foreground)]">
            One message across the top of every studio, changing at midnight, server time.
            A reader can close it and it stays closed for that day only. There is no
            schedule behind it — the message is derived from the date, so it turns over on
            its own and there is nothing that can fail to run.
          </p>
        </CardBody>
      </Card>

      {error && <p className="mb-4 text-sm text-[var(--ad-destructive)]">{error}</p>}

      <Card className="mb-6">
        <CardBody>
          <h3 className="font-600">What studios see</h3>

          <div className="mt-4 flex flex-wrap gap-4">
            {[
              { id: "default", label: "Built-in rotation", hint: "Seven greetings against eight quotations — a pair does not repeat for eight weeks." },
              { id: "custom", label: "Custom message", hint: "Exactly what you type below, every day, until you change it." },
            ].map((m) => (
              <label key={m.id} className="flex max-w-sm cursor-pointer items-start gap-2.5">
                <input
                  type="radio" name="greeting-mode" checked={config.mode === m.id}
                  onChange={() => { setConfig({ ...config, mode: m.id }); setSaved(false); }}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-500">{m.label}</span>
                  <span className="block text-xs text-[var(--ad-muted-foreground)]">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {/* THE CUSTOM FIELDS STAY VISIBLE ON `default`, disabled rather than
              removed. Somebody switching back to custom should find what they
              wrote still there; a field that vanishes reads as a field that was
              cleared, and they would retype it to check. */}
          <div className={`mt-6 grid gap-3 ${custom ? "" : "opacity-50"}`}>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Greeting</span>
              <input
                value={config.greeting} disabled={!custom} maxLength={200}
                onChange={(e) => { setConfig({ ...config, greeting: e.target.value }); setSaved(false); }}
                placeholder="Good morning. Here is your studio." className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Quotation</span>
              <input
                value={config.quote} disabled={!custom} maxLength={300}
                onChange={(e) => { setConfig({ ...config, quote: e.target.value }); setSaved(false); }}
                placeholder="Quality is not an act, it is a habit." className={field}
              />
            </label>
            <label className="block sm:max-w-xs">
              <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Attributed to</span>
              <input
                value={config.author} disabled={!custom} maxLength={120}
                onChange={(e) => { setConfig({ ...config, author: e.target.value }); setSaved(false); }}
                placeholder="Aristotle" className={field}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={save} disabled={busy}
              className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-xs text-[var(--ad-muted-foreground)]">Saved.</span>}
          </div>
        </CardBody>
      </Card>

      {preview && (
        <Card>
          <CardBody>
            <h3 className="font-600">Being read right now</h3>
            {/* THE SAME BAND A STUDIO DRAWS, from the same class — so this is a
                preview of the thing rather than an impression of it. */}
            <div className="greeting-band mt-3 px-4 py-2.5">
              <p className="text-sm font-600">{preview.greeting || <span className="opacity-60">No greeting set</span>}</p>
              {preview.quote && (
                <blockquote className="mt-0.5 text-xs opacity-80">
                  “{preview.quote}”{preview.author && <cite className="ms-1.5 not-italic opacity-70">— {preview.author}</cite>}
                </blockquote>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--ad-muted-foreground)]">For {preview.day}, server time.</p>
          </CardBody>
        </Card>
      )}
    </>
  );
}
