// WHERE THE CONSOLE LIVES. One constant, and eighteen files import it.
//
// THIS WAS THE SIDEBAR MAP — a tree of groups and items that `Sidebar` rendered
// down the left of every screen and the command palette searched. The console
// has no sidebar any more: every screen moved under the Pulse shell, where the
// bottom bar is the navigation and the header's menu carries the rest.
// `PulseChrome` owns that list, beside the layout that draws it, so a screen and
// its bar item are added in one place instead of two.
//
// So `NAV` and `FLAT` are gone with the four files that read them — Shell,
// Sidebar, Header, Customizer. Keeping a nav tree nothing renders is how a
// console ends up with two answers to "what screens are there", and this file
// has already watched that happen once from the other side.
//
// THE HISTORY IS WORTH KEEPING, because it is the reason this file was ever
// large: the console started as a 1:1 mirror of a reference admin template, and
// most of it was demonstration rather than product — seven fake dashboards,
// eighteen inert authentication screens, nine maintenance pages, a marketing
// landing page, a documentation index, and demo Invoices / Orders / Task Board
// screens built from hardcoded arrays. Forty routes, none reading a byte of real
// data. They were not harmless: a console that renders "$67,250.00 · Overdue"
// from a literal teaches the person reading it that the numbers here might be
// real, and `/super/v1/register` offered a registration form for a console that
// HAS NO REGISTRATION — a super admin is an existing user marked as one. All
// deleted, code and route.
//
// WHAT IS LEFT IS WHAT EXISTS. That rule outlived the file that stated it: every
// item in `PulseChrome`'s bar and menu is a screen that reads real data.

export const BASE = "/super";
