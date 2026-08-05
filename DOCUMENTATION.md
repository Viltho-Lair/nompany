# Studio Documentation — progress & reference

**This file is the source of truth for the in-studio Documentation section.** When asked to update the documentation, use this file as the reference so you only **add/modify** the affected articles — never rewrite the whole guide.

- **Live at:** Studio → **Documentation** (`/studio/documentation`), access-controlled node `documentation` (+ `documentation-settings`).
- **Content module:** `src/lib/documentation.js` — `DOC_SECTIONS` (array of sections → `articles` → `body` blocks) and `imageSlots()`.
- **Screenshots:** admins upload at **Documentation → Settings**, tagging each image by **location (slot)** + description. New `{ type: "image", slot }` blocks auto-appear in that dropdown. Stored in the `docImages` collection.
- **Renderer:** `src/components/studio/DocumentationGuide.js` (guide) + `DocumentationSettings.js` (image manager).

## Block types (an article `body` is an ordered list)
| type | shape | renders as |
|---|---|---|
| `p` | `{ text }` | paragraph (supports `**bold**`) |
| `h` | `{ text }` | subheading inside an article |
| `steps` | `{ items: [text] }` | numbered steps (supports `**bold**`) |
| `table` | `{ headers: [], rows: [[]] }` | generic reference table |
| `fields` | `{ items: [{ name, required, auto, desc }] }` | required-vs-automatic field table |
| `note` | `{ text }` | highlighted callout |
| `image` | `{ slot, label }` | screenshot slot (filled via Settings; `slot` must be globally unique) |

## How to update the documentation
1. Read this file to find the section/article `key` that owns the behavior.
2. Edit that article's `body` in `src/lib/documentation.js` (add/modify blocks). To add a screenshot spot, add `{ type: "image", slot: "unique-slot", label: "…" }`.
3. Add a line to **Change log** below.
4. Verify locally, then `vercel deploy --prod --yes`.
5. Regenerate this file's index if sections/articles changed.

## Coverage
- **Sections:** 12 · **Articles:** 82 · **Image slots:** 71
- Every department documented at full depth: overview + permissions → each list's columns/filters → each form's field table (required vs automatic) → lifecycle/automation → all actions.

---

## Section & article index

### Overview `(overview)`
_How the departments connect end-to-end, and where each one hands work to the next._

- **The end-to-end workflow** `overview-pipeline` — _Studio_  ·  slots: `overview-pipeline`

### Sales `(sales)`
_Raise and manage client opportunities (tickets), request quotations from Technical, and submit client POs. Sales owns the ticket from first contact to Closed Won/Lost._

- **Where things live & who can see them** `sales-where` — _Sales_
- **The Tickets list** `sales-tickets-list` — _Sales → Tickets_  ·  slots: `sales-tickets-list`, `sales-filters`
- **Creating a new ticket** `sales-create-ticket` — _Sales → Tickets → + Create ticket_  ·  slots: `sales-create-ticket-popup`
- **The ticket page** `sales-ticket-page` — _Sales → Tickets → (click a row)_  ·  slots: `sales-ticket-page`
- **Ticket status — the automated lifecycle** `sales-status-lifecycle` — _Sales_
- **Requesting an RFQ from Technical** `sales-request-rfq` — _Sales → Tickets_  ·  slots: `sales-request-rfq`
- **Sending for approval & submitting the client PO** `sales-submit-po` — _Sales → Tickets → (open ticket)_  ·  slots: `sales-submit-po`
- **Clients & contacts** `sales-clients` — _Sales → Clients_  ·  slots: `sales-clients-list`, `sales-add-client`
- **Sales Settings** `sales-settings` — _Sales → Settings_

### Technical `(technical)`
_Turn Sales RFQs into priced quotations, build them in the full-screen builder, manage revisions, and hand finished quotations back for approval._

