// WHERE THE CONSOLE LIVES, AND WHAT IS IN IT.
//
// ONE LIST, TWO READERS. The sidebar and the ⌘K palette both draw from here:
// the sidebar in `(console)/ConsoleChrome`, the palette in `ConsoleActions`. It was
// briefly a local constant inside the chrome, which was fine while the chrome
// was its only reader; restoring the palette made it two, and two copies of
// "what screens are there" disagree the first time somebody adds one.
//
// EVERY HREF IS SPELLED OUT, for the test rather than for the eye.
// `testEveryConsoleDestinationResolvesToARoute` reads each `${BASE}...` literal
// and asserts a page answers it — the guard that exists because sign-in once
// landed on a 404 while every link looked right. An interpolated segment cannot
// be resolved statically, so a typo'd item would ship as a dead link with the
// guard green. Written out, it fails the suite.
//
// PULSE IS ONE PAGE HERE, NOT A PREFIX. These addresses sat under
// `/super/pulse/…` for one deploy, which made the wall a container for the
// console; the owner corrected it. The screens are `/super/<name>`, in the
// `(console)` route group, and Pulse is `/super/pulse` beside them.
//
// THE HISTORY OF THIS FILE IS WHY IT IS SMALL. It was the sidebar map, and for a
// long time most of it was demonstration rather than product: the console began
// as a mirror of a reference admin template — seven fake dashboards, eighteen
// inert auth screens, nine maintenance pages, demo Invoices / Orders / Task Board
// screens built from hardcoded arrays — and `/super/v1/register` offered a
// registration form for a console that HAS NO REGISTRATION. All deleted. What is
// left is what exists: every item below is a screen that reads real data.

export const BASE = "/super";

/* THE SIDEBAR, IN GROUPS — the owner, 26/09/2026: "/super is not organized and
   is not tidy, everything is stacked on each other". Fourteen screens sat as
   one row of pills in a bottom bar, wrapping onto a second row on a laptop, in
   the order they happened to ship: Chat between Users and Packages, Calendar
   between Nova and Broadcast. A group says what a screen is FOR, so "who are
   our customers" and "what do we sell" each have one place to look, and a new
   screen has an obvious home.

   THE GROUPS ARE LABELS ONLY — no screen moved and no address changed. Pulse
   is still first, because it is where sign-in lands. */
export const CONSOLE_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: `${BASE}/pulse`, label: "Pulse", icon: "activity" },
      { href: `${BASE}/dashboard`, label: "Dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: `${BASE}/studios`, label: "Studios", icon: "briefcase" },
      { href: `${BASE}/users`, label: "Users", icon: "users" },
      { href: `${BASE}/chat`, label: "Chat", icon: "chat" },
      // What Nova's help desk could not answer, sent on to support (26/09/2026).
      // A support queue, so it sits with the customers rather than under Product.
      { href: `${BASE}/nova/questions`, label: "Nova questions", icon: "help" },
    ],
  },
  {
    label: "Selling",
    items: [
      { href: `${BASE}/packages`, label: "Packages", icon: "package" },
      { href: `${BASE}/tiers`, label: "Tiers", icon: "layers" },
      { href: `${BASE}/regions`, label: "Regional pricing", icon: "globe" },
      { href: `${BASE}/payments`, label: "Payments", icon: "wallet" },
    ],
  },
  {
    label: "Product",
    items: [
      { href: `${BASE}/erp-settings`, label: "ERP settings", icon: "gears" },
      { href: `${BASE}/nova`, label: "Nova", icon: "star" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { href: `${BASE}/calendar`, label: "Calendar", icon: "calendar" },
      { href: `${BASE}/broadcast`, label: "Broadcast", icon: "live" },
      { href: `${BASE}/questionnaires`, label: "Questionnaires", icon: "form" },
      // nompany's own public blog (27/09/2026): posts written here, read at /<locale>/blog.
      { href: `${BASE}/blog`, label: "Blog", icon: "book" },
      // nompany's own openings and the applications to them (27/09/2026).
      { href: `${BASE}/careers`, label: "Careers", icon: "briefcase" },
    ],
  },
];

/* EVERY SCREEN, FLAT, each carrying its group's name — what the palette
   searches and what the chrome matches the address against. Derived rather
   than listed, so the sidebar and the palette cannot offer different screens. */
export const CONSOLE_BAR = CONSOLE_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label })));

/* NO "MORE" MENU ANY MORE — the owner's instruction, 10/09/2026. It held
   Questionnaires, Settings and the database migration. Questionnaires moved
   into the bar above, the migration screen was deleted outright, and Settings
   is the avatar menu's Profile and Security — so the menu was empty and its
   button went with it.

   SETTINGS STAYS SEARCHABLE. The palette reads this list beside the bar, so
   a screen that is in neither the bar nor a menu can still be found by name. */
export const CONSOLE_ACCOUNT = [
  { href: `${BASE}/settings`, label: "Settings", icon: "settings" },
];

/* SCREENS THAT OWN THE WHOLE AREA between the header and the bar, so the chrome
   gives them no padding and no scroll: the wall is a grid sized to the viewport,
   Broadcast is a register with its own scrolling columns, and the questionnaire
   app is a full-height builder. The wall is EXACT rather than a prefix — as a
   prefix it would once have swallowed every screen, when they all sat under it. */
export const FULL_BLEED = [
  { href: `${BASE}/pulse`, prefix: false },
  { href: `${BASE}/broadcast`, prefix: false },
  { href: `${BASE}/questionnaires`, prefix: true },
];
