"use client";

import Icon from "./Icon";

// The right-hand "theme customizer" drawer. Everything it changes is a class or
// a CSS custom property on the `.admindek` shell, so nothing here can escape
// /super. Preferences live in localStorage under `super-*` keys.

export const PRESETS = [
  { id: "ocean-blue", label: "Ocean Blue", value: "#4680ff" },
  { id: "royal-purple", label: "Royal Purple", value: "#7c4dff" },
  { id: "rose-pink", label: "Rose Pink", value: "#e91e63" },
  { id: "crimson-red", label: "Crimson Red", value: "#dc2626" },
  { id: "vibrant-orange", label: "Vibrant Orange", value: "#ff9800" },
  { id: "golden-yellow", label: "Golden Yellow", value: "#ffd54f" },
  { id: "forest-green", label: "Forest Green", value: "#4caf50" },
  { id: "aqua-cyan", label: "Aqua Cyan", value: "#00bcd4" },
  { id: "slate", label: "Slate", value: "#212529" },
  { id: "navy", label: "Navy", value: "#34495e" },
];

function Section({ title, sub, children }) {
  return (
    <div className="border-b px-5 py-5" style={{ borderColor: "var(--ad-border)" }}>
      <p className="text-sm font-semibold">{title}</p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{sub}</p> : null}
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function Choice({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
          style={
            value === o.id
              ? { borderColor: "var(--ad-primary)", color: "var(--ad-primary)", backgroundColor: "rgba(70,128,255,.08)" }
              : { borderColor: "var(--ad-border)", color: "var(--ad-muted-foreground)" }
          }
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
        className={`fixed inset-0 z-[55] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 z-[56] flex h-screen w-[320px] max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 ltr:right-0 rtl:left-0 ${
          open ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--ad-card)", color: "var(--ad-foreground)" }}
        aria-hidden={!open}
        aria-label="Theme customizer"
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <div>
            <p className="text-sm font-semibold">Theme Customizer</p>
            <p className="text-xs text-[var(--ad-muted-foreground)]">Preview the console's variants</p>
          </div>
          <button type="button" onClick={onClose} className="ad-icon-btn h-9 w-9" aria-label="Close customizer">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="ad-scrollarea flex-1">
          <Section title="Accent colour" sub="Drives primary, ring and chart-1">
            <div className="grid grid-cols-5 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set("preset", p.id)}
                  title={p.label}
                  aria-label={p.label}
                  className="flex h-9 items-center justify-center rounded-lg transition-transform hover:scale-105"
                  style={{
                    backgroundColor: p.value,
                    outline: state.preset === p.id ? "2px solid var(--ad-foreground)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  {state.preset === p.id ? <Icon name="check" className="h-4 w-4 text-white" /> : null}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Sidebar" sub="Independent of the page theme">
            <Choice
              value={state.sidebarTheme}
              onChange={(v) => set("sidebarTheme", v)}
              options={[
                { id: "dark", label: "Dark" },
                { id: "light", label: "Light" },
              ]}
            />
          </Section>

          <Section title="Layout width">
            <Choice
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
              value={state.dir}
              onChange={(v) => set("dir", v)}
              options={[
                { id: "ltr", label: "LTR" },
                { id: "rtl", label: "RTL" },
              ]}
            />
          </Section>

          <Section title="Sidebar captions">
            <Choice
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
