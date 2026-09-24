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

1. **Sales raises an RFQ** from a deal (ticket) in CRM & Sales — or the desk raises one against a
   ticket, for somebody holding both departments' rights. The deal moves Lead → Opportunity.
   **A closed deal is refused** (`deal-closed`) and is not offered in the desk's picker.
2. **The RFQ lands in RFQs, the intake desk** — the control unit that receives requests and
   directs them to quotation work. **Both groups are told** ("An RFQ is waiting to be quoted",
   linking here): whoever can build quotations (`crmSales.quotations.create`) and the desk's own
   staff (`engineeringDocs.rfq.edit` or `.convert`) — the owner, 24/09/2026. It went to the
   first group alone, so a desk clerk was never told.
3. **The desk reviews it (In-review) and converts it** into a quotation, or turns it down —
   which closes the deal as lost with the token `rfq-rejected`. There is no separate "accept"
   step; In-review is the only marker. **A decided request is final**: Converted or Rejected,
   `updateRfq` refuses it (`converted` / `rejected`), `convertRfq` refuses a Rejected one,
   and Converted cannot be typed. Converting a turned-down request used to produce a quotation
   for a deal already closed as lost.
4. **The quotation is built in Quotations**, priced from the customer's agreed rates
   (`docs/functionality/pricing.md`), sent for approval, and locked once a client holds it.
5. **It goes back to the deal**, where Sales takes it forward. A quotation can also be raised
   internally, with no RFQ behind it.

## Who handles a quotation

**The owner's rule, 24/09/2026:** whoever raises or converts a quotation handles it, and only
somebody holding `crmSales.quotations.assign` may name anybody else — in the New quotation
form, in the Convert dialog, or afterwards from the register's **Assign** (`PATCH
/technical/quotations` → `assignQuotation`). Both creating doors ask `chooseHandler`, so the
rule cannot hold at one and not the other. Assigning is not an edit: it skips the manage door
and needs no pricing right, a locked quotation is still assignable, and the person given it is
told (`quotation.assigned`). `updateQuotation` no longer writes `handledBy`.

**One answer for who has it.** A converted quotation's handler is read off its RFQ (`quotationHandler`), which is where the Sales ticket reads it too, so Assign writes the RFQ as well as the quotation; changing the handler on the desk (`updateRfq`) needs the Assign right like the register does. Reversing the read to the quotation first was tried and dropped the same day: the register and the ticket then named different people. **This also fixed a defect:** the New quotation form sent the chosen person as `handledBy` while the server read `handledByCollaboratorId`, so the register named the creator whoever was picked.

**Rollout:** a catch-up (`quotation-assign-2026-09-24`) gives `assign` to every existing role
holding `engineeringDocs.rfq.convert` — converting was where the handler was chosen — and the
sales archetype carries it beside `convert` for new studios. Catalogue +1 key.

## Closed, never deleted — and one right per button

**The owner, 24/09/2026: "a quotation can not be deleted but can be closed."** The `delete` verb
left `crmSales.quotations`, `removeQuotation` and the route's DELETE went with it, and
`close` arrived as an extra (`closeQuotation`, `PATCH action:"close"`). Closing needs a reason,
writes `status: "Closed"`, `locked`, `closedAt`, `closedByCollaboratorId`, `closedReason`, and
detaches nothing — the deal still records the quotation. **Closed is final**: `updateQuotation`
refuses everything on it (`quotation-closed`), unlock included. Closed counts as FINISHED, so a
Draft closed for a job that went away frees its ticket to ask again, and it is not an OFFER
(`isOpenOffer`, now the one answer for sales.ts and orders.ts). Deleting also let the newest
number be issued again, since numbering is highest-on-file; that door is shut with it. Rollout:
catch-up `quotation-close-2026-09-24` gives `close` to every role that held `delete`.

**Every button follows exactly the right the server asks** (the owner: the rights belong on the
Access screen under Quotations). The route sends one flag per button — `canRaiseRfq`,
`canEditRfq`, `canConvertRfq`, `canCreateQuotations`, `canEditQuotations`,
`canLockQuotations`, `canUnlockQuotations`, `canCloseQuotations`, `canAssignQuotations` —
replacing `canManage*` ("any create, edit or delete"). Server side to match: raising from the desk
needs the RFQs Create right alone (CRM & Sales' manage grant was demanded too); a request that
only locks or only unlocks needs that right alone (`isLockOnly`), not Edit beside it; and
converting, locking and unlocking skip the route's manage door. **A refusal names the missing
right** and where it is on the Access screen (`forbiddenFor`), where every one read "Raising an
RFQ needs Manage access to Sales".

**The dashboard right is enforced.** `dashboardViewable` built `<sectionKey>.dashboard.view`,
which for `quotations`, `crm-sales` and `field-service` is not a real key, and answered yes to
everybody; it reads the section's dashboard area from `SECTION_AREAS` now. The RFQ and quotation
lists travel only to a reader with a right that shows them (their screen's, or the dashboard's),
and the Raise dialog's tickets only to whoever may raise.

## What the register and the print read

- **Approval state travels with every row** (`approvalState` pending / rejected / approved, the
  approver's reason, steps signed). A turned-down approval used to read "Completed" again,
  indistinguishable from one never sent; Request approval is not offered while one is waiting.
- **A print reads the quotation as decided** (`quotationAsDecided`, modules/quality): status
  Approved when its approval is, and "Date completed" from `submittedAt`. The stored status of
  every quotation approved through Approvals is still Completed, so every one printed DRAFT.
- **Submit is refused with no described line** (`no-lines`) at the server, not only the button.
- **Quantities are never negative** (`cleanQuotationTables` clamps; the builder accepts no
  sign) and the builder holds VAT to 0–100 as the server does, so screen, stored total and
  print agree.
- **Numbering Start survives a save.** Settings filled Start from `nextNumber` ("Q-0005"), which
  saved back as 1; the route now sends each sequence's `start`.

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

- **Only a Sales ticket can be priced.** Tendering, Projects (variations) and Maintenance
  contracts cannot ask for a quotation.
- **The dashboard's figures are computed in the browser**, so whoever may open it still receives
  the RFQ and quotation lists they are drawn from. Figures computed on the server would end that.
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
