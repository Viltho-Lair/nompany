"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/app/super/_components/ui";
import { bandCss, defaultTheme, newMessage, BRAND_STOPS, MAX_MESSAGES, MAX_STOPS } from "@/shared/greeting";

/* THE STUDIO BAND, edited platform-wide.
   ------------------------------------------------------------------
   TWO KINDS OF MESSAGE AND THE SCREEN SAYS WHICH. An AUTOMATED message is
   written by the model each day against the platform AI key set above it; a
   WRITTEN one is these words until somebody changes them. The difference is not
   cosmetic — one of them will say something tomorrow that nobody has read yet —
   so an automated row shows what was generated TODAY rather than an empty box
   implying nothing is set, and it is labelled every time it is drawn.

   COLOURS PREVIEW LOCALLY, WORDS PREVIEW FROM THE SERVER. `bandCss` is the same
   pure function the studio paints with, so a colour picked here is the colour
   that ships and there is no round trip between picking it and seeing it. The
   WORDS of an automated message are the day's generation and this screen has no
   business computing them, so those come back from the same resolve a studio
   calls.

   THE PICKER IS `<input type="color">` DELIBERATELY. It can only produce
   `#rrggbb`, which is exactly what the server accepts — every other colour
   syntax is refused, because these strings are substituted into a
   `linear-gradient()` that renders in every studio in the product. The
   validation is on the server where it counts; the picker is what stops anybody
   meeting it. */

const field = "w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm";
const label = "mb-1 block text-xs text-[var(--ad-muted-foreground)]";

function BandPreview({ theme, greeting, quote, author }) {
  const css = bandCss(theme);
  return (
    <div
      className="greeting-band px-4 py-2.5"
      style={{ "--band-bg": css.background, "--band-border": css.border, "--band-glow": css.glow }}
    >
      <p className="truncate text-sm font-600">{greeting || <span className="opacity-50">No greeting yet</span>}</p>
      {quote && (
        <blockquote className="mt-0.5 truncate text-xs opacity-80">
          “{quote}”{author && <cite className="ms-1.5 not-italic opacity-70">— {author}</cite>}
        </blockquote>
      )}
    </div>
  );
}

