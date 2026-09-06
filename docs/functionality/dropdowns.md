# Dropdowns

Every list the product asks somebody to pick from, on all three surfaces: the studio, the
account pages and the `/super` console.

## What it is

One component, `src/components/fields/SelectMenu.jsx` — a trigger button and a panel of
options that the product draws itself. `Field` renders it for `as="select"`, so the ~60
fields that go through the one field get it without a call site changing; the ~30 controls
that were raw `<select>` elements call it directly and pass the same class their select
wore, so each one keeps the box it had.

**There is no `<select>` left in `src/`.** That is the point of the change and the thing to
check before adding one.

### Why it exists

A native `<select>` hands its option list to the operating system. The closed control could
be themed, and was; the open list could not. That was a legibility **bug**, not a polish
one: every select carried the theme's text colour (`--geex-ink` in the studio,
`--ad-foreground` in the console), `<option>` inherits it, and in dark mode that is
near-white ink painted onto the browser's white popup. The list rendered as a blank
rectangle. A studio in dark mode could not read its own Department dropdown.

The landing page reached the same conclusion first and hand-built its `CurrencyPicker`
("the page's own control, not the browser's"). This is that decision made once, for the
whole product.

**`radix-ui` was not used** even though it is already a dependency and its Select is good.
It lands in whichever chunk imports it, and the client-JS ceiling has single-digit
kilobytes of headroom; a popper in the shared studio chunk is the wrong price for a colour
problem.

### The colour-scheme net underneath

`globals.css` declares `color-scheme` (`light` on `:root` and `html.light`, `dark` on
`html.dark`). It had never been declared at all. It is what fixes the remaining native
chrome the product does not draw — date and time pickers, colour swatches, scrollbars,
autofill — and it would have fixed the select's legibility on its own. It is not the answer
for a select, because the result is still the operating system's list inside the product's
panel: its own corners, type, row metrics and highlight. Both, therefore.

## What it stores

**Nothing.** It is a control. It is controlled when given a `value` and uncontrolled from a
`defaultValue` otherwise — the same choice a `<select>` offers, and needed because two
console pages render on the server and hand their picker a default and no handler.

## What it does

**Paints from `--menu-*` and nothing else.** Those are defined on `:root` and `.dark` in
`globals.css` against the primitives, so the default suits the charcoal surfaces (the
studio, the account pages), and re-pointed once by `.admindek` in `super.css` onto the
console's steel. A panel written against `--geex-*` would render correctly in the studio
and transparent everywhere else, because that token is scoped to `html.studio-chrome`.

**Portals its panel to `<body>`,** so a menu is never clipped by a dialog or a scrolling
table — and therefore has to carry two things out with it, both taken from the trigger when
the menu opens:

- the `admindek` class, because `/super`'s token scope is a wrapper `div` and not `<html>`
  the way `.studio-chrome` is;
- the reading direction, because an Arabic studio declares `dir` on the shell rather than on
  `<html>` (the root layout never touches the database, so it cannot know a tenant's
  language). The panel is anchored on the trigger's inline-START edge, so a panel wider than
  its trigger grows the way the text does.

**Opens upward when there is no room below**, measured from the space actually available
rather than guessed, so a status picker at the foot of a long table does not open off-screen.
The position is taken in the click handler, not in an effect, so the panel's first paint is
already in place.

**Searches above ten options, type-ahead below.** A currency list is 150 rows and scrolling
to JOD is not a design; a five-row status list does not want a text input in front of it.
The search ranks a prefix above a word-start above a match buried mid-string — the same
ranking `Combo` uses, because a plain substring test answers "re" with Healthcare before
Real Estate.

**Keyboard**: arrows move, Home/End jump, Enter picks, Escape closes and returns focus to
the trigger, Tab closes without stealing the focus move, and printable characters on a
closed control jump to the option that starts with them. It is a `combobox` with a
`listbox`, and the highlight is reported through `aria-activedescendant`.

**An empty-labelled option is a real choice** — it is how a non-required field is cleared —
and it draws the em dash this product already uses for nothing, because a blank row reads
as a rendering fault.

## Not built yet

- **Multi-select.** Every caller picks one value. The places that pick several
  (`ServicePicker`, `DashboardWidgetPicker`, the serial allocator) have their own controls.
- **Grouped options.** No `<optgroup>` equivalent; a flat list is all any caller needs
  today.
- **Option content beyond a string.** No icons, no two-line rows, no colour swatches — the
  label is text.
- **Native form participation.** The trigger is a button, so `required` is `aria-required`
  and nothing more: there is no hidden `<select>`, and a browser cannot validate or submit
  one of these. That costs nothing today — the studio has exactly one `<form>` and it holds
  no picker — and it is what to fix first if a real form ever needs one.
- **`radix-ui`'s Select is still used in one place**, `src/components/quality/editor/cell-format-dialog.tsx`,
  and has not been converted. It already themes correctly (`bg-popover`), and it sits in a
  lazily-loaded chunk that has already paid for the library.
