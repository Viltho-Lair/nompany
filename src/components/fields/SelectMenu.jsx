"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// THE ONE DROPDOWN. Every list the product asks somebody to pick from opens
// this panel — the studio's screens, the account pages and the /super console
// alike.
//
// WHY IT EXISTS AT ALL. A native <select> hands its option list to the
// operating system. The closed control could be themed, and was; the OPEN list
// could not. That is not merely a cosmetic gap — it was a legibility BUG. Every
// select in the product carried the theme's text colour (`--geex-ink` in the
// studio, `--ad-foreground` in the console), <option> inherits it, and in dark
// mode that is near-white ink painted onto the browser's white popup. The list
// rendered as a blank rectangle. A studio in dark mode could not read its own
// Department dropdown.
//
// The landing page reached the same conclusion first and hand-built its
// CurrencyPicker for it ("the page's own control, not the browser's"). This is
// that decision made once, for the whole product, so there is one dropdown to
// theme rather than one per screen.
//
// WHY NOT RADIX. `radix-ui` is already a dependency and its Select is excellent,
// but it lands in whichever chunk imports it, and the client-JS ceiling has
// single-digit kilobytes of headroom. Pulling a popper into the shared studio
// chunk to solve a colour problem is the wrong trade; this is a few hundred
// bytes of listbox and owes nothing to a library.
//
// WHY NOT JUST `color-scheme: dark`. That IS set (globals.css) and it fixes the
// legibility on its own — a browser then paints the popup dark and the light ink
// is readable again. It is the safety net for the native controls that remain
// (date, time, colour, scrollbars). It is not the answer for a select, because
// the result is still the operating system's list sitting inside the product's
// own panel: square corners, its own type, its own row metrics, its own idea of
// a highlight. Both, therefore: the net underneath, and the product's own
// control on top.
//
// TOKENS, NOT SURFACE-SCOPED VARIABLES. The panel paints from `--menu-*`, which
// is defined on `:root` and re-pointed once by `.admindek` — the same shape the
// chart ramp uses, and for the same reason: a component that reads `--geex-*`
// renders correctly in the studio and TRANSPARENT everywhere else, because that
// token is scoped to the studio shell and resolves to nothing outside it. One
// component, three surfaces, one set of names.
//
// AND THE LOOK ITSELF IS IN globals.css (`.menu-*`), not in className strings
// here. Around thirty modules import this across eleven route chunks and the
// bundler inlines a COPY into each, so a utility string in this file is paid
// for eleven times over; a rule in the stylesheet is paid for once. Measured at
// two kilobytes of client JS, against a ceiling that had none to spare — small,
// and recorded because the reasoning generalises to anything imported this
// widely. What it does NOT do is pay for the component itself: eleven copies at
// ~2.2 KB gzip each is where the twenty-four kilobytes in scripts/bundle-budget.mjs
// go, and the lever for that is the duplication, not this file.

// A list this long stops being scannable, so it gets a search box rather than a
// scrollbar. Below it, type-ahead on the trigger is enough: the currency list is
// 150 rows and "scrolling to JOD is not a design", but a five-row status list
// does not want a text input in front of it.
const SEARCH_AT = 10;

// The panel never grows past this; whatever is left of the viewport caps it
// lower. A number rather than a viewport fraction because the rows are a fixed
// height and this is "about eight of them", which is what makes a list read as
// a list rather than as a page.
const MAX_MENU_H = 288;
const GAP = 6;


function normalise(options) {
  return options.map((o) =>
    typeof o === "string" || typeof o === "number"
      ? { value: String(o), label: String(o) }
      : { value: String(o.value ?? ""), label: String(o.label ?? o.value ?? ""), disabled: !!o.disabled },
  );
}

