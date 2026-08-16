import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
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

const compound = (d) => (d.type || "compound") === "compound";

const FIELDS = [
  { key: "name", label: "Name", type: "text", placeholder: "Small" },
  { key: "nameAr", label: "Name (Arabic)", type: "text", placeholder: "صغيرة" },
  { key: "type", label: "Card type", type: "select", options: TYPES },
  { key: "popular", label: "Most popular", type: "switch", hint: "The badge. Give it to one package only." },

  { key: "tagline", label: "Tagline", type: "text", placeholder: "Small companies — 10 to 49 employees." },
  { key: "taglineAr", label: "Tagline (Arabic)", type: "text" },
  { key: "usersLabel", label: "Users line", type: "text", placeholder: "10–49 users" },
  { key: "usersLabelAr", label: "Users line (Arabic)", type: "text" },

  // Categories replace min/max for a compound package: each one carries its own
  // range, so a single pair of numbers on the package would contradict them.
  {
    key: "categories", label: "Categories", type: "categories", showWhen: compound,
    hint: "One per headcount band. Each has its own range and per-employee rate.",
  },
  { key: "minEmployees", label: "Min employees", type: "number", showWhen: (d) => !compound(d) },
  { key: "maxEmployees", label: "Max employees", type: "number", showWhen: (d) => !compound(d), zeroLabel: "No limit", hint: "0 means no upper limit." },
  { key: "costPerEmployee", label: "Cost per employee", type: "number", prefix: "SAR ", showWhen: (d) => !compound(d) },
  {
    key: "cost", label: "Total cost", type: "computed", prefix: "SAR ",
    multiply: ["costPerEmployee", "maxEmployees"],
    whenZero: "costPerEmployee",
    showWhen: (d) => !compound(d),
    hint: "Cost per employee x max employees. With no upper limit, the per-employee rate stands alone.",
  },

  { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo", zeroLabel: "Endless", hint: "0 means endless. Shown on the card." },
  { key: "supportTicketsPerMonth", label: "Support tickets / month", type: "number", zeroLabel: "Unlimited", hint: "0 means unlimited." },

  { key: "includes", label: "Includes", type: "lines", placeholder: "Full platform — every department\nUp to 9 employees\nEnglish & Arabic, RTL-ready" },
  { key: "includesAr", label: "Includes (Arabic)", type: "lines" },

  { key: "color", label: "Colour", type: "color", hint: "Pick any colour, or start from one of the four." },
  { key: "isPublic", label: "Public", type: "switch", hint: "Off keeps it out of the public pricing page entirely." },
];

// The list stays narrow — the full record is long, and a table that shows
// everything shows nothing.
const COLUMNS = ["name", "type", "usersLabel", "cost", "includes", "isPublic"];

export default function PackagesPage() {
  return (
    <>
      <PageHeader
        title="Packages"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Packages" }]}
      />
      <CatalogEditor
        kind="packages" title="Packages" fields={FIELDS}
        columns={COLUMNS}
        settings={{ title: "Pricing settings", sub: "Applies to every package on the public pricing page." }}
      />
    </>
  );
}
