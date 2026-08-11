"use client";

import { useState } from "react";
import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

const STEPS = [
  { label: "Studio details", icon: "briefcase" },
  { label: "Plan & seats", icon: "tag" },
  { label: "Owner account", icon: "user" },
  { label: "Review", icon: "check" },
];

const PLANS = [
  { id: "starter", name: "Starter", price: "$20", seats: "up to 10 seats", note: "One module included" },
  { id: "growth", name: "Growth", price: "$30", seats: "up to 40 seats", note: "Three modules included" },
  { id: "scale", name: "Scale", price: "$30", seats: "up to 120 seats", note: "All modules, priority support" },
];

export default function WizardPage() {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState("growth");
  const last = STEPS.length - 1;

  return (
    <>
      <PageHeader
        title="Form Wizard"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Forms" }, { label: "Form Wizard" }]}
      />

      <Row>
        <Col span={9}>
          <Card>
            <CardHead title="Create a studio" sub="Four short steps — nothing is submitted from this preview" />
            <CardBody>
              {/* stepper */}
              <ol className="mb-8 flex items-center">
                {STEPS.map((s, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li key={s.label} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                          style={
                            done
                              ? { backgroundColor: "var(--ad-success)", color: "#fff" }
                              : active
                                ? { backgroundColor: "var(--ad-primary)", color: "#fff" }
                                : { backgroundColor: "var(--ad-muted)", color: "var(--ad-muted-foreground)" }
                          }
                        >
                          {done ? <Icon name="check" className="h-4 w-4" strokeWidth={2.4} /> : <Icon name={s.icon} className="h-4 w-4" />}
                        </span>
                        <span
                          className="hidden whitespace-nowrap text-xs font-medium sm:block"
                          style={{ color: active ? "var(--ad-foreground)" : "var(--ad-muted-foreground)" }}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < last ? (
                        <span
                          className="mx-3 mb-6 h-0.5 flex-1 rounded"
                          style={{ backgroundColor: i < step ? "var(--ad-success)" : "var(--ad-border)" }}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              {/* panels */}
              {step === 0 ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="ad-label" htmlFor="w-name">Studio name</label>
                    <input id="w-name" className="ad-input" defaultValue="Falcon Contracting" />
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-slug">Address slug</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3">
                        /
                      </span>
                      <input id="w-slug" className="ad-input ps-6" defaultValue="falcon" />
                    </div>
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-industry">Industry</label>
                    <select id="w-industry" className="ad-select" defaultValue="Construction">
                      <option>Construction</option>
                      <option>Logistics</option>
                      <option>Technology</option>
                      <option>Manufacturing</option>
                    </select>
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-country">Country</label>
                    <select id="w-country" className="ad-select" defaultValue="Saudi Arabia">
                      <option>Saudi Arabia</option>
                      <option>United Arab Emirates</option>
                      <option>Qatar</option>
                      <option>Kuwait</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ad-label" htmlFor="w-desc">Short description</label>
                    <textarea id="w-desc" className="ad-textarea" rows={3} placeholder="What does this studio do?" />
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {PLANS.map((p) => (
                      <label
                        key={p.id}
                        className="cursor-pointer rounded-xl border p-5 transition-colors"
                        style={
                          plan === p.id
                            ? { borderColor: "var(--ad-primary)", backgroundColor: "rgba(70,128,255,.06)" }
                            : { borderColor: "var(--ad-border)" }
                        }
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{p.name}</span>
                          <input
                            type="radio"
                            name="plan"
                            className="ad-check rounded-full"
                            checked={plan === p.id}
                            onChange={() => setPlan(p.id)}
                          />
                        </span>
                        <span className="mt-3 block text-2xl font-semibold">{p.price}</span>
                        <span className="block text-xs text-[var(--ad-muted-foreground)]">per user / month</span>
                        <span className="mt-3 block text-xs text-[var(--ad-muted-foreground)]">{p.seats}</span>
                        <span className="mt-1 block text-xs text-[var(--ad-muted-foreground)]">{p.note}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="ad-label" htmlFor="w-seats">Seats</label>
                      <input id="w-seats" type="number" className="ad-input" defaultValue={148} min={1} />
                    </div>
                    <div>
                      <label className="ad-label" htmlFor="w-cycle">Billing cycle</label>
                      <select id="w-cycle" className="ad-select" defaultValue="Annual">
                        <option>Monthly</option>
                        <option>Annual</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="ad-label" htmlFor="w-first">First name</label>
                    <input id="w-first" className="ad-input" defaultValue="Lina" />
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-last">Last name</label>
                    <input id="w-last" className="ad-input" defaultValue="Haddad" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ad-label" htmlFor="w-owner-email">Email</label>
                    <input id="w-owner-email" type="email" className="ad-input" defaultValue="lina@falcon.sa" />
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-phone">Phone</label>
                    <input id="w-phone" className="ad-input" defaultValue="+966 55 000 0000" />
                  </div>
                  <div>
                    <label className="ad-label" htmlFor="w-role">Role</label>
                    <select id="w-role" className="ad-select" defaultValue="Admin">
                      <option>Admin</option>
                      <option>Finance Leader</option>
                      <option>Technical Leader</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
                    <input type="checkbox" className="ad-check mt-0.5" defaultChecked />
                    Send an invitation email as soon as the studio is created
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-5">
                  <div className="rounded-xl border p-5" style={{ borderColor: "var(--ad-border)" }}>
                    <p className="text-sm font-semibold">Falcon Contracting</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">nompany.com/falcon · Construction · Saudi Arabia</p>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-[var(--ad-muted-foreground)]">Plan</dt>
                        <dd className="mt-0.5 font-medium">{PLANS.find((p) => p.id === plan).name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[var(--ad-muted-foreground)]">Seats</dt>
                        <dd className="mt-0.5 font-medium">148</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[var(--ad-muted-foreground)]">Billing</dt>
                        <dd className="mt-0.5 font-medium">Annual</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[var(--ad-muted-foreground)]">Owner</dt>
                        <dd className="mt-0.5 font-medium">Lina Haddad</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-[var(--ad-muted-foreground)]">Owner email</dt>
                        <dd className="mt-0.5 font-medium">lina@falcon.sa</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg p-4" style={{ backgroundColor: "var(--ad-muted)" }}>
                    <Icon name="info" className="h-4 w-4 shrink-0 text-[var(--ad-primary)]" />
                    <p className="text-xs text-[var(--ad-muted-foreground)]">
                      This wizard is a design preview — nothing is written to the database.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-8 flex items-center justify-between border-t pt-6" style={{ borderColor: "var(--ad-border)" }}>
                <button
                  type="button"
                  className="ad-btn ad-btn-outline"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <Icon name="arrowLeft" className="h-4 w-4" /> Back
                </button>
                <span className="text-xs text-[var(--ad-muted-foreground)]">Step {step + 1} of {STEPS.length}</span>
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={() => setStep((s) => Math.min(last, s + 1))}
                  disabled={step === last}
                >
                  {step === last - 1 ? "Review" : "Continue"} <Icon name="arrowRight" className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={3}>
          <Card className="h-full">
            <CardHead title="Progress" />
            <CardBody>
              <ul className="space-y-4">
                {STEPS.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={
                        i < step
                          ? { backgroundColor: "rgba(44,168,127,.16)", color: "var(--ad-success)" }
                          : i === step
                            ? { backgroundColor: "rgba(70,128,255,.14)", color: "var(--ad-primary)" }
                            : { backgroundColor: "var(--ad-muted)", color: "var(--ad-muted-foreground)" }
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{s.label}</span>
                    {i < step ? <Badge tone="success">Done</Badge> : i === step ? <Badge tone="primary">Now</Badge> : null}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
