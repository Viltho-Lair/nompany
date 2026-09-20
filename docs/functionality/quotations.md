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

## Comparing two revisions

A second RFQ on the same deal opens a **revision** on a copy of the last quotation: it keeps
the number the client holds, steps `revision`, and both versions stay in the register under
one number with a Rev badge. So the versions were both there and nothing said what moved
between them — the client asked what changed and somebody read two documents side by side.

Opening a revision in the builder offers **Compare with Rev N** (absent on a first version).
It lists lines added, changed and removed, each with its amount before and after, the
sections renamed or added, a VAT rate that moved, and the two totals.

- **Matched by line id first**, because the copy keeps them (`cleanQuotationTables` writes
  `id` through): a re-worded line is one line re-worded, not one deleted and another added.
  A line typed in afresh falls back to the registered item it names, then to its description.
- **A line that moved to another SECTION has changed**, because which heading work sits under
  is part of what was quoted — asked of the table's id, never its title, or renaming a heading
  would report every line under it as having moved.
- **Amounts are net**, discount included, so a line can never disagree with the total below it.
- **"Nothing changed" is an answer.** A revision may exist for a date or a covering note, and
  the panel says so rather than showing an empty list.
- **No route and no permission key**: the register already holds every revision in full
  (`listQuotations` returns whole documents), so this is computed in the browser through
  `modules/technical/quotationDiff` — the same pure module `tests/quotation-diff-model.mjs`
  asserts. A reader who may open both documents may be told the difference between them.

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
- **Comparison is in the builder only.** Sales' own quotation viewer loads one document and is
  not offered it; showing it there means carrying the previous revision into that response.
- **Only against the revision immediately before.** There is no Rev 1 against Rev 3, and no
  comparison of two quotations that are not versions of one number.
- **Nothing is printed or exported from a comparison**, and nothing is sent to the client:
  what a client receives is the revision itself.
- **A revision records no reason.** What changed is derivable; WHY it changed is not, unless
  somebody wrote it in the document's comments.