- **Where things live & who can see them** `technical-where` — _Technical_
- **Handling RFQs & converting to a quotation** `technical-rfq` — _Technical → RFQ_  ·  slots: `technical-rfq-list`, `technical-rfq-convert`
- **The Quotations list** `technical-quotations-list` — _Technical → Quotations_  ·  slots: `technical-quotations-list`
- **Creating & editing the quotation record** `technical-quotation-record` — _Technical → Quotations → + Create quotation / pencil_  ·  slots: `technical-create-quotation`
- **The quotation builder** `technical-builder` — _Technical → Quotations → Open_  ·  slots: `technical-builder`, `technical-builder-costbox`
- **Quotation status, revisions & approval** `technical-status-lifecycle` — _Technical_
- **Cover copy settings** `technical-settings` — _Technical → Settings_  ·  slots: `technical-settings`
- **Live view** `technical-live` — _Technical → Live view_  ·  slots: `technical-live`

### Tasks & Approvals `(tasks)`
_The shared hub where one department formally hands an action to another — quotation approvals, PO approvals, delivery releases, material returns and information updates. Each task type is routed to specific people set in Task settings._

- **How tasks work & who sees them** `tasks-where` — _Tasks_
- **The Tasks list** `tasks-list` — _Tasks_  ·  slots: `tasks-list`
- **Task settings — assigning people per authority** `tasks-settings` — _Tasks → Task settings (admin)_  ·  slots: `tasks-settings`
- **Quotation approval task** `tasks-approval` — _Tasks → (open approval task)_  ·  slots: `tasks-approval`
- **PO approval task (two-party: Management + Finance)** `tasks-po` — _Tasks → (open PO task)_  ·  slots: `tasks-po`
- **Delivery request task (Logistics)** `tasks-delivery` — _Tasks → (open delivery task)_  ·  slots: `tasks-delivery`
- **Material return task (Logistics)** `tasks-return` — _Tasks → (open return task)_  ·  slots: `tasks-return`
- **Information update task (HR)** `tasks-id-update` — _Tasks → (open information-update task)_  ·  slots: `tasks-id-update`
- **Permit request task (Permit team)** `tasks-permit-request` — _Tasks → (open permit-request task)_

### Projects `(projects)`
_Receive approved projects, plan them on a Gantt, track completion (KPIs, delivery, installation, programming, handover), manage deliveries, and run maintenance SLAs._

- **Where things live & who can see them** `projects-where` — _Projects_
- **The Projects dashboard** `projects-dashboard` — _Projects_  ·  slots: `projects-dashboard`
- **The Project list** `projects-list` — _Projects → Project list_  ·  slots: `projects-list`
- **Project fields (Create / Edit)** `projects-fields` — _Projects → open project → pencil_
- **The project page** `projects-detail` — _Projects → Project list → (open)_  ·  slots: `projects-detail`
- **Completion, stages & the Action buttons** `projects-completion` — _Projects → open project_  ·  slots: `projects-completion`
- **Installation & Programming tracking** `projects-install-program` — _Projects → open project → Installation / Programming_  ·  slots: `projects-install`
- **The project plan builder (Gantt)** `projects-plan` — _Projects → open project → Project Plan_  ·  slots: `projects-plan-builder`
- **SLA maintenance contracts** `projects-sla` — _Projects → SLA_  ·  slots: `projects-sla`
- **Projects Settings** `projects-settings` — _Projects → Settings_  ·  slots: `projects-settings`
- **Overtimes** `projects-overtime` — _Projects → Overtimes_  ·  slots: `projects-overtime`

### Inventory / Logistics `(inventory)`
_The catalogue and physical stock behind every quotation and project — registered items, vendors, serial-tracked stock, per-project sheets with serial booking, material orders, and the delivery/return lifecycle._

- **Where things live & who can see them** `inventory-where` — _Inventory_
- **Registered Items** `inventory-items` — _Inventory → Registered Items_  ·  slots: `inventory-add-item`
- **Vendors** `inventory-vendors` — _Inventory → Vendors_  ·  slots: `inventory-vendors`
- **Stock Management & serials** `inventory-stock` — _Inventory → Stock Management_  ·  slots: `inventory-add-stock`
- **Project Sheets & booking serials** `inventory-sheets` — _Inventory → Project Sheets_  ·  slots: `inventory-sheets`
- **Requesting a delivery** `inventory-delivery-request` — _Project → quotation (view) → Request delivery_  ·  slots: `inventory-request-delivery`
- **Delivery notes, statuses & returns** `inventory-deliveries` — _Tasks (Logistics) / Project → Material_  ·  slots: `inventory-deliveries`
- **Orders sub-sheet & tracking** `inventory-orders` — _Inventory → Project Sheets → Orders_  ·  slots: `inventory-orders`

