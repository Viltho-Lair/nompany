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
  { key: "maxEmployees", label: "Max employees", type: "number", hint: "0 means no upper limit." },
  { key: "cost", label: "Cost", type: "number", prefix: "SAR " },
  { key: "durationMonths", label: "Duration (months)", type: "number", suffix: " mo" },
  { key: "isPublic", label: "Public", type: "switch" },
];

export default function PackagesPage() {
  return (
    <>
      <PageHeader
        title="Packages"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Packages" }]}
      />
      <CatalogEditor kind="packages" title="Packages" fields={FIELDS} />
    </>
  );
}
