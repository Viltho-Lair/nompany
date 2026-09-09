// The /super sidebar map. Groups render as captioned blocks; an item with
// `children` renders as a collapsible tree.
//
// THE TEMPLATE IS GONE. The console started as a 1:1 mirror of a reference
// admin template, and for a long time most of this file was demonstration
// rather than product: a "to be worked" group holding seven fake dashboards,
// eighteen inert authentication screens, nine maintenance pages, a marketing
// landing page, a documentation index, and demo Invoices / Orders / Task Board
// screens built from hardcoded arrays. Forty routes, none of which read a byte
// of real data.
//
// They were not harmless. A console that renders "$67,250.00 · Overdue" from a
// literal teaches the person reading it that the numbers here might be real,
// and /super/v1/register offered a registration form for a console that HAS NO
// REGISTRATION — a super admin is an existing user marked as one. Every one of
// them is deleted now, code and route both.
//
// What is left is what exists. If a screen is in this file, it reads real data.
//
// The four screens that were stranded in "to be worked" while being perfectly
// real — Calendar, Notifications, and the two Settings screens — moved into the
// groups they belong to rather than going down with the demos. Calendar in
// particular is a Google Calendar OAuth connection; it looked static to a
// search for `fetch(` only because it is a Server Component that reads the
// store directly, which is a lesson about the search rather than the screen.

export const BASE = "/super";

export const NAV = [
  {
    caption: "Navigation",
    items: [
      // Analytics IS the dashboard — the one screen drawing real data (active
      // users, exchange rates, satisfaction). The seven demo dashboards that
      // used to share this tree are deleted, so there is no tree left to share.
      { label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard/analytics` },
      // The wall. It opens OUTSIDE this chrome (see (full)) because a sidebar
      // eats 260px of a screen whose whole purpose is to be looked at from
      // across a room — the same reason Questionnaires leaves its own group
      // behind.
      { label: "Pulse wall", icon: "activity", href: `${BASE}/pulse` },
    ],
  },
  {
    caption: "Application",
    items: [
      // Live chat with studios.
      { label: "Chat", icon: "chat", href: `${BASE}/application/chat` },
      { label: "Users", icon: "users", href: `${BASE}/application/users` },
      { label: "Studios", icon: "briefcase", href: `${BASE}/application/studios` },
      { label: "Packages", icon: "package", href: `${BASE}/application/packages` },
      { label: "Tiers", icon: "layers", href: `${BASE}/application/tiers` },
      { label: "Nova", icon: "star", href: `${BASE}/application/nova` },
      // A studio's Google Calendar connection — the OAuth grant, and the board
      // of what it returns.
      { label: "Calendar", icon: "calendar", href: `${BASE}/application/calendar` },
      { label: "Notifications", icon: "bell", href: `${BASE}/application/notifications` },
      // Read-only view of the store cutover. The cutover itself is DONE —
      // Postgres, live 02/09/2026 — so this administers nothing and reports.
      { label: "Database migration", icon: "database", href: `${BASE}/application/migration` },
    ],
  },
  {
    caption: "Forms",
    items: [
      // Full-page app: it opens outside the console chrome (see (full)),
      // which is why its href leaves the /forms group behind.
      { label: "Questionnaires", icon: "form", href: `${BASE}/questionnaires` },
    ],
  },
  {
    caption: "Settings",
    items: [
      { label: "Profile", icon: "settings", href: `${BASE}/settings/profile` },
      // The console's own MFA and session list — real, and the reason this
      // group exists rather than these two sitting among the demos.
      { label: "Security", icon: "shield", href: `${BASE}/settings/security` },
    ],
  },
];

// Flat lookup used by the header breadcrumb and the ⌘K palette.
export const FLAT = NAV.flatMap((g) =>
  g.items.flatMap((it) =>
    it.children
      ? it.children.map((c) => ({ ...c, group: g.caption, parent: it.label, icon: it.icon }))
      : [{ ...it, group: g.caption }],
  ),
);
