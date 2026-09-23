import { PageHeader } from "../../_components/ui";
import CatalogEditor from "@/components/super/CatalogEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packages" };

// A package IS a card on the public pricing page. Everything the card shows is
// authored here, so changing a price or a bullet is a save rather than a deploy.
//
// TYPE decides the card's shape: Free shows no figure, Premium shows "invoiced
// monthly" instead of one, and only Compound carries categories — the headcount
// bands that let one card price 10–25 differently from 26–49.
//
// Every text field is bilingual. The site is Arabic as well as English, and a
// half-translated price list is worse than an untranslated one.
const TYPES = [
  { value: "free", label: "Free — no price, button says Start Free" },
  { value: "compound", label: "Compound — priced by category, button says Get Started" },
  { value: "premium", label: "Premium — invoiced monthly, button says Contact Sales" },
];

// Conditions travel as DATA, for the same reason the total's formula does: this
// is a server component and CatalogEditor is a client one, so the field list is
// serialised on the way across and a function cannot make the trip.
const ONLY_COMPOUND = { field: "type", equals: "compound", fallback: "compound" };
const NOT_COMPOUND = { field: "type", notEquals: "compound", fallback: "compound" };

const FIELDS = [
  { key: "name", label: "Name", type: "text", placeholder: "Small" },
  { key: "nameAr", label: "Name (Arabic)", type: "text", placeholder: "صغيرة" },
  { key: "type", label: "Card type", type: "select", options: TYPES },
  { key: "popular", label: "Most popular", type: "switch", hint: "The badge. Give it to one package only." },

  { key: "tagline", label: "Tagline", type: "text", placeholder: "Small companies — 5 to 49 employees." },
  { key: "taglineAr", label: "Tagline (Arabic)", type: "text" },
  { key: "usersLabel", label: "Users line", type: "text", placeholder: "10–49 users" },
  { key: "usersLabelAr", label: "Users line (Arabic)", type: "text" },

  // Categories replace min/max for a compound package: each one carries its own
  // range, so a single pair of numbers on the package would contradict them.
  {
    key: "categories", label: "Categories", type: "categories", showWhen: ONLY_COMPOUND,
    hint: "One per headcount band. Each has its own range and per-employee rate.",
  },
  { key: "minEmployees", label: "Min employees", type: "number", showWhen: NOT_COMPOUND },
  { key: "maxEmployees", label: "Max employees", type: "number", showWhen: NOT_COMPOUND, zeroLabel: "No limit", hint: "0 means no upper limit." },
  { key: "costPerEmployee", label: "Cost per employee", type: "number", showWhen: NOT_COMPOUND, hint: "The base price. Each region's own price is set under Regional pricing." },
  {
    key: "cost", label: "Total cost", type: "computed",
    multiply: ["costPerEmployee", "maxEmployees"],
    whenZero: "costPerEmployee",
    showWhen: NOT_COMPOUND,
    hint: "Cost per employee x max employees. With no upper limit, the per-employee rate stands alone.",
  },

  { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo", zeroLabel: "Endless", hint: "0 means endless. Shown on the card." },
  // Chat and its allowance sit together: the number means nothing with the box
  // unticked, and an allowance with no chat to spend it on is a dead field.
  { key: "chatEnabled", label: "Chat box", type: "switch", hint: "Shows the live chat button inside the studio." },
  {
    key: "supportTicketsPerMonth", label: "Support tickets / month", type: "number",
    zeroLabel: "Unlimited", showWhen: { field: "chatEnabled", equals: true },
    hint: "0 means unlimited. Each chat started spends one; the button goes flat at zero.",
  },
  // Nova, the in-app assistant, is sold on the PACKAGE axis (dashboards are the
  // tier axis). Off hides Nova entirely for studios on this package; on gives
  // them the assistant. Which capabilities Nova then offers is set once,
  // platform-wide, in /super → Application → Nova.
  { key: "novaHeadEnabled", label: "Nova assistant", type: "switch", hint: "Gives studios on this package the Nova assistant. Capabilities are chosen in Application → Nova." },
  // TILLS (18/09/2026). Each till is a device paired to it in Point of Sale →
  // Settings; this is how many a studio on the package may pair.
  { key: "maxTills", label: "Tills", type: "number", zeroLabel: "No limit", hint: "How many point-of-sale tills a studio may pair. 0 means no limit; a package saved before this field existed allows 1." },

  // THE SHOP'S OWN OFFERS (22/09/2026). Two switches because they sell
  // separately: having Promotions at all, and having the parts that take a
  // person to set up. Both default ON, so an existing package is unchanged.
  { key: "promotionsEnabled", label: "Promotions", type: "switch", hint: "Lets a studio write offers that take money off a sale at the till." },
  {
    key: "promotionsAdvanced", label: "Coupons, tiers and schedules", type: "switch",
    showWhen: { field: "promotionsEnabled", equals: true },
    hint: "Coupon codes, tiered ladders and day-and-hour schedules. Off, a studio writes plain offers only; offers it already has keep working.",
  },

  { key: "includes", label: "Includes", type: "lines", placeholder: "Full platform — every department\nUp to 4 employees\nEnglish & Arabic, RTL-ready" },
  { key: "includesAr", label: "Includes (Arabic)", type: "lines" },

  { key: "color", label: "Colour", type: "color", hint: "Pick any colour, or start from one of the four." },
  { key: "isPublic", label: "Public", type: "switch", hint: "Off keeps it out of the public pricing page entirely." },
];

// The list stays narrow — the full record is long, and a table that shows
// everything shows nothing.
const COLUMNS = ["name", "type", "usersLabel", "cost", "chatEnabled", "includes", "isPublic"];

export default function PackagesPage() {
  return (
    <>
      <PageHeader
        title="Packages"
      />
      <CatalogEditor
        kind="packages" title="Packages" fields={FIELDS}
        columns={COLUMNS}
        settings={{ title: "Pricing settings", sub: "Applies to every package on the public pricing page." }}
      />
    </>
  );
}