function Stops({ title, hint, stops, onChange }) {
  return (
    <div>
      <span className={label}>{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        {stops.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <input
              type="color"
              value={c}
              onChange={(e) => onChange(stops.map((s, j) => (j === i ? e.target.value : s)))}
              className="h-8 w-10 cursor-pointer rounded border border-[var(--ad-border)] bg-transparent p-0.5"
              aria-label={`${title} ${i + 1}`}
            />
            {stops.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(stops.filter((_, j) => j !== i))}
                aria-label={`Remove ${title.toLowerCase()} ${i + 1}`}
                className="text-xs text-[var(--ad-muted-foreground)] hover:text-[var(--ad-destructive)]"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {stops.length < MAX_STOPS && (
          <button
            type="button"
            onClick={() => onChange([...stops, stops[stops.length - 1] || BRAND_STOPS[0]])}
            className="rounded-lg border border-[var(--ad-border)] px-2 py-1 text-xs"
          >
            + Colour
          </button>
        )}
      </div>
      {/* ONE COLOUR IS A SOLID, and saying so here is the difference between a
          person understanding the control and thinking a gradient is broken. */}
      <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">{hint}</p>
    </div>
  );
}

function MessageCard({ message, resolved, index, canRemove, onChange, onRemove }) {
  const ai = message.source === "ai";
  const custom = message.theme.mode === "custom";
  const set = (patch) => onChange({ ...message, ...patch });
  const setTheme = (patch) => onChange({ ...message, theme: { ...message.theme, ...patch } });

  // AN AUTOMATED ROW PREVIEWS THE DAY'S GENERATION, a written one previews what
  // is in the boxes right now — so typing shows immediately and generated words
  // are never presented as something a person can edit here.
  const shown = ai
    ? { greeting: resolved?.greeting || "", quote: resolved?.quote || "", author: resolved?.author || "" }
    : { greeting: message.greeting, quote: message.quote, author: message.author };

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-600">Message {index + 1}</h3>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={message.active} onChange={(e) => set({ active: e.target.checked })} />
              Showing
            </label>
            {canRemove && (
              <button type="button" onClick={onRemove} className="text-sm text-[var(--ad-destructive)]">
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {[
            { id: "ai", title: "Automated", hint: "The AI writes it fresh each day, on the key set above." },
            { id: "manual", title: "Written by you", hint: "Exactly these words, every day, until you change them." },
          ].map((s) => (
            <label key={s.id} className="flex max-w-xs cursor-pointer items-start gap-2.5">
              <input
                type="radio"
                name={`source-${message.id}`}
                checked={message.source === s.id}
                onChange={() => set({ source: s.id })}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-500">{s.title}</span>
                <span className="block text-xs text-[var(--ad-muted-foreground)]">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {ai ? (
          <div className="mt-5 rounded-lg border border-dashed border-[var(--ad-border)] p-3">
            <p className="text-xs text-[var(--ad-muted-foreground)]">
              {resolved?.generated
                ? "Written by the AI for today. It changes on its own at midnight, server time."
                : "Nothing generated for today — this is the built-in fallback. That means no key is set, or the call didn't go through."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            <label className="block">
              <span className={label}>Greeting</span>
              <input
                value={message.greeting} maxLength={200}
                onChange={(e) => set({ greeting: e.target.value })}
                placeholder="Good morning. Here is your studio." className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Quotation</span>
              <input
                value={message.quote} maxLength={300}
                onChange={(e) => set({ quote: e.target.value })}
                placeholder="Quality is not an act, it is a habit." className={field}
              />
            </label>
            <label className="block sm:max-w-xs">
              <span className={label}>Attributed to</span>
              <input
                value={message.author} maxLength={120}
                onChange={(e) => set({ author: e.target.value })}
                placeholder="Aristotle" className={field}
              />
            </label>
          </div>
        )}

        <div className="mt-6 border-t border-[var(--ad-border)] pt-4">
          <div className="flex flex-wrap gap-4">
            {[
              { id: "default", title: "House colours", hint: "The logo ramp — cyan, amber, red — tinted over the page." },
              { id: "custom", title: "Custom", hint: "Your own fill and border. One colour is a solid, several make a gradient." },
            ].map((m) => (
              <label key={m.id} className="flex max-w-xs cursor-pointer items-start gap-2.5">
                <input
                  type="radio"
                  name={`theme-${message.id}`}
                  checked={message.theme.mode === m.id}
                  onChange={() => setTheme({ mode: m.id })}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-500">{m.title}</span>
                  <span className="block text-xs text-[var(--ad-muted-foreground)]">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {/* THE STOPS STAY VISIBLE ON "HOUSE COLOURS", dimmed rather than
              removed — somebody switching back should find what they picked
              still there, and a control that vanishes reads as one that was
              cleared. */}
          <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${custom ? "" : "pointer-events-none opacity-50"}`}>
            <Stops
              title="Background" stops={message.theme.background}
              hint={message.theme.background.length === 1 ? "One colour: a solid fill." : `${message.theme.background.length} colours, left to right.`}
              onChange={(background) => setTheme({ background })}
            />
            <Stops
              title="Border" stops={message.theme.border}
              hint={message.theme.border.length === 1 ? "One colour: a plain 1px border." : `${message.theme.border.length} colours, left to right.`}
              onChange={(border) => setTheme({ border })}
            />
          </div>

          <div className="mt-4">
            <span className={label}>Preview</span>
            <BandPreview theme={message.theme} {...shown} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function GreetingEditor() {
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function take(d) {
    setConfig(d.config); setPreview(d.preview); setAi(d.ai);
  }

  useEffect(() => {
    fetch("/api/super/greeting", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) take(d); else setError("Couldn't load the band."); })
      .catch(() => setError("Couldn't load the band."));
  }, []);

  async function send(method) {
    setBusy(method); setError(""); setSaved(false);
    const res = await fetch("/api/super/greeting", {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify(config) } : {}),
    });
    setBusy("");
    if (!res.ok) { setError(method === "PUT" ? "Couldn't save." : "Couldn't regenerate."); return; }
    take(await res.json());
    if (method === "PUT") setSaved(true);
  }

  if (!config) {
    return <Card><CardBody><p className="text-sm text-[var(--ad-muted-foreground)]">{error || "Loading…"}</p></CardBody></Card>;
  }

  const messages = config.messages;
  const byId = Object.fromEntries((preview?.messages || []).map((m) => [m.id, m]));
  const update = (i, next) => { setConfig({ ...config, messages: messages.map((m, j) => (j === i ? next : m)) }); setSaved(false); };
  const remove = (i) => { setConfig({ ...config, messages: messages.filter((_, j) => j !== i) }); setSaved(false); };
  const add = () => {
    const m = newMessage(`m${Date.now().toString(36)}`);
    setConfig({ ...config, messages: [...messages, { ...m, theme: defaultTheme() }] });
    setSaved(false);
  };

  const automated = messages.some((m) => m.active && m.source === "ai");

  return (
    <>
      {/* WHAT AN AUTOMATED MESSAGE RUNS ON, said beside the messages themselves.
          The key's own form is directly above this on the Broadcast pane; this
          line is about what happens WITHOUT one, which a credential card has no
          business explaining. No automated message, no card — an empty panel
          reads as something that failed to load. */}
      {automated && (
      <Card className="mb-6">
        <CardBody>
          {(
            <p className="text-sm">
              {ai?.keySet ? (
                <>
                  Automated messages are written by <strong>{ai.provider}</strong>,{" "}
                  <strong>{ai.model}</strong> — once a day, for every studio at once.
                </>
              ) : (
                <>
                  <strong>No AI key is set</strong>, so automated messages fall back to a built-in
                  rotation of seven greetings. Add one above and they start writing themselves.
                </>
              )}
            </p>
          )}
        </CardBody>
      </Card>
      )}

      {error && <p className="mb-4 text-sm text-[var(--ad-destructive)]">{error}</p>}

      {messages.map((m, i) => (
        <MessageCard
          key={m.id}
          message={m}
          resolved={byId[m.id]}
          index={i}
          canRemove={messages.length > 1}
          onChange={(next) => update(i, next)}
          onRemove={() => remove(i)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => send("PUT")} disabled={!!busy}
          className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
          {busy === "PUT" ? "Saving…" : "Save"}
        </button>
        {messages.length < MAX_MESSAGES && (
          <button type="button" onClick={add} disabled={!!busy}
            className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
            Add a message
          </button>
        )}
        {automated && ai?.keySet && (
          /* THE WAY OUT OF TWO STATES A PERSON CANNOT OTHERWISE LEAVE: a key that
             was wrong when the day's first reader arrived (the failure is
             remembered until midnight), and a line nobody wants under the
             company's name. Waiting until tomorrow answers neither. */
          <button type="button" onClick={() => send("POST")} disabled={!!busy}
            className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
            {busy === "POST" ? "Writing…" : "Regenerate today's"}
          </button>
        )}
        {saved && <span className="text-xs text-[var(--ad-muted-foreground)]">Saved.</span>}
      </div>

      {preview?.messages?.length > 0 && (
        <Card className="mt-6">
          <CardBody>
            <h3 className="font-600">Being read right now</h3>
            <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
              For {preview.day}, server time. In a studio these share one box and cycle.
            </p>
            <div className="mt-3 grid gap-3">
              {preview.messages.map((m) => (
                <div key={m.id}>
                  <div
                    className="greeting-band px-4 py-2.5"
                    style={{ "--band-bg": m.css.background, "--band-border": m.css.border, "--band-glow": m.css.glow }}
                  >
                    <p className="text-sm font-600">{m.greeting}</p>
                    {m.quote && (
                      <blockquote className="mt-0.5 text-xs opacity-80">
                        “{m.quote}”{m.author && <cite className="ms-1.5 not-italic opacity-70">— {m.author}</cite>}
                      </blockquote>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
                    {m.source === "manual" ? "Written by you" : m.generated ? "Written by the AI today" : "Built-in fallback"}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
