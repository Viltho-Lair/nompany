// WHERE THE CONSOLE LIVES, AND WHAT IS IN IT.
//
// ONE LIST, TWO READERS. The bottom bar and the ⌘K palette both draw from here:
// the bar in `(console)/ConsoleChrome`, the palette in `ConsoleActions`. It was
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

/* THE BAR. Pulse first, because it is where sign-in lands. */
export const CONSOLE_BAR = [
  { href: `${BASE}/pulse`, label: "Pulse", icon: "activity" },
  { href: `${BASE}/dashboard`, label: "Dashboard", icon: "dashboard" },
  { href: `${BASE}/studios`, label: "Studios", icon: "briefcase" },
  { href: `${BASE}/users`, label: "Users", icon: "users" },
  { href: `${BASE}/chat`, label: "Chat", icon: "chat" },
  { href: `${BASE}/packages`, label: "Packages", icon: "package" },
  { href: `${BASE}/tiers`, label: "Tiers", icon: "layers" },
  { href: `${BASE}/nova`, label: "Nova", icon: "star" },
  { href: `${BASE}/calendar`, label: "Calendar", icon: "calendar" },
  { href: `${BASE}/broadcast`, label: "Broadcast", icon: "live" },
  { href: `${BASE}/questionnaires`, label: "Questionnaires", icon: "form" },
];

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