// Rank a search the way the Combo does — a prefix beats a word-start beats a
// match buried mid-string — so typing "re" answers Real Estate before
// Healthcare. A plain substring test gets that backwards.
function rankFilter(rows, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const rank = (r) => {
    const s = r.label.toLowerCase();
    if (s.startsWith(q)) return 0;
    if (s.split(/[\s\-/(,]+/).some((w) => w.startsWith(q))) return 1;
    if (s.includes(q)) return 2;
    return 3;
  };
  return rows.filter((r) => rank(r) < 3).sort((a, b) => rank(a) - rank(b));
}

export default function SelectMenu({
  value: valueProp,
  defaultValue,        // uncontrolled, exactly as a <select> is — see below
  onChange,
  options = [],
  disabled = false,
  required = false,
  id,
  name,
  className = "",          // the trigger's box — callers pass the same class their <select> wore
  menuClassName = "",
  placeholder = "",        // what the trigger shows when nothing is chosen
  chevron = true,          // Field draws its own, so it turns this off
  invalid = false,
  searchable,              // override the SEARCH_AT default either way
  searchPlaceholder = "",
  emptyText = "",
  align = "start",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  // Whatever a <select> would have taken and this does not name — a title, a
  // data attribute, an onFocus. Field spreads a caller's `inputProps` straight
  // through, so dropping the unrecognised ones would lose them silently.
  ...rest
}) {
  const rows = useMemo(() => normalise(options), [options]);
  // Uncontrolled when no `value` is given, because a <select> is — and some of
  // the console's pages render on the SERVER and hand their picker a
  // `defaultValue` and no handler at all. Made to work rather than made to
  // matter: without it those controls would look right and never move.
  const [ownValue, setOwnValue] = useState(defaultValue ?? "");
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : ownValue;
  const reactId = useId();
  const listId = `${reactId}-list`;
  const triggerId = id || `${reactId}-trigger`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState(null);
  // The panel is portalled to <body>, so it leaves behind any surface that
  // scopes its tokens to a WRAPPER rather than to <html>. `.studio-chrome` is on
  // <html> and follows it out; `/super`'s `.admindek` is a div and does not, so
  // the panel wears that class itself and resolves the same tokens the control
  // that opened it did.
  const [scope, setScope] = useState("");
  const [dir, setDir] = useState("");

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  // The type-ahead buffer — see typeAhead below.
  const typed = useRef({ text: "", at: 0 });

  const withSearch = searchable ?? rows.length >= SEARCH_AT;
  const shown = useMemo(() => (withSearch ? rankFilter(rows, query) : rows), [rows, query, withSearch]);
  const selected = rows.find((r) => r.value === String(value ?? ""));

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Decide up or down from the room actually available, not from a guess at
    // the panel's height: a status select at the bottom of a long table has to
    // open upwards or it opens off-screen.
    const below = window.innerHeight - r.bottom - GAP;
    const above = r.top - GAP;
    const up = below < Math.min(MAX_MENU_H, 160) && above > below;
    setRect({
      left: r.left,
      right: window.innerWidth - r.right,
      width: r.width,
      top: r.bottom + GAP,
      bottom: window.innerHeight - r.top + GAP,
      up,
      maxHeight: Math.max(120, Math.min(MAX_MENU_H, up ? above : below)),
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    // Measured HERE rather than in an effect, so the panel's first paint is
    // already in the right place — an effect runs after paint and the list
    // visibly jumps from the top-left corner of the window.
    measure();
    setScope(triggerRef.current?.closest(".admindek") ? "admindek" : "");
    // Reading direction travels the same way and for the same reason. An Arabic
    // studio declares `dir` on the SHELL, not on <html> (the root layout never
    // touches the database, so it cannot know a tenant's language) — so a panel
    // portalled to <body> lands outside it and reads left-to-right inside a
    // right-to-left screen. Taken from the trigger, which is inside.
    setDir(triggerRef.current ? getComputedStyle(triggerRef.current).direction : "");
    setQuery("");
    setActive(rows.findIndex((r) => r.value === String(value ?? "")));
    setOpen(true);
  }, [disabled, measure, rows, value]);

  const closeMenu = useCallback((refocus = true) => {
    setOpen(false);
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (row) => {
      if (!row || row.disabled) return;
      if (!controlled) setOwnValue(row.value);
      onChange?.(row.value);
      closeMenu();
    },
    [onChange, closeMenu, controlled],
  );

  // Outside click, and any scroll or resize of the world under the panel. A
  // fixed panel does not travel with the element it is anchored to, so a page
  // that scrolls beneath it leaves it stranded — re-measure rather than close,
  // because a table that scrolls a pixel under the pointer should not dismiss
  // the list somebody is reading.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      closeMenu(false);
    };
    const onMove = () => measure();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, closeMenu, measure]);

  useEffect(() => {
    if (open && withSearch) searchRef.current?.focus();
  }, [open, withSearch]);

  // Keep the highlighted row in view while arrowing through a list taller than
  // the panel. `block: "nearest"` so it scrolls the panel and never the page,
  // and keyed on the highlight ALONE — a parent re-rendering under an open menu
  // (a live update landing on the tasks list, say) must not yank the list back
  // under somebody scrolling it with the wheel.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // Typing re-ranks the list, so the highlight goes back to the top match — set
  // where the query changes rather than in an effect watching it, which would
  // be a second render for something already known at the keystroke. The list
  // is scrolled home here too, because the highlight may already BE 0 and the
  // effect above would then have nothing to react to.
  const search = (next) => {
    setQuery(next);
    setActive(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const step = (delta) => {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n += 1) {
      i = (i + delta + shown.length) % shown.length;
      if (!shown[i]?.disabled) break;
    }
    setActive(i);
  };

  // ONE TYPE-AHEAD FOR BOTH STATES, which a native select gives for free and
  // which is the whole way a keyboard user picks from a short list: on the
  // CLOSED control it changes the value, and in an open list with no search box
  // it moves the highlight. Same buffer, same beat — successive keystrokes
  // inside 700ms compose one query ("de", "dep") instead of each jumping to a
  // different letter.
  const printable = (e) => e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
  const typeAhead = (key, list) => {
    const now = Date.now();
    typed.current = { text: now - typed.current.at < 700 ? typed.current.text + key : key, at: now };
    const q = typed.current.text.toLowerCase();
    return list.findIndex((r) => !r.disabled && r.label.toLowerCase().startsWith(q));
  };

  // One key map for both entry points: the trigger when the list is short
  // enough to have no search box, and the search box when it has one.
  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      else if (printable(e)) {
        const i = typeAhead(e.key, rows);
        if (i >= 0) { e.preventDefault(); if (!controlled) setOwnValue(rows[i].value); onChange?.(rows[i].value); }
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(shown.findIndex((r) => !r.disabled)); }
    else if (e.key === "End") { e.preventDefault(); for (let i = shown.length - 1; i >= 0; i -= 1) if (!shown[i].disabled) { setActive(i); break; } }
    else if (e.key === "Enter") { e.preventDefault(); choose(shown[active]); }
    else if (e.key === " " && !withSearch) { e.preventDefault(); choose(shown[active]); }
    else if (e.key === "Escape") { e.preventDefault(); closeMenu(); }
    else if (e.key === "Tab") closeMenu(false);
    else if (!withSearch && printable(e)) {
      const i = typeAhead(e.key, shown);
      if (i >= 0) { e.preventDefault(); setActive(i); }
    }
  };

  const panel = open && rect && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={panelRef}
          dir={dir || undefined}
          className={`${scope} menu-panel ${menuClassName} fixed z-[100]`}
          // Anchored on the trigger's INLINE-START edge, which is the right one
          // in Arabic — a panel wider than its trigger has to grow the way the
          // text does, or a long option name walks off the screen.
          style={{
            ...(dir === "rtl" ? { right: rect.right } : { left: rect.left }),
            minWidth: rect.width,
            maxWidth: `min(28rem, calc(100vw - ${Math.max(16, dir === "rtl" ? rect.right : rect.left)}px))`,
            ...(rect.up ? { bottom: rect.bottom } : { top: rect.top }),
          }}
        >
          {withSearch && (
            <div className="menu-search-wrap">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => search(e.target.value)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 && shown[active] ? `${listId}-${active}` : undefined}
                aria-label={searchPlaceholder || ariaLabel || undefined}
                placeholder={searchPlaceholder}
                className="menu-search"
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel || undefined}
            aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
            tabIndex={-1}
            className="menu-list"
            style={{ maxHeight: rect.maxHeight - (withSearch ? 48 : 0) }}
          >
            {shown.length === 0 && (
              <li className="menu-empty">{emptyText || "—"}</li>
            )}
            {shown.map((r, i) => {
              const isSelected = r.value === String(value ?? "");
              return (
                <li key={`${r.value}-${i}`} id={`${listId}-${i}`} data-i={i} role="option" aria-selected={isSelected} aria-disabled={r.disabled || undefined}>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={r.disabled}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(r)}
                    className="menu-row"
                    data-active={i === active || undefined}
                    data-chosen={isSelected || undefined}
                  >
                    {/* An empty-labelled row is a real choice — it is how a
                        non-required field is cleared again. It wears the mark
                        this product already uses for nothing rather than a bare
                        strip of panel: a blank row reads as a rendering fault,
                        and the one thing a control must not look like is one. */}
                    <span className="menu-row-label" data-blank={r.label ? undefined : ""}>
                      {r.label || "—"}
                    </span>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" className="menu-tick" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        id={triggerId}
        name={name}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-activedescendant={open && !withSearch && active >= 0 && shown[active] ? `${listId}-${active}` : undefined}
        className={`${className} menu-trigger`}
        style={align === "center" ? { justifyContent: "center" } : undefined}
      >
        <span className="menu-value" data-blank={selected?.label ? undefined : ""}>
          {selected?.label || placeholder || " "}
        </span>
        {chevron && (
          <svg viewBox="0 0 24 24" className="menu-chevron" data-open={open || undefined} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>
      {panel}
    </>
  );
}

export { SelectMenu };
