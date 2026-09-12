# Quotations

The sixteenth department, 13/09/2026. `/<slug>/quotations`, with a dashboard and four screens:
**RFQs** (`quotations-rfq`), **Quotations** (`quotations-register`), **Live view**
(`quotations-live`, full screen) and **Settings** (`quotations-settings`). The screens are
`StudioTechnical` and `StudioTechnicalLive`; the services are `modules/technical`
(`technicalContext`, root `quotations`); the API is `api/studios/<slug>/technical/{quotations,rfqs}`.

**Why it is its own department — the owner, 13/09/2026:** *"a quotation is built on a technical
and engineering perspective, not through sales. It requires engineers to provide insights about
the proposed quotation to issue back to whoever needs it."* It had been split three ways: the
quotation builder under CRM & Sales, the RFQ queue, its live view and the numbering moved there
in code on 11/09 but still under Engineering & Documents in every existing studio, and the
presales dashboard at the Engineering & Documents root.

## How a quotation gets made

1. **Sales raises an RFQ** from a deal (ticket) in CRM & Sales. The deal moves Lead → Opportunity.
   Only Sales raises RFQs for now.
2. **The RFQ lands in RFQs, the intake desk** — the control unit that receives requests and
   directs them to quotation work. Everybody who can create quotations is told
   ("An RFQ is waiting to be quoted", linking here).
3. **The presales team accepts, assigns and converts it** into a quotation, or turns it down —
   which closes the deal as lost with the token `rfq-rejected`.
4. **The quotation is built in Quotations**, priced from the customer's agreed rates
   (`docs/functionality/pricing.md`), sent for approval, and locked once a client holds it.
5. **It goes back to the deal**, where Sales takes it forward. A quotation can also be raised
   internally, with no RFQ behind it.

## Nothing moved, and nobody's access changed

- **The records stay where they were filed.** RFQs under `engineering-docs-rfq`; quotations,
  generated documents, contracts, change orders and sales orders under `crm-sales-quotations`;
  numbering and live-view columns on `engineering-docs-settings`'s settings. Those four rows
  (with `engineering-docs-live`) are **filed-only sections** (`FILED_ONLY_SECTION_KEYS`,
  `keys.ts`): still seeded for every studio, still read by Sales, Projects, Inventory, Main and
  Reports, and left out of the sidebar, the Sections panel and the role library's department
  map. **Do not delete them** — nothing would fail and every quotation would vanish.
- **The rights keep their names** — `engineeringDocs.dashboard`, `engineeringDocs.rfq`,
  `crmSales.quotations`, `engineeringDocs.live`, `engineeringDocs.settings` — and are listed under
  **Quotations** on the Access screen. Every role that held them reaches the new screens.
- **It reaches every studio by itself.** `listSections` plants the new rows on the first read;
  no script runs.
- **Old addresses still open.** `engineering-docs-rfq`, `crm-sales-quotations`,
  `engineering-docs-live` and `engineering-docs-settings` are retired addresses
  (`shared/studioRoute.ts`) that resolve to the new screens — delivered RFQ notifications link to
  the old one.
- **A filed-only row is nobody's child** when deciding whether a heading shows
  (`childrenOf`, `resolve.ts`), so somebody holding only quotation rights sees Quotations and not
  CRM & Sales.

## Around it

- **On for every trade** (`UNIVERSAL_SECTION_KEYS`): every company prices what it sells.
- **Engineering & Documents is document control only** — the register, transmittals, RFIs,
  submittals, engineering BOM and the technical library — and its root has a dashboard of its own
  (`engineering-dashboard.md`, 13/09/2026) rather than the presales one.
- **Starter departments that price work** (Engineering & Design, Estimation & Proposals,
  Bids & Proposals, Sales & Presales and the like) list `quotations` in their `sectionKeys`, so a
  new studio's pre-built roles there start with the Quotations rights.
- **"Open quotation" links work.** `linkToQuotation` pointed at the CRM & Sales dashboard, which
  ignores `?quotation=`; it opens the register now.

## Not built yet

- **Only Sales raises an RFQ.** Tendering, Projects (variations) and Maintenance contracts cannot
  ask for a quotation.
- **The RFQ intake has no assignment rules or workload view** — whoever picks an RFQ up handles it.
- **No engineering review step** is recorded on a quotation before approval; the approval chain
  is the only sign-off.
- **Starter departments in studios that already exist are unchanged**: their `sectionKeys` were
  seeded before Quotations existed, so a library role added there later is confined without it
  until somebody adds Quotations to the department.
- **The marketing pricing page** still sells "Technical Approvals" as the `engineering-docs` module.
