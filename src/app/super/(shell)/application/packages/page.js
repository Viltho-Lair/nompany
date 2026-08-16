import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import CatalogEditor from "@/components/super/CatalogEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packages" };

// What a studio subscribes to, sized by headcount. Authored here; the public
// status is what decides whether a package is offered outside the console.
const FIELDS = [
  { key: "name", label: "Name", type: "text", placeholder: "Growth" },
  { key: "minEmployees", label: "Min employees", type: "number" },
  { key: "maxEmployees", label: "Max employees", type: "number", zeroLabel: "No limit", hint: "0 means no upper limit." },
  // The price is decided PER HEAD; the total follows from it and the band's
  // upper bound, so the total is shown rather than asked for.
  { key: "costPerEmployee", label: "Cost per employee", type: "number", prefix: "SAR ", hint: "Per user, per month." },
  {
    key: "cost", label: "Total cost", type: "computed", prefix: "SAR ",
    hint: "Cost per employee x max employees. With no upper limit, the per-employee rate stands alone.",
    compute: (d) => {
      const per = Number(d.costPerEmployee) || 0;
      const max = Number(d.maxEmployees) || 0;
      return `SAR ${(max > 0 ? per * max : per).toLocaleString()}`;
    },
  },
  { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo", zeroLabel: "Endless", hint: "0 means endless — the package never expires." },
  { key: "supportTicketsPerMonth", label: "Support tickets / month", type: "number", zeroLabel: "Unlimited", hint: "0 means unlimited." },
  { key: "color", label: "Colour", type: "color", hint: "Pick any colour, or start from one of the four." },
  { key: "isPublic", label: "Public", type: "switch" },
];

export default function PackagesPage() {
  return (
    <>
      <PageHeader
        title="Packages"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Packages" }]}
      />
      <CatalogEditor
        kind="packages" title="Packages" fields={FIELDS}
        settings={{ title: "Pricing settings", sub: "Applies to every package on the public pricing page." }}
      />
    </>
  );
}