### Finance `(finance)`
_Track every approved project’s PO and finance details, and keep per-user cash sheets with month/project spending analytics._

- **Where things live & who can see them** `finance-where` — _Finance_
- **The Finance projects list** `finance-projects` — _Finance_  ·  slots: `finance-projects`
- **Cash — structure** `finance-cash-overview` — _Finance → Cash_
- **Cash — Main analytics** `finance-cash-main` — _Finance → Cash → Main_  ·  slots: `finance-cash-main`
- **Cash — project drill-down** `finance-cash-drill` — _Finance → Cash → (project card)_  ·  slots: `finance-cash-drill`
- **A cash sheet (data entry)** `finance-cash-sheet` — _Finance → Cash → (sheet tab)_  ·  slots: `finance-cash-sheet`
- **Finance Settings — Cash categories** `finance-settings` — _Finance → Settings_  ·  slots: `finance-settings`

### Human Resources `(hr)`
_The people layer — the employee directory (with departments/positions/certifications), studio login accounts, department-based access control, and recruitment (careers & applications)._

- **Where things live & who can see them** `hr-where` — _Human Resources_
- **Employees & reference lists** `hr-employees` — _Human Resources → Employees_  ·  slots: `hr-employees`
- **The employee form (all fields)** `hr-employee-form` — _Human Resources → Employees → Add / edit_  ·  slots: `hr-add-employee`
- **Users (login accounts)** `hr-users` — _Human Resources → Users_  ·  slots: `hr-users`
- **Access Control** `hr-access` — _Company Website → Access Control_  ·  slots: `hr-access-tree`
- **Careers** `hr-careers` — _Human Resources → Careers_  ·  slots: `hr-careers`
- **Applications** `hr-applications` — _Human Resources → Applications_  ·  slots: `hr-applications`

### Operations `(operations)`
_Field operations: the weekly work calendar, document-expiry watch, permits and a locations directory, plus configurable working hours and live location tracking._

- **Where things live & who can see them** `operations-where` — _Operations_
- **The Work Calendar** `operations-calendar` — _Operations → Main_  ·  slots: `operations-calendar`
- **Document-expiry watch** `operations-expiry` — _Operations → Main_  ·  slots: `operations-expiry`
- **Employees & Permits sheets** `operations-employees-permits` — _Operations → (Employees / Permits tabs)_  ·  slots: `operations-permits`
- **Locations directory** `operations-locations` — _Operations → Locations tab_  ·  slots: `operations-locations`
- **Operations Settings** `operations-settings` — _Operations → Settings_  ·  slots: `operations-settings`
- **Live tracking** `operations-tracking` — _Operations → Tracking_  ·  slots: `operations-tracking`

### Notifications `(notifications)`
_Personal, targeted notifications — you're only notified when something is assigned to or awaiting you. Available to every signed-in user via the bell and the Notifications Center._

- **How notifications work** `notifications-how` — _Notifications_  ·  slots: `notifications-bell`
- **The Notifications Center** `notifications-center` — _Notifications_  ·  slots: `notifications-center`
- **Your notification settings** `notifications-settings` — _Notifications → Settings_  ·  slots: `notifications-settings-page`
- **Sidebar indicators & @mentions** `notifications-sidebar` — _Studio_  ·  slots: `notifications-mention`

### Live Chat `(chat)`
_Real-time chat between website visitors and studio users. Visitors pick Contact Sales or Contact Support; granted studio users answer. Chats are ephemeral (never stored) and End Chat downloads a PDF transcript._

