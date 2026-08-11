import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Pricing" };

const PLANS = [
  {
    name: "Starter",
    price: "$20",
    tagline: "For a single team finding its feet",
    features: ["Up to 10 seats", "One module", "5 GB storage", "Community support", "Standard reporting"],
    missing: ["Custom roles", "Priority support", "SSO"],
  },
  {
    name: "Growth",
    price: "$30",
    tagline: "For companies running several departments",
    features: ["Up to 40 seats", "Three modules", "50 GB storage", "Email support", "Advanced reporting", "Custom roles"],
    missing: ["Priority support", "SSO"],
    popular: true,
  },
  {
    name: "Scale",
    price: "$30",
    tagline: "For the whole operation, all modules on",
    features: ["Up to 120 seats", "All modules", "500 GB storage", "Priority support", "Advanced reporting", "Custom roles", "Audit log"],
    missing: ["SSO"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "For platforms with their own rules",
    features: ["Unlimited seats", "All modules", "Unlimited storage", "Dedicated manager", "SSO & SCIM", "Custom SLA", "On-prem option"],
    missing: [],
  },
];

const COMPARE = [
  { label: "Seats", values: ["10", "40", "120", "Unlimited"] },
  { label: "Modules", values: ["1", "3", "All", "All"] },
  { label: "Storage", values: ["5 GB", "50 GB", "500 GB", "Unlimited"] },
  { label: "Custom roles", values: [false, true, true, true] },
  { label: "Audit log", values: [false, false, true, true] },
  { label: "Priority support", values: [false, false, true, true] },
  { label: "SSO & SCIM", values: [false, false, false, true] },
  { label: "Custom SLA", values: [false, false, false, true] },
];

const FAQ = [
  { q: "Can a studio change plan mid-cycle?", a: "Yes. Upgrades apply immediately and the difference is prorated; downgrades take effect at the next renewal." },
  { q: "What counts as a seat?", a: "Any user who can sign in to the studio. Invited-but-unaccepted users don't count until they accept." },
  { q: "How is storage measured?", a: "Total size of uploaded media and generated exports held by the studio, measured daily." },
  { q: "Is there an annual discount?", a: "Annual billing saves 20% on every plan except Enterprise, which is quoted directly." },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Pricing"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Other" }, { label: "Pricing" }]}
      />

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold">Plans that grow with the studio</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--ad-muted-foreground)]">
          Every plan includes the full platform shell. What changes is how many people it carries, how many modules
          are switched on, and how quickly we answer the phone.
        </p>
        <div className="mt-5 inline-flex rounded-full border p-1" style={{ borderColor: "var(--ad-border)" }}>
          <button type="button" className="rounded-full px-4 py-1.5 text-xs font-medium" style={{ color: "var(--ad-muted-foreground)" }}>
            Monthly
          </button>
          <button type="button" className="rounded-full px-4 py-1.5 text-xs font-medium" style={{ backgroundColor: "var(--ad-primary)", color: "#fff" }}>
            Annual · save 20%
          </button>
        </div>
      </div>

      <Row className="mb-8">
        {PLANS.map((p) => (
          <Col key={p.name} span={3}>
            <Card
              className="relative h-full"
              style={p.popular ? { borderColor: "var(--ad-primary)" } : undefined}
            >
              {p.popular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="primary" solid>Most popular</Badge>
                </span>
              ) : null}
              <CardBody full className="flex h-full flex-col">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">{p.tagline}</p>
                <p className="mt-5 text-3xl font-semibold">{p.price}</p>
                <p className="text-xs text-[var(--ad-muted-foreground)]">
                  {p.price === "Custom" ? "talk to us" : "per user / month"}
                </p>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--ad-success)" }} />
                      <span>{f}</span>
                    </li>
                  ))}
                  {p.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-45">
                      <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`ad-btn mt-6 w-full ${p.popular ? "ad-btn-primary" : "ad-btn-outline"}`}
                >
                  {p.price === "Custom" ? "Contact sales" : `Choose ${p.name}`}
                </button>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mb-6">
        <CardHead title="Compare plans" />
        <div className="w-full overflow-x-auto">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Feature</th>
                {PLANS.map((p) => (
                  <th key={p.name} className="text-center">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.label}>
                  <td className="font-medium">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="text-center">
                      {typeof v === "boolean" ? (
                        v ? (
                          <Icon name="check" className="mx-auto h-4 w-4" style={{ color: "var(--ad-success)" }} />
                        ) : (
                          <Icon name="minus" className="mx-auto h-4 w-4 opacity-35" />
                        )
                      ) : (
                        <span className="text-[var(--ad-muted-foreground)]">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Row>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Frequently asked" />
            <CardBody>
              <ul className="divide-y" style={{ borderColor: "var(--ad-border)" }}>
                {FAQ.map((f) => (
                  <li key={f.q} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium">{f.q}</p>
                    <p className="mt-1.5 text-sm text-[var(--ad-muted-foreground)]">{f.a}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
        <Col span={5}>
          <Card
            className="h-full"
            style={{ backgroundImage: "linear-gradient(140deg, var(--ad-primary), color-mix(in srgb, var(--ad-primary) 60%, #000))" }}
          >
            <CardBody full className="flex h-full flex-col justify-center text-white">
              <Icon name="rocket" className="h-8 w-8" strokeWidth={1.5} />
              <h3 className="mt-4 text-xl font-semibold">Need something bespoke?</h3>
              <p className="mt-2 text-sm text-white/75">
                Enterprise studios get custom seat pools, single sign-on, a named manager and an SLA written around
                their operation.
              </p>
              <button
                type="button"
                className="ad-btn mt-6 self-start"
                style={{ backgroundColor: "#fff", color: "var(--ad-primary)" }}
              >
                Talk to sales <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
