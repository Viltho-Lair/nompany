"use client";

import Icon from "./Icon";

// The inline-end "console settings" drawer. Everything it changes is a class on
// the `.admindek` shell, so nothing here can escape /super. Preferences live in
// localStorage under `super-*` keys.
//
// TWO CONTROLS ARE GONE, and neither was a feature.
//
// The first was a ten-swatch ACCENT PICKER — pink, orange, yellow, crimson —
// that wrote `--ad-primary` directly. It came from the template, where the
// swatches are the product. Here they were ten literal hexes that could quietly
// override the brand at runtime: pick Golden Yellow and every primary button,
// focus ring and chart-1 series in the console stopped being nompany blue, in
// one surface only, with no equivalent anywhere else in the product. A console
// that can be repainted is a console that cannot be recognised.
//
// The second was SIDEBAR THEME (dark/light), which existed because the
// template's rail was a navy slab that had to be switchable. The rail is now
// the same card surface as everything else and follows the site theme, so the
// control had nothing left to switch.
//
// What remains are the four genuinely per-person choices: how wide the content
// runs, which direction it reads, whether the group captions show, and whether
// the rail is collapsed.

function Section({ title, sub, children }) {
  return (
    <div className="border-b px-5 py-5" style={{ borderColor: "var(--ad-border)" }}>
      <p className="text-sm font-600">{title}</p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{sub}</p> : null}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function Choice({ options, value, onChange, label }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl border px-3 py-2 text-xs font-600 transition-colors ${
            value === o.id
              ? "border-[var(--ad-primary)] bg-[rgb(var(--ad-primary-rgb)/0.08)] text-[var(--ad-primary)]"
              : "border-[var(--ad-border)] text-[var(--ad-muted-foreground)] hover:bg-[var(--ad-accent)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Customizer({ open, onClose, state, set, onReset }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-[55] bg-[rgb(var(--ad-foreground-rgb)/0.4)] transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* `end-0` plus `ad-slide-out-end` (see super.css): in RTL the drawer flies
          in from the left because that is where the inline end is, with no
          paired ltr:/rtl: override to keep in step. */}
      <aside
        className={`fixed end-0 top-0 z-[56] flex h-screen w-[320px] max-w-[85vw] flex-col shadow-[var(--ad-shadow-lg)] transition-transform duration-300 ${
          open ? "ad-slide-in" : "ad-slide-out-end"
        }`}
        style={{ backgroundColor: "var(--ad-card)", color: "var(--ad-foreground)" }}
        aria-hidden={!open}
        aria-label="Console settings"
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <div>
            <p className="text-sm font-600">Console settings</p>
            <p className="text-xs text-[var(--ad-muted-foreground)]">Saved to this browser</p>
          </div>
          <button type="button" onClick={onClose} className="ad-icon-btn h-9 w-9" aria-label="Close settings">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="ad-scrollarea flex-1">
          <Section title="Layout width" sub="Boxed caps the content at 1200px">
            <Choice
              label="Layout width"
              value={state.container}
              onChange={(v) => set("container", v)}
              options={[
                { id: "fluid", label: "Fluid" },
                { id: "boxed", label: "Boxed" },
              ]}
            />
          </Section>

          <Section title="Direction" sub="Right-to-left mirrors the whole shell">
            <Choice
              label="Direction"
              value={state.dir}
              onChange={(v) => set("dir", v)}
              options={[
                { id: "ltr", label: "LTR" },
                { id: "rtl", label: "RTL" },
              ]}
            />
          </Section>

          <Section title="Navigation rail">
            <Choice
              label="Navigation rail"
              value={state.collapsed ? "collapsed" : "expanded"}
              onChange={(v) => set("collapsed", v === "collapsed")}
              options={[
                { id: "expanded", label: "Expanded" },
                { id: "collapsed", label: "Icons only" },
              ]}
            />
          </Section>

          <Section title="Group captions">
            <Choice
              label="Group captions"
              value={state.captions}
              onChange={(v) => set("captions", v)}
              options={[
                { id: "show", label: "Show" },
                { id: "hide", label: "Hide" },
              ]}
            />
          </Section>
        </div>

        <div className="border-t p-5" style={{ borderColor: "var(--ad-border)" }}>
          <button type="button" onClick={onReset} className="ad-btn ad-btn-outline w-full">
            <Icon name="refresh" className="h-4 w-4" /> Reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}