- **The website chat widget (visitors)** `chat-visitor` — _Public site_  ·  slots: `chat-widget`
- **Answering chats (studio)** `chat-studio` — _Company Website → Live Chat_  ·  slots: `chat-studio`
- **Who receives which chats** `chat-access` — _Company Website → Access Control_

### General & Admin `(general)`
_The parts that sit outside a single department — the dashboard, your profile, company-wide settings, public website content, client reviews, and the header tools every user shares._

- **Dashboard & landing** `general-dashboard` — _Studio_  ·  slots: `general-dashboard`
- **Your profile** `general-profile` — _Studio → (avatar, top-right) → Profile_  ·  slots: `general-profile`
- **Main Website content** `general-company-info` — _Content → Main Website content_  ·  slots: `general-company-info`
- **Website Statistics (traffic)** `content-statistics` — _Content → Statistics_
- **Messages** `general-messages` — _Company Website → Messages_  ·  slots: `general-messages`
- **Public website content** `general-content` — _Company Website → Services / Previous Projects / Gallery_  ·  slots: `general-content`
- **Client Reviews** `general-reviews` — _Inbox → Client Reviews_  ·  slots: `general-reviews`
- **Header tools — Notifications, Sync, theme & language** `general-header-tools` — _Studio (top bar)_  ·  slots: `general-header-tools`


---

## Change log
_Newest first. One line per change; reference the affected article key(s)._
- 2026-08-05 — Resend email integration: added a generic, reusable email layer (`lib/email.js` sends via Resend's REST API, fails soft when `RESEND_API_KEY` is unset; `lib/emailTemplates.js` holds branded templates). First use: a successful **login** now fire-and-forgets a **"new sign-in" notification email** to the user's on-file address (resolved from their linked Employee record) with time/IP/device (`lib/loginNotify.js`, wired into `api/auth/login`). Env: set `RESEND_API_KEY` (and `RESEND_FROM` once a domain is verified) in Vercel. Docs: no article change (backend/infra).
- 2026-08-05 — Permit form fix: the **Add/Edit Permit** location no longer hard-requires a client that already has a saved location (most clients had none, so the save was blocked). When the picked client has no saved locations — or you choose **“+ Add a new location…”** — the form now takes an **inline location** (name + city-from-settings + link), saves the permit, and **upserts that location back onto the client** (reused next time + flows to projects). The permit **name** is (re)composed as “Client — Location” on both create and edit (edit previously dropped the client/location fields entirely). Docs: updated operations-employees-permits.
- 2026-08-05 — Contact positions, client locations & permits batch (A–G): **Sales → Settings** gained shared **Contact positions** and **Cities** lists (positions include a fixed **“For Permits”**). Sales tickets now carry a **Contact position** dropdown (pre-fills from a re-used contact; re-selecting updates the client) and a **Location** (name · city-from-settings · map link) saved to the client and **carried to the project** (`locationCity`). The **Clients** list shows the position as a **tag before the name** and a new **Location** column. The **Permits** Add form (Operations) replaces the free-text name with a **Client + saved Location** pick (composed name “Client — Location”, city used for matching) with a hyperlinked location icon. A project’s **Client → Permits** box adds a locked **permit contact** (pencil to edit; mirrored to the client’s contacts tagged **For Permits**), a **Type** (single/long), a long-permit **dropdown filtered by the project’s city**, and a **Request Permit** button (shown when the matched permit expires <7 days or none exists) that raises a new **Permit request** task to the **Permit** team configured in Task settings. Docs: added tasks-permit-request; updated sales-settings, sales-create-ticket, sales-ticket-page, sales-clients, operations-employees-permits, tasks-where, tasks-settings, projects-detail.
- 2026-08-05 — Main Website content + sync polish: **deduped** the content editor — each setting now lives in **exactly one container** (removed the fully-redundant **Footer** container and the About text duplicated in Brand; the footer still renders from Brand/Contact/Social). The editor is now full-height: **Section selection** + **Save changes** are **fixed** while only the **fields** area scrolls. **Auto-Sync** no longer calls `router.refresh()` — it refreshes live data purely in the **background** via the sync-event bus, so open forms/popups/print views are never interrupted (also removes the periodic page remount that caused list flicker). Docs: updated general-company-info, general-header-tools.
- 2026-08-05 — Overtime + Work-Calendar refinements: **Projects → Settings** gained a **Default overtime department** (pre-selects Add-OT's department filter). **Add overtime** now defaults **From** to just **outside working hours** (the base schedule's end for that day), keeps the **users** picker disabled until Date+From+To are set, and marks users **Busy** (disabled) when they're on a Work-Calendar task overlapping the OT window. **Operations → Settings** gained a **Show overtimes** toggle (overrides "only working hours"); the Work-Calendar **legend is now fixed** (recolour/rename only, no add/delete) with an always-present **Overtime** colour. The **Work Calendar** draws overtime as **OT** blocks (project + user on hover) in that colour when Show overtimes is on, and **Copy this day's roster** stays work-tasks-only. Docs: updated projects-overtime, projects-settings, operations-calendar, operations-settings.
- 2026-08-05 — Merged **Orders & Tracking into Project Sheets**: a selected project now has a **Main | Orders** sub-bar (Main = serial booking, Orders = the vendor-shortfall order view). **Send order request** now nets out already-ordered quantities (new **Ordered** column) and is **disabled once the full “More required” is on order**. **Requested orders** rows are clickable → a popup records a **Tracking number + note** (`PUT /api/material-orders/[id]`); the bottom-bar **Search** also matches tracking numbers, and a new **Tracking** tab (left of Search) lists every tracked order across projects. The standalone **Orders and Tracking** nav item/page was removed (`/studio/inventory/tracking` redirects to Project Sheets); material-orders API now gated by **inventory-sheets**. Docs: updated inventory-sheets, inventory-orders, inventory-delivery-request.
- 2026-08-05 — Content hub + analytics + Overtimes batch: renamed **Company Info → Main Website content** and moved it, **Client Reviews** and a new **Statistics** page under a new **Content** sidebar group (new access node `content-statistics`). The content editor is now a **documentation-style container list** (left = containers, right = fields); the old “Statistics” container was renamed **Homepage highlights**. New **Website Statistics**: public-site traffic (visitors, page visits, section clicks, chat opens + topic) tracked to Redis with **8-month auto-expiry**, shown as **bar charts** with 7d/7w/7m filters + a **CSV report** download (`/api/track` ingest, `/api/track/stats` read; `SiteTracker`, Nav + ChatWidget instrumented). New **Projects → Overtimes** (`projects-overtimes`): Main **Projects × Users** hours matrix (centered, totals) + **Add OT** (multi-user, department-filtered) + **Export PDF**, and a **List** sheet where each row edits/deletes. Fixed the **Client Reviews list “twitch”** — the generic collection manager reloaded on every 20 s `router.refresh()` (Auto-Sync); it now loads once per collection and refreshes silently on sync. Docs: added content-statistics, projects-overtime; updated general-company-info.
- 2026-08-05 — Delivery workflow: an **open delivery request** can be **edited** from the Quotation viewer — its item shows *Request open* → *Edit Request* on hover; a popup changes per-item quantity (0–outstanding, 0 removes), and **Confirm changes** sends a change-request on the same delivery task (notifies Logistics). Logistics **Approves/Rejects** it on the task (a *Requested quantity change* panel); approval applies the new quantities (all-zero cancels the request). Delivery notes in the project profile gained an **Export PDF** (jsPDF, Cash-sheet-styled: logo + navy header + items/serials + signature line) and a **Client's signature confirmed** checkbox that gates the **Delivered** button (stored on the delivery). Docs: updated inventory-delivery-request, inventory-deliveries.
- 2026-08-05 — Projects/Inventory/Finance batch: **completion Line Graph** now always anchors 0% at the leftmost point (undated milestones dropped) so it starts at 0 and rises in date order; project **Installation/Programming action buttons hide** when that scope was excluded on the sales ticket (Without Installation/Programming). **Vendors** gained repeatable **Item types & delivery time (weeks)**; **Registered Items** now pick a **Type of item** from the vendor's types (snapshotting deliveryWeeks). In the project **quotation viewer**, out-of-stock items show **Est. arrival** (order date + weeks) once an order request is sent. **Send order request** (Orders & Tracking) now confirms then raises a new **two-party Vendor PO approval task** to **Finance + Management** with an **Export PDF** (Cash-sheet-styled) of the aggregated items; when both approve the task is Done and the order is Approved. Docs: updated inventory-items, inventory-vendors, inventory-delivery-request, inventory-orders, projects-completion, tasks-where, tasks-settings; new notification kind material-awaiting.
- 2026-08-04 — Sales ticket rework: ticket **Estimated value** renamed **Client Budget** (manual reference) + new auto **Value** = latest completed quotation total incl VAT ("not yet quoted" until then), which now drives project size + deal value; each Tickets **row is a button** (eye/edit column removed); redesigned ticket page (Ticket info + Client card, then RFQ/Comments/Log); PO approval is now **two-party** (Management approves PO + PO number, Finance enters project number) with the **project frozen** (no edits/booking/orders/deliveries) until both are done, then ticket → Closed Won; Registered Items gained mandatory **Installation/Programming** scope flags; ticket requirements are now **per-service** (Without Installation/Programming; SLA none) feeding project completion via item flags minus exclusions (Delivery+Handover always); Work Calendar "Add Work Task" defaults to **tomorrow** + working-hours time and won't close on outside click, and **non-working days** are shaded; new **Sales → Settings** (gear) holds the **shared** Live view columns (per-user picker removed). Docs: added sales-settings; updated sales-where, sales-tickets-list, sales-create-ticket, sales-ticket-page, sales-submit-po, tasks-where, tasks-settings, tasks-po, inventory-items, operations-calendar.
- 2026-08-04 — Chat widget now follows the site theme (light/dark) + language (en/ar, RTL); before an agent accepts it shows a spinning "Waiting for a representative to connect", and "X has joined the chat" once accepted; outside working hours (Operations schedule, KSA time) it shows a request-received notice. Create-ticket "Deadline" renamed to "Submission deadline". Docs: updated chat-visitor, sales-create-ticket.
- 2026-08-04 — Quotation builder gained a per-item **Disc %** column (persisted; folds into unit/total); a **Completed** quotation can be permanently **locked** (view-only, no unlock) from the Quotations list, enforced server-side (PUT 403 when locked) and in the builder; @mention dropdown now opens **above** the comment field. Docs: updated technical-builder, technical-quotations-list, technical-status-lifecycle.
- 2026-08-04 — Live Chat (ephemeral, Redis + ~1s polling, no Socket.IO server): floating website widget (Contact Sales/Support, mandatory name/email/phone/company) chats with granted studio users; ring-all + first-accept-wins via new Access-Control node Live Chat (Receive Sales / Receive Support); chats never stored, End Chat auto-downloads a jsPDF transcript (logo + client header + messages). Also: project Location shown as a clickable location icon linking to a Maps URL (studio + public). Docs: added chat section; updated hr-access, projects-fields.
- 2026-08-04 — Notifications rework: replaced the section-scoped activity feed with PER-USER targeted notifications (notifications collection + lib/notify.js); personal bell + Notifications Center + per-user Settings; sidebar now shows a pulsing dot on a parent group and a numeric counter per item (removed badge-counts + update-counts); @mentions in ticket/quotation/project comments (limited to users with access); approval task marked Done when sent to Projects; new Projects → Settings holds the requirement weights (moved from Company Info). Docs: added notifications section; updated general-header-tools, general-company-info, projects-*, tasks-approval.

- 2026-08-04 — Task/approval rework: quotation approval now involves **Sales + Management only** (Finance removed); task visibility & per-department approval are driven by **Task settings** assignment (assignees own the task, live for existing tasks too); removed `approve-quotation` + `appoint` access actions. Docs updated: `tasks-where`, `tasks-settings`, `tasks-approval`, `hr-access`, `overview-pipeline`, `sales-submit-po`, `technical-status-lifecycle`.
- 2026-08-04 — Documentation section created and fully populated across all 9 parts (Sales → General & Admin).
