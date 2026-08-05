// Documentation content — the single source of truth for the in-studio guide
// (Documentation section) AND the image-slot list offered in Documentation →
// Settings. Client-safe: no server imports.
//
// Each SECTION is a department. Each ARTICLE is a step-by-step guide. An article
// body is an ordered list of BLOCKS the renderer understands:
//   { type: "p",     text }                      — paragraph (supports **bold**)
//   { type: "steps", items: [text, …] }          — numbered steps (supports **bold**)
//   { type: "fields",items: [{ name, required, auto, desc }] } — a field reference table
//   { type: "note",  text }                       — highlighted callout
//   { type: "image", slot, label }               — an image placeholder; admins fill it
//                                                   in Documentation → Settings by `slot`.
// `slot` values MUST be globally unique — they are the stable keys the settings
// screen assigns uploaded screenshots to.

export const DOC_SECTIONS = [
  {
    key: "overview",
    label: "Overview",
    icon: "dashboard",
    intro: "How the departments connect end-to-end, and where each one hands work to the next.",
    articles: [
      {
        key: "overview-pipeline",
        title: "The end-to-end workflow",
        location: "Studio",
        body: [
          { type: "p", text: "MegaTech Studio is one connected pipeline. A single opportunity flows across departments, and each stage hands the next department exactly what it needs — nothing is retyped." },
          { type: "steps", items: [
            "**Sales** raises a **ticket** for a client opportunity and requests an **RFQ** from Technical.",
            "**Technical** turns the RFQ into a **quotation** (priced from Registered Items) and marks it **Completed**.",
            "The quotation is **sent for approval** — a Tasks approval goes to the assigned **Sales** and **Management** people.",
            "Once approved, Sales **submits the client PO**; **Management** approves it and **Finance issues the project number**.",
            "A **project** is created automatically and lands in the **Projects** list, where a project manager plans and tracks it.",
            "**Inventory / Logistics** books serials from stock onto the project sheet and fulfils **delivery requests**.",
            "**Finance** tracks project spend and cash; **Operations** covers scheduling, permits and live tracking; **HR** owns people, logins and access.",
          ] },
          { type: "note", text: "Access to every section is controlled per department in Company Website → Access Control. You only see the sections your department is granted." },
          { type: "image", slot: "overview-pipeline", label: "Pipeline diagram (Sales → Technical → Approval → Projects → Logistics → Finance)" },
        ],
      },
    ],
  },

  {
    key: "sales",
    label: "Sales",
    icon: "clients",
    intro: "Raise and manage client opportunities (tickets), request quotations from Technical, and submit client POs. Sales owns the ticket from first contact to Closed Won/Lost.",
    articles: [
      {
        key: "sales-where",
        title: "Where things live & who can see them",
        location: "Sales",
        body: [
          { type: "p", text: "The **Sales** group in the sidebar has four pages:" },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["Tickets", "Sales → Tickets", "The pipeline — every opportunity as a row you can filter, sort and open."],
            ["Clients", "Sales → Clients", "The client directory and their contacts (feeds ticket auto-suggest)."],
            ["Live view", "Sales → Live view", "A read-only live board of Sales activity."],
            ["Settings", "Sales → Settings", "Sales section options — currently the shared Live view columns."],
          ] },
          { type: "h", text: "Visibility & permissions" },
          { type: "table", headers: ["Ability", "Who has it"], rows: [
            ["See **all** tickets/clients", "Admin, or a user with **Sales + Leader**. Everyone else sees only tickets they created or are assigned to."],
            ["Create / edit a ticket", "Admin, anyone with the **Sales** tag, or the ticket’s creator."],
            ["Change **Urgency**", "Admin or **Sales + Leader** only (everyone else sees it read-only)."],
            ["Request an RFQ", "Anyone who can edit the ticket, while its status is **Lead** or **Opportunity**."],
          ] },
          { type: "note", text: "The list header tells you which mode you’re in: “Showing your tickets” vs. “Showing tickets from every user (you have the Leader tag).”" },
        ],
      },
      {
        key: "sales-tickets-list",
        title: "The Tickets list",
        location: "Sales → Tickets",
        body: [
          { type: "p", text: "The tickets table is your pipeline. It **auto-refreshes every 15 seconds**, sorts newest-first, and highlights **unresolved** rows (an early-stage ticket not yet pushed to Technical) with an amber left stripe." },
          { type: "image", slot: "sales-tickets-list", label: "The Tickets list with toolbar" },
          { type: "h", text: "Toolbar" },
          { type: "table", headers: ["Control", "What it does"], rows: [
            ["Search box", "Filters as you type across **title, client, reference and description**."],
            ["Filters", "Opens the filter panel (below). The button shows the number of active filters and turns blue when any are set."],
            ["Columns", "Opens a picker to show/hide columns. Your choice is **saved per user**."],
            ["+ Create ticket", "Opens the Create ticket popup (see next article)."],
          ] },
          { type: "h", text: "Filters (all combine; saved per user)" },
          { type: "table", headers: ["Filter", "Type"], rows: [
            ["Client", "Text “contains”."],
            ["Status", "Any, or one of the ticket statuses."],
            ["Urgency", "Any / Low / Normal / High / Critical."],
            ["Probability (%)", "Min–max range."],
            ["Value (SAR)", "Min–max range."],
            ["Created", "Date from–to."],
            ["Deadline", "Date from–to."],
            ["Updated", "Date from–to."],
            ["Clear all filters", "Resets every filter."],
          ] },
          { type: "image", slot: "sales-filters", label: "Filters panel" },
          { type: "h", text: "Columns" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Created", "Date the ticket was raised."],
            ["Title", "Ticket title + reference; a red badge counts unseen updates."],
            ["Client", "Client name."],
            ["Owner", "Assigned user (or creator)."],
            ["Value", "Auto value in SAR — the latest completed quotation total (incl. VAT); blank until quoted."],
            ["Deadline", "Client deadline."],
            ["Status", "Current status (colour-coded)."],
            ["Urgency", "Low / Normal / High / Critical badge."],
            ["RFQ", "RFQ state — a **Request RFQ** button, or the live Technical status (e.g. “In-progress with …”, “Completed by …”), plus **+ another RFQ** when the last one is done."],
            ["Updated", "Last change date."],
            ["Prob.", "Win probability %."],
          ] },
          { type: "note", text: "Each **row is a button** — click anywhere on it to open the ticket page. (There is no separate eye/edit action column; editing is done on the ticket page.)" },
        ],
      },
      {
        key: "sales-create-ticket",
        title: "Creating a new ticket",
        location: "Sales → Tickets → + Create ticket",
        body: [
          { type: "p", text: "A **ticket** is the record of a client opportunity and the start of the whole workflow — every RFQ, quotation and project links back to it." },
          { type: "steps", items: [
            "Go to **Sales → Tickets** and click **“+ Create ticket”**. The popup opens.",
            "Enter a **Title** for the opportunity.",
            "In **Client**, start typing: pick an existing client from the suggestions, **or** type a new name and press the **+** to lock it in as a new client. Typing a name that already exists is blocked — pick it from the list instead.",
            "Optionally add a **Contact name** — for an existing client, picking a saved contact auto-fills its **email**, **phone** and **position** (all still editable). Choose the contact’s **Position** from the dropdown (the list is managed in **Sales → Settings**). Re-selecting a different position updates it on the client’s contact.",
            "Optionally record a **Location** — a location **Name**, a **City** (dropdown, managed in Sales → Settings) and a map **Link**. It’s saved to the client and carried onto the project.",
            "Optionally enter a **Client Budget (SAR)** — a reference figure from the client — and set the **Submission deadline**.",
            "Choose **Type of industry** (or “Other” and type your own), and select one or more **Type of services** (chips from the Services catalogue).",
            "For each selected non-SLA service, tick **Without Installation** and/or **Without Programming** to drop that scope; drag the **Probability** slider (0–100%), and write a **Description**.",
            "Click **Save**. The ticket appears in the list with an auto-generated reference.",
          ] },
          { type: "image", slot: "sales-create-ticket-popup", label: "Create ticket popup" },
          { type: "h", text: "Every field — required vs. automatic" },
          { type: "fields", items: [
            { name: "Title", required: true, auto: false, desc: "Name of the opportunity." },
            { name: "Client", required: true, auto: false, desc: "Existing (picked) or a new client name. Duplicate new names are blocked." },
            { name: "Contact name", required: false, auto: false, desc: "Auto-suggests from the picked client’s contacts." },
            { name: "Contact position", required: false, auto: false, desc: "Dropdown from Sales → Settings. Pre-fills from the saved contact; re-selecting updates the client’s contact." },
            { name: "Contact email", required: false, auto: false, desc: "Auto-filled when you pick a saved contact; editable." },
            { name: "Contact phone", required: false, auto: false, desc: "Auto-filled when you pick a saved contact; editable." },
            { name: "Location (name / city / link)", required: false, auto: false, desc: "City is a dropdown from Sales → Settings. Saved to the client’s Location list and carried to the project." },
            { name: "Client Budget (SAR)", required: false, auto: false, desc: "Optional reference figure from the client. Does NOT drive project size." },
            { name: "Submission deadline", required: true, auto: false, desc: "Client submission deadline (dd/mm/yyyy)." },
            { name: "Type of industry", required: true, auto: false, desc: "Pick from the list or choose “Other” and type it." },
            { name: "Type of services", required: true, auto: false, desc: "One or more services — at least one is required." },
            { name: "Requirements per service", required: false, auto: false, desc: "Per non-SLA service, optionally tick Without Installation / Without Programming. Delivery + Handover always apply; Installation/Programming follow the item scope minus these exclusions. SLA services carry none." },
            { name: "Probability", required: false, auto: false, desc: "0–100% win likelihood (slider + number)." },
            { name: "Description", required: false, auto: false, desc: "Free text." },
            { name: "Value", required: false, auto: true, desc: "Set automatically from the latest completed quotation (total incl. VAT). Drives project size & deal value. Shows “not yet quoted” until then." },
            { name: "Owner", required: false, auto: true, desc: "Set automatically to you (read-only)." },
            { name: "Project size", required: false, auto: true, desc: "Derived from the auto Value: ≤1M Small · ≤5M Medium · >5M Large." },
            { name: "Status", required: false, auto: true, desc: "Not set here — starts at “Lead” and advances automatically." },
            { name: "Urgency", required: false, auto: true, desc: "Defaults to Normal; only a Leader can change it later." },
            { name: "Reference", required: false, auto: true, desc: "Generated on save as ClientSlug-YYYY-NN." },
          ] },
          { type: "note", text: "So: **Owner, Project size, Status, Urgency and Reference are updated automatically** — you don’t set them. Everything else in the “required” rows you must fill." },
        ],
      },
      {
        key: "sales-ticket-page",
        title: "The ticket page",
        location: "Sales → Tickets → (click a row)",
        body: [
          { type: "p", text: "Clicking a ticket **row** opens the full ticket page. The top-right holds the **workflow action buttons**; below is a two-column top row — the **Ticket info** card (pencil to edit) on the left and a **Client** card (logo, name, contact person, number, email) on the right — followed by the RFQ requests table, comments and the activity log." },
          { type: "image", slot: "sales-ticket-page", label: "Ticket page — header actions + data card" },
          { type: "h", text: "Header action buttons (appear as the ticket progresses)" },
          { type: "table", headers: ["Button / state", "Meaning"], rows: [
            ["Request RFQ", "Sends an RFQ to Technical. Greys to “RFQ in progress” while a quotation is being built."],
            ["Send for Approval", "Appears once a linked quotation is **Completed** — sends the approval task to the assigned Sales & Management people."],
            ["Cancel approval", "Shown while approval is pending. Cancelling triggers a 5-minute cooldown before you can send again."],
            ["Send for Approval (m:ss)", "Greyed countdown during the cooldown."],
            ["Approved", "Green pill once both required approvals are in."],
            ["Submit PO → PO Pending Approval → PO Approved", "The PO lifecycle after approval — see “Submitting the client PO.”"],
          ] },
          { type: "h", text: "Ticket info card fields" },
          { type: "p", text: "Client, Owner, Status, Contact name (with its **position** shown as a tag) / email / phone, **Location** (name · city with a map-link icon), **Client Budget** (manual reference) and **Value** (auto from the latest completed quotation — “Not yet quoted” until then), Deadline, Urgency, Industry, Probability, Updated, Services and Description. Click the **pencil** to edit (the edit form includes the Position dropdown and the Location group). **Status** becomes an editable dropdown of final statuses only **after** approval." },
          { type: "h", text: "Other sections on the page" },
          { type: "table", headers: ["Section", "What it shows / does"], rows: [
            ["RFQ requests", "One row per RFQ: reference (+ quotation number/revision), requested date, completed date, Technical status, and an **open (view-only)** link once the quotation is Completed."],
            ["Comments", "Threaded notes with author + timestamp. Type and press **Send** (or Ctrl/⌘+Enter)."],
            ["Log", "Automatic change history; entries you haven’t seen are outlined in red."],
          ] },
        ],
      },
      {
        key: "sales-status-lifecycle",
        title: "Ticket status — the automated lifecycle",
        location: "Sales",
        body: [
          { type: "p", text: "Status is **automated** up to approval, then Sales picks a final outcome. You never set it at creation." },
          { type: "table", headers: ["Stage", "How it’s set"], rows: [
            ["Lead", "Automatically on creation."],
            ["Opportunity", "Automatically once an RFQ is requested."],
            ["(after approval)", "Sales chooses a **final status** from the dropdown on the ticket page."],
          ] },
          { type: "h", text: "Final statuses (chosen after approval)" },
          { type: "p", text: "**Commit · Closed Won · Closed Lost · Cancelled by Client · On-Hold · Dropped by MTA.**" },
          { type: "note", text: "**Urgency** (Low/Normal/High/Critical) defaults to Normal and can only be changed afterwards by a Sales Leader. It is carried, read-only, onto any RFQ/quotation the ticket spawns." },
        ],
      },
      {
        key: "sales-request-rfq",
        title: "Requesting an RFQ from Technical",
        location: "Sales → Tickets",
        body: [
          { type: "p", text: "When an early-stage ticket (**Lead/Opportunity**) is ready for pricing, Sales asks Technical to prepare a quotation via an **RFQ (Request For Quotation)**." },
          { type: "steps", items: [
            "From the **Tickets** table (RFQ column) or the ticket page, click **“Request RFQ”** and confirm.",
            "Technical receives it in **Technical → RFQ** with a reference like `<ticket>-R1` (the next number for that ticket).",
            "The ticket moves to **Opportunity** and the RFQ column now shows the live Technical status.",
            "Track it in the ticket’s **RFQ requests** panel — Requested date, Completed date, Technical status, and a view-only link once the quotation is Completed.",
            "While a quotation is being built the button greys to **“RFQ in progress.”** After it’s Completed you can raise **“+ another RFQ”** for a revision.",
          ] },
          { type: "image", slot: "sales-request-rfq", label: "Ticket row with the Request RFQ button / RFQ column" },
        ],
      },
      {
        key: "sales-submit-po",
        title: "Sending for approval & submitting the client PO",
        location: "Sales → Tickets → (open ticket)",
        body: [
          { type: "p", text: "Once a linked quotation is **Completed**, the ticket page shows the approval → PO buttons in sequence." },
          { type: "steps", items: [
            "Click **Send for Approval** — this raises the approval **task** to the people assigned to **Sales** and **Management** in Task settings. Both must approve.",
            "If you need to pull it back, use **Cancel approval** (a 5-minute cooldown then applies).",
            "Once approved, the **Approved** pill appears and the **Submit PO** button unlocks.",
            "Click **Submit PO**, attach the client PO file (PDF or image, max 5 MB) and/or a note, then **Confirm**.",
            "The button becomes **PO Pending Approval** and a **two-party PO task** opens: **Management** approves the PO and enters the **PO number**, and **Finance** enters the **project number**. Both are required.",
            "While the PO is pending, the **project is frozen** — no project edits, serial booking, material orders or delivery requests are allowed. Once both parties are done the project unlocks, the button shows **PO Approved**, and the **ticket is marked Closed Won**.",
          ] },
          { type: "image", slot: "sales-submit-po", label: "Submit PO popup" },
          { type: "note", text: "The PO button only exists after approval. The two-party PO task itself is handled in **Tasks** — see the Tasks & Approvals section." },
        ],
      },
      {
        key: "sales-clients",
        title: "Clients & contacts",
        location: "Sales → Clients",
        body: [
          { type: "p", text: "Clients are created automatically the first time you raise a ticket for a new name, and you can also add them here directly. Their contacts feed the auto-suggest when creating tickets." },
          { type: "image", slot: "sales-clients-list", label: "Clients list" },
          { type: "h", text: "The list" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Name", "Client name."],
            ["Contact", "Each contact as [position] · name · email · phone. The **position tag** shows before the name."],
            ["Location", "Each saved location as name · city with a map-link icon (fed from sales tickets)."],
            ["Date added", "When the client was created."],
            ["Created by", "The user who added it."],
          ] },
          { type: "note", text: "Contacts tagged **“For Permits”** come from a project’s Client → Permits box (the permit contact) and appear here alongside the others." },
          { type: "p", text: "Use the search box to find by **name, email or phone**." },
          { type: "h", text: "Add client" },
          { type: "steps", items: [
            "Click **“+ Add client”**.",
            "Enter the **Name** (required), and optionally a **Contact email**, **Contact phone**, and a **Logo** (max 512 KB — shown on project pages).",
            "Click **Save**.",
          ] },
          { type: "image", slot: "sales-add-client", label: "Add client popup" },
        ],
      },
      {
        key: "sales-settings",
        title: "Sales Settings",
        location: "Sales → Settings",
        body: [
          { type: "p", text: "Options for the Sales section (opened via the **gear** in the Sales nav)." },
          { type: "h", text: "Live view columns (shared)" },
          { type: "p", text: "Choose which columns appear on the full-screen **Sales Live view**. Unlike the per-user Tickets-list column picker, this is a **shared** setting — one configuration that applies to **everyone**. Tick/untick columns, then **Save** (or **Reset to default**). The full-screen live view reads this selection." },
          { type: "h", text: "Contact positions" },
          { type: "p", text: "The list of **positions** a client’s contact can be registered as (e.g. Procurement, Site Engineer). These feed the **Position** dropdown on the sales-ticket contact. Type a position and press **+** to add it; click a chip’s **×** to remove it. **“For Permits”** is a built-in position (used by the project permit contact) and can’t be removed." },
          { type: "h", text: "Cities" },
          { type: "p", text: "The list of **cities** used by the ticket **Location** (and to match long permits by city). Add/remove them the same way as positions." },
          { type: "note", text: "Positions and cities are **shared** — every ticket-creating user sees them without needing Sales → Settings access. Changing the lists requires the **Sales → Settings** access node (manage). Save with **Save changes** at the bottom." },
        ],
      },
    ],
  },

  {
    key: "technical",
    label: "Technical",
    icon: "services",
    intro: "Turn Sales RFQs into priced quotations, build them in the full-screen builder, manage revisions, and hand finished quotations back for approval.",
    articles: [
      {
        key: "technical-where",
        title: "Where things live & who can see them",
        location: "Technical",
        body: [
          { type: "p", text: "The **Technical** group has four pages:" },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["RFQ", "Technical → RFQ", "Inbox of pricing requests from Sales; convert them into quotations."],
            ["Quotations", "Technical → Quotations", "Every quotation — filter, edit the record, and open the builder."],
            ["Settings", "Technical → Settings", "The Introduction/Summary cover copy printed on quotations, per building type."],
            ["Live view", "Technical → Live view", "A full-screen, read-only live board of quotations."],
          ] },
          { type: "h", text: "Visibility & permissions" },
          { type: "table", headers: ["Ability", "Who has it"], rows: [
            ["Edit an RFQ (assign, comment, convert)", "Admin or **Technical**. (Sales can create RFQs but can’t touch them afterwards.)"],
            ["See **all** quotations", "Admin, or **Technical + Leader**. A plain Technical user sees only quotations they created or handle."],
            ["Build / edit a quotation & see **cost** figures", "Admin, **Technical, Presales, Sales, or Management**. Everyone else gets the cost-free view."],
            ["Change a quotation’s status", "The cost-view roles above, or the quotation’s creator."],
          ] },
          { type: "note", text: "“Cost figures” = the top summary box (Total cost / selling / profit, IT&C %, Discount %) plus the Free / Margin / Unit / Total columns in the builder. Project & Logistics users open the same quotation but see it **without** any cost." },
        ],
      },
      {
        key: "technical-rfq",
        title: "Handling RFQs & converting to a quotation",
        location: "Technical → RFQ",
        body: [
          { type: "p", text: "The RFQ list is Technical’s inbox. It **auto-refreshes every 5 seconds**; a **New** RFQ gets an amber left stripe until you action it." },
          { type: "image", slot: "technical-rfq-list", label: "RFQ list" },
          { type: "h", text: "Columns" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Reference", "RFQ reference (e.g. <ticket>-R1)."],
            ["Client", "Client from the source ticket."],
            ["Urgency", "Carried read-only from the ticket (only a Sales Leader can set it)."],
            ["Description", "The request text (truncated; hover for full)."],
            ["Requested by", "The Sales user who raised it."],
            ["Status", "Editable dropdown — **New / In-review / Rejected** (Converted is set only by the Convert button)."],
            ["Received", "Date requested."],
            ["Actions", "**Convert →** button."],
          ] },
          { type: "h", text: "Converting to a quotation" },
          { type: "steps", items: [
            "Click **Convert →** on the RFQ row.",
            "Enter a **Quotation number** (required). If another RFQ from the **same ticket** was already converted, the number is **locked** and reused — several RFQs on one ticket share one quotation number (revisions).",
            "Choose **Handled by** (required) — a Technical staff member (admins are excluded from this list).",
            "Click **Convert**. A new quotation is created with its lead = the RFQ reference and the description copied over; the RFQ’s status becomes **Converted**.",
          ] },
          { type: "image", slot: "technical-rfq-convert", label: "Convert RFQ to Quotation dialog" },
        ],
      },
      {
        key: "technical-quotations-list",
        title: "The Quotations list",
        location: "Technical → Quotations",
        body: [
          { type: "p", text: "Every quotation as a row. **Auto-refreshes every 5 seconds**; a quotation still in its first status (In-progress) gets an amber stripe. Search by number, title or description; the same **Filters** and **Columns** pattern as Sales applies (saved per user)." },
          { type: "image", slot: "technical-quotations-list", label: "Quotations list" },
          { type: "h", text: "Filters" },
          { type: "table", headers: ["Filter", "Type"], rows: [
            ["Handled by", "Anyone, or a specific Technical user."],
            ["Project", "Title contains…"],
            ["Status", "Any / In-progress / On-hold / Completed / Dropped."],
            ["Urgency", "Any / Low / Normal / High / Critical."],
            ["Created from / to", "Date range."],
          ] },
          { type: "h", text: "Columns" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Number", "Quotation number, with an **Approved** badge and a **Rev N** badge when applicable."],
            ["Urgency", "Carried from the ticket (read-only)."],
            ["Description", "Truncated description."],
            ["Handled by", "Assigned Technical user."],
            ["From", "The Sales user who pushed the RFQ, or **MTA** if created directly here."],
            ["Latest comment", "Most recent comment (hover for full text/author/date)."],
            ["Created", "Creation date."],
            ["Status", "Editable dropdown (gated) — Completed is set only via the builder’s Done button."],
            ["Actions", "**Pencil** (edit record / comment), **Open** (launch the builder), and — on a **Completed** quotation — a **Lock** (permanently make it view-only)."],
          ] },
        ],
      },
      {
        key: "technical-quotation-record",
        title: "Creating & editing the quotation record",
        location: "Technical → Quotations → + Create quotation / pencil",
        body: [
          { type: "p", text: "Most quotations are born by converting an RFQ, but you can also create one directly. The record holds the number, handler and description; the priced content is built in the builder." },
          { type: "h", text: "Create quotation" },
          { type: "fields", items: [
            { name: "Number", required: true, auto: false, desc: "e.g. Q-2026-0001. Locked once assigned — it can’t be changed later." },
            { name: "Handled by", required: true, auto: false, desc: "A Technical staff member." },
            { name: "Description", required: true, auto: false, desc: "Free text." },
          ] },
          { type: "p", text: "**Editing** an existing record: the Number is **locked**; Client, Title, Urgency, Industry and Services are shown **read-only** (they come from Sales). You can change the Handler and Description, and add **comments** (appended and attributed to you). Creation date can’t be modified." },
          { type: "image", slot: "technical-create-quotation", label: "Create / edit quotation modal" },
        ],
      },
      {
        key: "technical-builder",
        title: "The quotation builder",
        location: "Technical → Quotations → Open",
        body: [
          { type: "p", text: "The builder is a full-screen editor. It **autosaves ~1 second after every edit** (the top bar shows “Saving… / All changes saved”); you can also press **Save** manually. Non-cost-view users open it **read-only**." },
          { type: "image", slot: "technical-builder", label: "Quotation builder — tables and rows" },
          { type: "h", text: "Top bar" },
          { type: "table", headers: ["Control", "What it does"], rows: [
            ["Back", "Returns to the quotations list."],
            ["Approved / Rev N badges", "Show approval state and revision number."],
            ["Save state dot", "Amber = saving, green = saved, red = save failed (retries on next change)."],
            ["Save", "Persists the sheet now."],
            ["Done", "Saves and marks the quotation **Completed** (with confirmation), then returns to the list. This is the **only** way to set Completed."],
          ] },
          { type: "h", text: "Cost box (cost-view roles only)" },
          { type: "table", headers: ["Field", "Meaning"], rows: [
            ["Total quantity / cost / selling / profit", "Live rollups across all tables."],
            ["IT&C %", "Installation, Testing & Commissioning uplift — shown as a SAR figure beside it."],
            ["Discount %", "0–100; shows the resulting discounted total."],
          ] },
          { type: "h", text: "Tables & item rows" },
          { type: "steps", items: [
            "Click **Add another table** to create a system table; give it a name (e.g. “CCTV System”). Delete a table with the trash icon.",
            "Click **Add item** to add a row, then type in the **Item** cell to search the **Registered Items** catalogue (searchable by name/model; an item can’t be used twice in the same table).",
            "**Model** auto-fills from the picked item. Set **Qty**. Cost-view users also set **Margin %** and can tick **Free** (shows as “Included”, zeroes the line).",
            "**Unit (SAR)** and **Total (SAR)** compute automatically (cost × margin); the table shows a **Subtotal**.",
            "Remove a row with the **×**.",
          ] },
          { type: "fields", items: [
            { name: "Item", required: true, auto: false, desc: "Picked from Registered Items (search)." },
            { name: "Model", required: false, auto: true, desc: "Filled from the chosen item." },
            { name: "Qty", required: true, auto: false, desc: "Quantity for the line." },
            { name: "Margin %", required: false, auto: false, desc: "Cost-view only. Selling = cost × (1 + margin%)." },
            { name: "Disc %", required: false, auto: false, desc: "Cost-view only. Per-item discount (0–100%) applied to that line's selling price." },
            { name: "Free", required: false, auto: false, desc: "Cost-view only. Marks the line “Included” at zero." },
            { name: "Unit / Total (SAR)", required: false, auto: true, desc: "Computed from cost + margin, less the item discount, × qty." },
          ] },
          { type: "h", text: "Preview & export" },
          { type: "p", text: "The **Preview** tab on the right edge slides out a live preview of the printable quotation (cover copy + tables). From there you can **export** the document. VAT is applied at 15%." },
          { type: "image", slot: "technical-builder-costbox", label: "Builder cost box + preview drawer" },
        ],
      },
      {
        key: "technical-status-lifecycle",
        title: "Quotation status, revisions & approval",
        location: "Technical",
        body: [
          { type: "table", headers: ["Status", "How it’s set"], rows: [
            ["In-progress", "Default on creation (amber-striped in the list)."],
            ["On-hold / Dropped", "Chosen manually from the status dropdown."],
            ["Completed", "Only via the builder’s **Done** button — never picked manually."],
          ] },
          { type: "p", text: "**Revisions:** multiple RFQs on the same ticket share one quotation **number**; each carries a **Rev N** badge. **Approved** appears once the approval task is signed off." },
          { type: "note", text: "**Locking:** a **Completed** quotation can be permanently **locked** from the Quotations list (lock icon). A locked quotation is **view-only** — the status, edits and the builder are all frozen, and it shows a **Locked** badge. There is no unlock." },
          { type: "h", text: "Sending for approval" },
          { type: "p", text: "A **Completed** quotation is sent for approval from its **Sales ticket** (Send for Approval), which raises the approval task to the assigned Sales & Management people. See **Sales → Sending for approval** and **Tasks & Approvals** for the full flow." },
        ],
      },
      {
        key: "technical-settings",
        title: "Cover copy settings",
        location: "Technical → Settings",
        body: [
          { type: "p", text: "Controls the **Introduction** and **Summary** printed on the quotation cover, per **building type** (Residential vs Commercial — derived from the ticket’s industry)." },
          { type: "steps", items: [
            "Open **Technical → Settings**.",
            "For each building type, edit the **Introduction** and **Summary**. Leave a field blank to use the built-in default wording.",
            "Click **Save changes**. (Editable by a Technical Leader/admin.)",
          ] },
          { type: "image", slot: "technical-settings", label: "Quotation cover copy settings" },
        ],
      },
      {
        key: "technical-live",
        title: "Live view",
        location: "Technical → Live view",
        body: [
          { type: "p", text: "A full-screen, read-only live board of quotations that refreshes on its own — handy for a wall display. Use **Change columns** to choose what’s shown (saved per user)." },
          { type: "image", slot: "technical-live", label: "Technical live view" },
        ],
      },
    ],
  },

  {
    key: "tasks",
    label: "Tasks & Approvals",
    icon: "checkDouble",
    intro: "The shared hub where one department formally hands an action to another — quotation approvals, PO approvals, delivery releases, material returns and information updates. Each task type is routed to specific people set in Task settings.",
    articles: [
      {
        key: "tasks-where",
        title: "How tasks work & who sees them",
        location: "Tasks",
        body: [
          { type: "p", text: "The **Tasks** page lists new and pending tasks assigned to you (it **auto-refreshes every 5 seconds**). Tasks are created automatically by the workflow — you don’t raise them by hand (manual creation is “coming soon”). There are seven types:" },
          { type: "table", headers: ["Task type", "Raised when…", "Acted on by"], rows: [
            ["Quotation approval", "Sales clicks **Send for Approval** on a completed quotation.", "The people assigned to Sales & Management in Task settings."],
            ["PO approval", "Sales **Submits the PO**.", "**Two-party**: Management (approves PO + PO number) **and** Finance (project number)."],
            ["Vendor PO approval", "**Send order request** in Orders & Tracking.", "**Two-party**: Finance **and** Management both approve."],
            ["Delivery request", "A project requests material from its project sheet.", "Logistics."],
            ["Material return", "Material is returned on a delivery.", "Logistics."],
            ["Information update", "An employee changes their ID image and requests an update.", "HR."],
            ["Permit request", "A project’s Client → Permits box needs a permit (long permit expiring <7 days, or none for the city).", "The **Permit** team set in Task settings."],
          ] },
          { type: "h", text: "Who can see & own a task" },
          { type: "p", text: "Visibility is driven by **Task settings**: whoever is assigned to a task type **owns** every task of that type — they see it and can act on it as their own, and this applies to **existing** tasks the moment they’re appointed (assignments are resolved live, not frozen when the task was created)." },
          { type: "table", headers: ["Rule", "Detail"], rows: [
            ["Assigned person", "Anyone assigned to the task’s type in Task settings — sees and manages it."],
            ["Admin", "Sees every task."],
            ["Creator", "Whoever raised it."],
            ["Department leader", "A leader of one of the task’s departments still sees approval tasks (fallback)."],
          ] },
          { type: "note", text: "Task approval is **no longer an Access-Control permission** — it is granted purely by assignment in Task settings. (The old “Approve quotation” / “Appoint tasks” access toggles were removed.) The **Task settings** and **Create task** buttons appear for **admins** only." },
        ],
      },
      {
        key: "tasks-list",
        title: "The Tasks list",
        location: "Tasks",
        body: [
          { type: "image", slot: "tasks-list", label: "Tasks list" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Task", "The task name + client."],
            ["Status", "**Pending** (amber), **Approved**, **Sent to Projects**, or **Done** (green)."],
            ["Date created", "When the task was raised."],
            ["Actions", "**Open** icon → the task page."],
          ] },
        ],
      },
      {
        key: "tasks-settings",
        title: "Task settings — assigning people per authority",
        location: "Tasks → Task settings (admin)",
        body: [
          { type: "p", text: "Every task type is handled by specific people. Because some tasks span several authorities at once, each authority gets **its own people picker** — so you assign exactly who acts from each group." },
          { type: "steps", items: [
            "In **Tasks**, click **“Task settings”** (admin only).",
            "For each task type, open the per-authority dropdown(s) and tick the people who act. A picker lists only that department’s staff who have a login.",
            "Click **Save**.",
          ] },
          { type: "h", text: "Which authorities each task type shows" },
          { type: "table", headers: ["Task type", "Authority pickers"], rows: [
            ["Quotation approval", "Sales · Management"],
            ["PO approval", "Management · Finance"],
            ["Vendor PO approval", "Finance · Management"],
            ["Delivery request", "Logistics"],
            ["Material return", "Logistics"],
            ["Information update", "HR"],
            ["Permit request", "Permit"],
          ] },
          { type: "note", text: "Selections are stored per authority and combined into each task’s assignee list. Existing assignments migrate automatically the first time you open the new settings. (Uploading is not involved here — this only assigns people.) The **Permit** authority maps to a department coded/named “Permit” — create or rename one so its staff appear in the picker." },
          { type: "image", slot: "tasks-settings", label: "Task settings — one dropdown per authority" },
        ],
      },
      {
        key: "tasks-approval",
        title: "Quotation approval task",
        location: "Tasks → (open approval task)",
        body: [
          { type: "p", text: "The approval task is the gate between a finished quotation and a live project. It has four parts, top to bottom:" },
          { type: "steps", items: [
            "**Details** — Client, Project name, Quotation (opens the builder), Handled-by (Technical & Sales), and Contact.",
            "**Project manager** — the assignee (or a Leader) picks the PM from a dropdown of users who can reach the **Projects** section. This is **required before Management can approve**.",
            "**Approvals** — one card each for **Sales** and **Management**. Only the person assigned to that department in Task settings (or admin) can **Approve as …** — the Sales assignee approves for Sales, the Management assignee for Management, never each other’s. Management’s button stays blocked until a PM is assigned.",
            "**Send to Projects** — enabled once **both** Sales and Management have approved; an assignee (or Sales/Management leader) clicks it to **create the project** (irreversible). The approval task is then marked **Done** (it leaves the open queue) and the card shows **Open project**.",
          ] },
          { type: "image", slot: "tasks-approval", label: "Approval task — approvals + project manager + send to projects" },
        ],
      },
      {
        key: "tasks-po",
        title: "PO approval task (two-party: Management + Finance)",
        location: "Tasks → (open PO task)",
        body: [
          { type: "p", text: "Raised when Sales submits the client PO. Shows the Client, Project, linked Quotation, the PO **Description**, and a link to **view the submitted PO file**. Approval is **two-party** — Management and Finance each complete their own panel." },
          { type: "steps", items: [
            "**Management** (admin, Management, or the Management assignee) reviews the PO — optionally **Revise the approved quotation** via the builder link — enters the **PO Number** and clicks **Approve PO**.",
            "**Finance** (admin, Finance, or the Finance assignee) enters the **Project Number** and clicks **Save project number**.",
            "Once **both** panels are done the project is unlocked (its numbers stamped on it) and the **ticket is marked Closed Won**. Until then the project stays frozen.",
          ] },
          { type: "note", text: "Either party can go first; the panel for the party who’s already done turns green with who did it and when." },
          { type: "image", slot: "tasks-po", label: "PO approval task" },
        ],
      },
      {
        key: "tasks-delivery",
        title: "Delivery request task (Logistics)",
        location: "Tasks → (open delivery task)",
        body: [
          { type: "p", text: "Logistics releases material for a project. The task lists the requested items with a **Serials booked** count (available/qty) per item." },
          { type: "steps", items: [
            "If serials aren’t fully booked, go to **Inventory → Project Sheets**, open the project, and book serials for the requested items — the counts here update automatically.",
            "Once every serial is booked, click **Release material** (confirmation required). This **cannot be reversed** — it creates an **In-progress delivery note** under the quotation.",
            "Alternatively, **Reject request** deletes the task (recorded in the project log).",
            "When done, the card shows **Released by …** and the **delivery note reference**.",
          ] },
          { type: "note", text: "The Release button stays disabled until all serials are booked." },
          { type: "image", slot: "tasks-delivery", label: "Delivery request task with serial counts" },
        ],
      },
      {
        key: "tasks-return",
        title: "Material return task (Logistics)",
        location: "Tasks → (open return task)",
        body: [
          { type: "p", text: "Confirms material coming back from a delivery. Lists each returned item and its serial numbers." },
          { type: "steps", items: [
            "Review the returned items/serials.",
            "Click **Confirm receipt & reassign to stock** — the serials return to available stock and are un-booked from the project sheet.",
            "Or **Cancel request** to delete the task.",
          ] },
          { type: "image", slot: "tasks-return", label: "Material return task" },
        ],
      },
      {
        key: "tasks-id-update",
        title: "Information update task (HR)",
        location: "Tasks → (open information-update task)",
        body: [
          { type: "p", text: "Raised when an employee changes their ID image from their profile. Shows the employee, request date and current ID expiry." },
          { type: "steps", items: [
            "Enter the **New ID expiry** date (mandatory).",
            "Click **Confirm update** — the employee’s profile is updated. The card then records who updated it and the new expiry.",
          ] },
          { type: "image", slot: "tasks-id-update", label: "Information update task" },
        ],
      },
      {
        key: "tasks-permit-request",
        title: "Permit request task (Permit team)",
        location: "Tasks → (open permit-request task)",
        body: [
          { type: "p", text: "Raised from a project’s **Client → Permits** box when a long permit for the project’s city is **expiring (<7 days)** or **none exists**. Shows the client, project, city, location (with a map-link icon), the permit contact and any note." },
          { type: "steps", items: [
            "Review the details — the permit must be issued for the shown **city**.",
            "Optionally record a **note** (e.g. the new permit number).",
            "Click **Mark permit issued** — the task closes and the project log records it.",
          ] },
          { type: "note", text: "Only the assigned **Permit** team (or admin) can complete it. One open permit request per project at a time." },
        ],
      },
    ],
  },

  {
    key: "projects",
    label: "Projects",
    icon: "projects",
    intro: "Receive approved projects, plan them on a Gantt, track completion (KPIs, delivery, installation, programming, handover), manage deliveries, and run maintenance SLAs.",
    articles: [
      {
        key: "projects-where",
        title: "Where things live & who can see them",
        location: "Projects",
        body: [
          { type: "p", text: "The **Projects** group has three pages:" },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["Projects (dashboard)", "Projects", "A Kanban of projects by stage, with quick create."],
            ["Project list", "Projects → Project list", "The sortable table of projects; open one to run it."],
            ["SLA", "Projects → SLA", "Maintenance contracts with scheduled visits."],
            ["Settings", "Projects → Settings", "Project module configuration (requirement weights)."],
          ] },
          { type: "h", text: "Visibility & permissions" },
          { type: "table", headers: ["Ability", "Who has it"], rows: [
            ["See **all** projects", "Admin and **Leader**. A project manager sees only projects they own."],
            ["Delete a project", "**Admin only** (trash icon)."],
            ["Create a project / SLA", "Available from the dashboard and list — but projects are normally **created automatically** by the approval flow."],
          ] },
          { type: "note", text: "A project is born automatically when a quotation is approved and its PO/project number is issued (via Tasks). It arrives carrying the ticket’s client, services, requirements, value and project size. Every project also gets a 365-day complementary support period by default." },
        ],
      },
      {
        key: "projects-dashboard",
        title: "The Projects dashboard",
        location: "Projects",
        body: [
          { type: "p", text: "A **Kanban board** with a column per stage — **Received / In Progress / Completed** — showing each project as a card. From here you can **Create project** or **Create SLA contract**." },
          { type: "image", slot: "projects-dashboard", label: "Projects dashboard (Kanban by stage)" },
        ],
      },
      {
        key: "projects-list",
        title: "The Project list",
        location: "Projects → Project list",
        body: [
          { type: "p", text: "A sortable table. Click any **column header** to sort (toggles asc/desc); click a **row** to open the project." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Title", "Project title + thumbnail."],
            ["Location", "Project location."],
            ["Year", "Project year."],
            ["Category", "The service category."],
            ["Actions", "**Delete** (admin only)."],
          ] },
          { type: "image", slot: "projects-list", label: "Project list" },
        ],
      },
      {
        key: "projects-fields",
        title: "Project fields (Create / Edit)",
        location: "Projects → open project → pencil",
        body: [
          { type: "p", text: "Most fields arrive from the approved quotation; you edit them via the **pencil** on the Info card (or the Create project form). Full field list:" },
          { type: "fields", items: [
            { name: "Project number", required: false, auto: true, desc: "Issued by Finance on PO approval." },
            { name: "Stage", required: false, auto: true, desc: "Received / In Progress / Completed — advances automatically." },
            { name: "Client", required: false, auto: true, desc: "From Sales (the ticket’s client)." },
            { name: "Title (EN/AR)", required: false, auto: false, desc: "Project title." },
            { name: "Location (EN/AR)", required: false, auto: false, desc: "Site location." },
            { name: "Location link", required: false, auto: false, desc: "Google Maps URL — shown as a clickable location icon on the project page and the public site." },
            { name: "Year", required: false, auto: false, desc: "Project year." },
            { name: "Category", required: false, auto: false, desc: "A service (drives completion KPIs)." },
            { name: "Description (EN/AR)", required: false, auto: false, desc: "Free text." },
            { name: "Image", required: false, auto: false, desc: "Max 1 MB." },
            { name: "Receival date", required: false, auto: true, desc: "Day the quotation was sent to Projects." },
            { name: "Start / End date", required: false, auto: false, desc: "Project timeline." },
            { name: "Support period (days)", required: false, auto: true, desc: "Defaults to 365." },
          ] },
        ],
      },
      {
        key: "projects-detail",
        title: "The project page",
        location: "Projects → Project list → (open)",
        body: [
          { type: "p", text: "The project workspace. Layout:" },
          { type: "table", headers: ["Section", "Contents"], rows: [
            ["Info", "Location, Category, Project Manager, Status (stage), Completion %, Received date, Requirements, Project size, Timeline, Support period, Description. Pencil to edit."],
            ["Actions", "**Project Plan**, **Action Taken** (mark service KPIs), **Installation**, **Programming**, and **Mark as Completed** (handover)."],
            ["Client", "The client logo + contact (with the contact’s position tag), and a **Permits** section — see below."],
            ["Statistics", "The completion breakdown (Requirements %, line graph of dated milestones)."],
            ["Gallery", "Project images."],
            ["Material", "Per quotation, the **Deliveries** and their status."],
            ["Comments", "Threaded notes (Send)."],
            ["Log", "Change history; unseen entries outlined in red."],
          ] },
          { type: "image", slot: "projects-detail", label: "Project page" },
          { type: "h", text: "Client → Permits" },
          { type: "p", text: "Below the client contact, the **Permits** section handles the project’s permit needs:" },
          { type: "steps", items: [
            "**Permit contact** (name / email / phone) is **locked** — click the **pencil** to edit and **Save**. It’s also saved to the client’s contacts tagged **“For Permits”**.",
            "**Type** — choose **Single permit** or **Long permit**.",
            "For a **Long permit**, pick from the dropdown of permits that **match the project’s city** (set from the sales ticket location). The chosen permit shows its number, expiry (red when <7 days) and a **View permit** link.",
            "A **Request Permit** button appears only when the chosen long permit is **expiring (<7 days)** or **no permit matches the city** — it raises the **Permit request** task to the Permit team (else it’s hidden).",
          ] },
        ],
      },
      {
        key: "projects-completion",
        title: "Completion, stages & the Action buttons",
        location: "Projects → open project",
        body: [
          { type: "p", text: "Completion combines the service’s **KPIs** (fixed weights) with the project’s **requirements**, which split the remaining percentage (re-scaled across whichever requirements the project has)." },
          { type: "table", headers: ["Milestone", "How it completes"], rows: [
            ["Service KPIs", "Boolean — marked via the **Action Taken** dropdown."],
            ["Delivery", "Automatic — delivered items ÷ total (from deliveries)."],
            ["Installation", "Automatic — items marked installed ÷ total (per-serial)."],
            ["Programming", "Automatic — items marked programmed ÷ total (per-serial)."],
            ["Handover", "Manual — the **Mark as Completed** button."],
          ] },
          { type: "p", text: "**Stage** (Received → In Progress → Completed) advances **automatically** as milestones complete. **Mark as Completed** only appears once every KPI and every non-handover requirement is 100%." },
          { type: "note", text: "The **Installation** and **Programming** action buttons only appear when that scope is part of the project — i.e. the sales ticket didn't mark the service **Without Installation / Without Programming** and some item needs it. The **Project Line Graph** always starts at 0% at the project's start and rises in date order as milestones complete." },
          { type: "image", slot: "projects-completion", label: "Completion statistics + Action Taken" },
        ],
      },
      {
        key: "projects-install-program",
        title: "Installation & Programming tracking",
        location: "Projects → open project → Installation / Programming",
        body: [
          { type: "p", text: "These are tracked **per serial number**, in a strict order: a serial must be **delivered** before it can be installed, and **installed** before it can be programmed." },
          { type: "steps", items: [
            "Click **Installation** (unlocks once any item is delivered). Tick each delivered serial as installed.",
            "Click **Programming** (unlocks once any item is installed). Tick each installed serial as programmed.",
            "Both feed the completion percentage automatically.",
          ] },
          { type: "image", slot: "projects-install", label: "Per-serial installation/programming" },
        ],
      },
      {
        key: "projects-plan",
        title: "The project plan builder (Gantt)",
        location: "Projects → open project → Project Plan",
        body: [
          { type: "p", text: "A full-screen WBS + Gantt planner. The table drives the timeline below it." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Task Name", "Task or sub-task name."],
            ["Status", "Task status."],
            ["Assigned to", "Owner."],
            ["Duration", "In days."],
            ["Start / End Date", "Task dates."],
            ["Dependencies", "Other tasks this one waits on."],
            ["Comments", "Free notes."],
          ] },
          { type: "steps", items: [
            "Type in **“Add a task”** at the bottom and press **Enter**; use the **+** on a row to add a **sub-task**, or the trash to remove.",
            "Toggle visible columns with **Columns**; open the **Timeline** for the Gantt (with a **Print** option); adjust **Settings**.",
            "Click **Save** (enabled when there are unsaved changes).",
          ] },
          { type: "image", slot: "projects-plan-builder", label: "Project plan builder (Gantt)" },
        ],
      },
      {
        key: "projects-sla",
        title: "SLA maintenance contracts",
        location: "Projects → SLA",
        body: [
          { type: "p", text: "Each SLA is a maintenance contract attached to a project, with visit dates derived from its start date, duration and visit count." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Contract", "Contract name/reference."],
            ["Project", "The linked project."],
            ["Signed", "Signing date."],
            ["Visits", "Number of visits."],
            ["Closest visit", "Next due visit + days remaining."],
            ["Actions", "Open / delete."],
          ] },
          { type: "h", text: "Add SLA fields" },
          { type: "fields", items: [
            { name: "Contract name / reference", required: false, auto: false, desc: "Free text." },
            { name: "Project", required: false, auto: false, desc: "The project it covers." },
            { name: "Services covered", required: false, auto: false, desc: "One or more services." },
            { name: "Signing date / Start date", required: false, auto: false, desc: "Contract dates." },
            { name: "Duration (days)", required: false, auto: false, desc: "Defaults to 365." },
            { name: "Number of visits", required: false, auto: false, desc: "Scheduled maintenance visits (dates derived)." },
            { name: "Number of emergency visits", required: false, auto: false, desc: "Extra on-call visits." },
          ] },
          { type: "p", text: "Open a contract to tick each **visit** (and emergency visit) as completed; each shows days-remaining / past / completed." },
          { type: "image", slot: "projects-sla", label: "SLA contracts" },
        ],
      },
      {
        key: "projects-settings",
        title: "Projects Settings",
        location: "Projects → Settings",
        body: [
          { type: "p", text: "Configuration for the Projects module: the **Requirement weights** (how a project's completion % — after the service KPIs — is split across its requirements) and the **Default overtime department** (the department pre-selected in Add overtime)." },
          { type: "steps", items: [
            "Open **Projects → Settings**.",
            "Set the **Delivery / Installation / Programming / Handover** percentages. Only the requirements a project actually has count, and their shares are re-scaled to fill the remaining %.",
            "Click **Save**.",
          ] },
          { type: "note", text: "These weights used to live under Company Info — they now live here. The completion maths is unchanged." },
          { type: "image", slot: "projects-settings", label: "Projects Settings — requirement weights" },
        ],
      },
      {
        key: "projects-overtime",
        title: "Overtimes",
        location: "Projects → Overtimes",
        body: [
          { type: "p", text: "Track overtime hours per user per project. Two sheets (tabs):" },
          { type: "table", headers: ["Sheet", "Shows"], rows: [
            ["Main", "A **Projects × Users** matrix of total OT hours — projects as rows, users as columns, each cell the summed hours, with row / column / grand totals (centered)."],
            ["List", "Every OT record (Project · User · Department · Date · From–To · Hours). Click a row to **edit** or delete it."],
          ] },
          { type: "steps", items: [
            "Click **Add OT**. Pick a **project** (defaults to your own projects — tick **Show all projects** for the rest).",
            "Set the **Date** and **From / To** times. **From** defaults to just **outside working hours** (the base working-hours end for that day). The **users** list stays disabled until Date + From + To are all set.",
            "Tick one or more **users** (filter by **department** — the **default overtime department** from Projects → Settings is pre-selected). A user already assigned to a **Work-Calendar task overlapping** the OT window is shown **Busy** and can't be picked. One record is created per selected user; hours = To − From.",
            "On **Main**, use **Export** to download the matrix as a styled PDF.",
          ] },
          { type: "note", text: "Set the **Default overtime department** in **Projects → Settings**. Overtime can be shown on the Operations **Work Calendar** — see Operations." },
          { type: "image", slot: "projects-overtime", label: "Overtimes — matrix, Add OT, List" },
        ],
      },
    ],
  },

  {
    key: "inventory",
    label: "Inventory / Logistics",
    icon: "vendors",
    intro: "The catalogue and physical stock behind every quotation and project — registered items, vendors, serial-tracked stock, per-project sheets with serial booking, material orders, and the delivery/return lifecycle.",
    articles: [
      {
        key: "inventory-where",
        title: "Where things live & who can see them",
        location: "Inventory",
        body: [
          { type: "p", text: "The **Inventory** group has five pages:" },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["Stock Management", "Inventory → Stock Management", "Serial-tracked physical stock per item."],
            ["Vendors", "Inventory → Vendors", "Suppliers (Local / International)."],
            ["Registered Items", "Inventory → Registered Items", "The priced catalogue the quotation builder draws from."],
            ["Project Sheets", "Inventory → Project Sheets", "Per-project material sheets; book serials from stock."],
            ["Orders and Tracking", "Inventory → Orders and Tracking", "Per-project shortfall + material orders per vendor (view-only section)."],
          ] },
          { type: "note", text: "Inventory is internal business data — reads are gated to Inventory access, but the catalogue (Items, Vendors, Stock) is **also readable** by Technical, Sales and Projects users so the quotation builder and project screens can resolve items. The Inventory dashboard shows stat cards (Vendors, Items, Stock value) plus shortcuts to each page." },
        ],
      },
      {
        key: "inventory-items",
        title: "Registered Items",
        location: "Inventory → Registered Items",
        body: [
          { type: "p", text: "The priced catalogue. Each item belongs to a vendor and is what the quotation builder searches." },
          { type: "steps", items: [
            "Click **“+ Add item”**.",
            "Search and pick the **Vendor**, then fill the fields below.",
            "Click **Save**. Edit or **Delete** an item from its row.",
          ] },
          { type: "fields", items: [
            { name: "Vendor", required: true, auto: false, desc: "The supplier (searchable)." },
            { name: "Type of item", required: false, auto: false, desc: "Once a vendor is picked, choose one of that vendor's registered item types. Carries the type's Estimated Delivery Time (weeks) onto the item." },
            { name: "Model number", required: true, auto: false, desc: "Manufacturer model." },
            { name: "Name", required: true, auto: false, desc: "Item name." },
            { name: "Scope (Installation / Programming)", required: true, auto: false, desc: "Tick whether this item needs Installation and/or Programming. Drives which project completion milestones apply (minus any per-service “Without …” exclusions on the ticket)." },
            { name: "Description", required: false, auto: false, desc: "Rich text — shown in quotations." },
            { name: "Price", required: false, auto: false, desc: "Buy cost (drives quotation cost/margin)." },
            { name: "Product image", required: false, auto: false, desc: "Shown in quotations." },
            { name: "Data Sheet", required: false, auto: false, desc: "PDF or image, max 5 MB." },
            { name: "User Manual", required: false, auto: false, desc: "PDF or image, max 5 MB." },
          ] },
          { type: "image", slot: "inventory-add-item", label: "Add item form (Data Sheet / User Manual)" },
        ],
      },
      {
        key: "inventory-vendors",
        title: "Vendors",
        location: "Inventory → Vendors",
        body: [
          { type: "p", text: "Suppliers referenced by Registered Items (and shown on the public site). Add, edit, reorder or delete." },
          { type: "fields", items: [
            { name: "Name", required: true, auto: false, desc: "Vendor name." },
            { name: "Image", required: false, auto: false, desc: "Logo, max 1 MB." },
            { name: "Address", required: false, auto: false, desc: "Vendor address." },
            { name: "Tag", required: false, auto: false, desc: "Local or International." },
            { name: "Item types & delivery time (weeks)", required: false, auto: false, desc: "The item categories this vendor supplies, each with an Estimated Delivery Time in weeks. Add as many as needed. These feed the “Type of item” picker on Registered Items and the project material-arrival estimate." },
          ] },
          { type: "image", slot: "inventory-vendors", label: "Vendors list + form" },
        ],
      },
      {
        key: "inventory-stock",
        title: "Stock Management & serials",
        location: "Inventory → Stock Management",
        body: [
          { type: "p", text: "Physical stock is tracked **by serial number** — one stock record per item. **Auto-refreshes every 5 seconds.** Search by item, vendor or serial." },
          { type: "image", slot: "inventory-add-stock", label: "Add stock form with serials" },
          { type: "h", text: "List columns" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Item", "Item name + model."],
            ["Vendor", "The item’s vendor."],
            ["Quantity", "“N in stock”, plus “N assigned” (serials booked to a project — no longer available)."],
            ["Serial numbers", "In-stock serials; booked ones show struck-through."],
            ["Actions", "Edit / Delete."],
          ] },
          { type: "h", text: "Adding stock" },
          { type: "steps", items: [
            "Click **“+ Add stock”**, then search and pick a **registered item** (items that already have a stock record are hidden).",
            "Type **serial numbers** (comma- or newline-separated) and press **Add** — repeat as needed; remove any with the **×**.",
            "Click **Save**. Editing lets you add/remove serials later.",
          ] },
        ],
      },
      {
        key: "inventory-sheets",
        title: "Project Sheets & booking serials",
        location: "Inventory → Project Sheets",
        body: [
          { type: "p", text: "An Excel-style workspace — one **sheet tab** per project along the bottom. Sheets are **created automatically when a project is approved**; their items/quantities mirror the approved quotation." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Image / Item / Model / Vendor", "Item identity (from the quotation)."],
            ["Qty (in stock)", "Ordered quantity, with how many are currently available in stock."],
            ["Delivered", "Delivered ÷ ordered (from delivery notes)."],
            ["Serial numbers", "The serials booked to this line."],
          ] },
          { type: "h", text: "Booking serials" },
          { type: "steps", items: [
            "Pick the project’s **tab** at the bottom (search by project or serial).",
            "On a row, click the **pencil**, then tick available serials from stock. Booking **removes the serial from available stock** immediately and **auto-saves**.",
            "You can’t book more than the ordered quantity; release one (×) to book another. Click the **check** when done.",
          ] },
          { type: "note", text: "Booking every requested serial is what unblocks the **Release material** button on a Logistics delivery task." },
          { type: "h", text: "Main / Orders sub-bar + Tracking" },
          { type: "p", text: "When a project is selected, a **Main | Orders** sub-bar appears above the tabs: **Main** is the serial-booking sheet above; **Orders** is the material-order view (formerly a separate *Orders & Tracking* section, now merged here — see the next article). The bottom-bar **Search** also matches **tracking numbers**, and a **Tracking** tab (left of Search) lists every order that has a tracking number across all projects." },
          { type: "image", slot: "inventory-sheets", label: "Project sheet — booking serials" },
        ],
      },
      {
        key: "inventory-delivery-request",
        title: "Requesting a delivery",
        location: "Project → quotation (view) → Request delivery",
        body: [
          { type: "p", text: "A delivery is requested from the **quotation viewer** (opened read-only from a project). This is what raises the Logistics delivery task." },
          { type: "steps", items: [
            "Open the project’s quotation (view-only). It lists the items with what’s still pending delivery.",
            "Select the items/quantities to send and click **Request delivery**.",
            "A **Delivery request** task is created for the assigned **Logistics** people (see Tasks & Approvals).",
          ] },
          { type: "note", text: "For an item that isn't covered by stock, once an **order request** has been sent from **Project Sheets → Orders** the item's Qty cell shows an **Est. arrival** date = the order date + the item's Estimated Delivery Time (weeks, from its vendor type)." },
          { type: "h", text: "Editing an open request's quantities" },
          { type: "p", text: "While a request is still open, its item shows **Request open** — hover it to reveal **Edit Request**. Click (and confirm) to open a popup and change the **per-item quantity** (0–outstanding; 0 removes the item). **Confirm changes** sends the new quantities to **Logistics** on the same request; the item then shows **Change pending** until Logistics **approves** it on the delivery task, at which point the quantities update (all-zero cancels the request)." },
          { type: "image", slot: "inventory-request-delivery", label: "Request delivery from the quotation viewer" },
        ],
      },
      {
        key: "inventory-deliveries",
        title: "Delivery notes, statuses & returns",
        location: "Tasks (Logistics) / Project → Material",
        body: [
          { type: "p", text: "When Logistics **Releases material** (on the delivery task, once serials are booked), it creates a **delivery note**. The project team then updates its status and can return items." },
          { type: "table", headers: ["Delivery status", "Meaning"], rows: [
            ["Pending delivery", "Released, in transit (in-progress)."],
            ["Delivered", "Fully received."],
            ["Partially delivered", "Some items received."],
            ["Rejected", "Delivery rejected."],
          ] },
          { type: "steps", items: [
            "On the **project page → Material**, open a delivery note. Use **Export PDF** (top of the window) to download a styled delivery note (logo, items, serials, signature line).",
            "To mark it **Delivered**, first tick **Client's signature confirmed** — the Delivered button stays disabled until it's checked. You can also mark **Partially delivered** or **Rejected**, or select serials to **return**.",
            "Creating a return raises a **Material return** task to Logistics; confirming receipt there **reassigns the serials to available stock** and un-books them from the sheet.",
          ] },
          { type: "image", slot: "inventory-deliveries", label: "Delivery note / returns" },
        ],
      },
      {
        key: "inventory-orders",
        title: "Orders sub-sheet & tracking",
        location: "Inventory → Project Sheets → Orders",
        body: [
          { type: "p", text: "The **Orders** view of a project sheet (Main | Orders sub-bar) — formerly the separate *Orders & Tracking* section, now merged into Project Sheets. It shows **what’s missing**, grouped by **vendor**, so a purchase can be raised per vendor." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Item / Model", "Item identity."],
            ["Needed", "Ordered quantity."],
            ["Assigned", "Serials already booked to the project."],
            ["In stock", "Available serials in stock."],
            ["More required", "The shortfall (needed − assigned − in stock)."],
            ["Ordered", "Quantity already requested for this project."],
            ["Order qty", "Editable quantity to order (defaults to the remaining outstanding)."],
          ] },
          { type: "steps", items: [
            "Select a project → **Orders**. Review the shortfall per vendor group.",
            "Adjust **Order qty** and click **Send order request** for that vendor, then confirm. Once the full **More required** has already been requested, the button is **disabled** (nothing left to order).",
            "This raises a **Vendor PO approval** task to **Finance and Management** (two-party). The order shows **Pending approval** under **Requested orders** until both approve, then **approved**.",
          ] },
          { type: "h", text: "Tracking a requested order" },
          { type: "p", text: "In **Requested orders**, click a row to open the **tracking popup** and record a **Tracking number + note**. Tracked orders show the number on the row; the **Tracking** tab (left of Search) lists every tracked order across all projects, and its rows open the same popup. Bottom-bar **Search** matches tracking numbers too." },
          { type: "note", text: "Inside the Vendor PO task, an **Export PDF** button downloads the aggregated items table styled like the Cash-sheet print. Each of Finance and Management clicks **Approve**; when both approve the task is **Done** and the order is Approved." },
          { type: "image", slot: "inventory-orders", label: "Orders sub-sheet — shortfall by vendor + tracking" },
        ],
      },
    ],
  },

  {
    key: "finance",
    label: "Finance",
    icon: "services",
    intro: "Track every approved project’s PO and finance details, and keep per-user cash sheets with month/project spending analytics.",
    articles: [
      {
        key: "finance-where",
        title: "Where things live & who can see them",
        location: "Finance",
        body: [
          { type: "p", text: "The **Finance** group has three pages:" },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["Finance (projects)", "Finance", "Approved projects with their PO / project numbers and finance columns."],
            ["Cash", "Finance → Cash", "Per-user cash sheets + spending analytics."],
            ["Settings", "Finance → Settings", "The Cash category list."],
          ] },
          { type: "note", text: "Finance also completes the **PO approval task** — issuing the **project number** that finalises a project (covered in Tasks & Approvals). Cash sheets are **per user**: each person keeps their own; the Cash section shows yours." },
        ],
      },
      {
        key: "finance-projects",
        title: "The Finance projects list",
        location: "Finance",
        body: [
          { type: "p", text: "Every approved project with its finance details. Search by PO / quotation / project number / client, and filter by PO state." },
          { type: "table", headers: ["Control", "What it does"], rows: [
            ["Search", "Matches title, client, quotation/PO/project number, ticket ref, PM."],
            ["PO filter", "All projects · Awaiting project number · Project number issued."],
            ["Columns", "Toggle which columns show (see below)."],
            ["Edit", "Opens the Finance details modal for that row."],
          ] },
          { type: "h", text: "Columns" },
          { type: "p", text: "**Core (on by default):** PO Number, Quotation Number, Project Title, Client, Value, Project Number, Project Manager. **Optional:** Ticket Ref, Industry, Urgency, Stage, Contact, Deadline, Ticket date, Quotation date, Approved date." },
          { type: "h", text: "Finance details modal (Edit)" },
          { type: "fields", items: [
            { name: "PO Number", required: false, auto: false, desc: "The client PO number." },
            { name: "Project Number", required: false, auto: false, desc: "The issued project number." },
            { name: "View submitted PO", required: false, auto: true, desc: "Link to the PO file (if one was attached)." },
          ] },
          { type: "image", slot: "finance-projects", label: "Finance projects list" },
        ],
      },
      {
        key: "finance-cash-overview",
        title: "Cash — structure",
        location: "Finance → Cash",
        body: [
          { type: "p", text: "Cash is a spreadsheet-style workspace. A **year selector** scopes it; along the bottom are tabs: **Main** (analytics) plus one tab per **sheet** for that year, and a **+** to add a sheet." },
          { type: "steps", items: [
            "Pick the **Year** (top-right of Main).",
            "Use the bottom tabs to switch between **Main** and your sheets; click **+** to add a new sheet for the selected year.",
          ] },
        ],
      },
      {
        key: "finance-cash-main",
        title: "Cash — Main analytics",
        location: "Finance → Cash → Main",
        body: [
          { type: "p", text: "Rolls up all your sheets for the selected year." },
          { type: "table", headers: ["Element", "Shows"], rows: [
            ["Total", "Your total spending for the year (header)."],
            ["Spending by month", "A 12-month timeline chart."],
            ["Project spending cards", "One card per project (amount + name + number); click to drill in."],
          ] },
          { type: "image", slot: "finance-cash-main", label: "Cash Main analytics" },
        ],
      },
      {
        key: "finance-cash-drill",
        title: "Cash — project drill-down",
        location: "Finance → Cash → (project card)",
        body: [
          { type: "p", text: "Clicking a project card shows that project’s **lifetime** spending across all your sheets/years." },
          { type: "steps", items: [
            "A **lifetime spending by month** chart tops the view.",
            "Below, each month is an expandable row showing its total and the **month-over-month %** change (▲ red = up, ▼ green = down).",
            "Expand a month to see each payment (Date, Category, Description, Paid by, Amount).",
            "**Export** is available (options coming soon).",
          ] },
          { type: "image", slot: "finance-cash-drill", label: "Cash project drill-down" },
        ],
      },
      {
        key: "finance-cash-sheet",
        title: "A cash sheet (data entry)",
        location: "Finance → Cash → (sheet tab)",
        body: [
          { type: "p", text: "Each sheet is a grid of payments with a running balance." },
          { type: "h", text: "Sheet header" },
          { type: "table", headers: ["Field", "Meaning"], rows: [
            ["Notes", "Free text (prints on the sheet)."],
            ["Origin", "Opening cash."],
            ["Extra Cash", "Additional cash added."],
            ["Remaining", "Origin + Extra − Total (auto)."],
            ["Include all projects", "When on, the Projects picker lists every project; otherwise only the ones you own."],
          ] },
          { type: "h", text: "Row columns" },
          { type: "table", headers: ["Column", "Entry"], rows: [
            ["Invoice Date", "Date of the payment."],
            ["Category", "From the Finance-settings category list (searchable)."],
            ["Description", "Free text."],
            ["Paid By", "An employee."],
            ["Projects", "The project it belongs to (or “Non Project”)."],
            ["Amount", "SAR amount; feeds Total & Remaining."],
          ] },
          { type: "h", text: "Actions" },
          { type: "table", headers: ["Button", "What it does"], rows: [
            ["Save", "Persists the sheet (enabled when there are unsaved changes)."],
            ["Print", "Opens a print-ready A4 layout (logo, header, table, footer)."],
            ["Lock", "Makes the sheet read-only; it **can’t be unlocked for 15 minutes**."],
            ["Delete (trash)", "Removes the sheet (when unlocked)."],
          ] },
          { type: "image", slot: "finance-cash-sheet", label: "Cash sheet grid" },
        ],
      },
      {
        key: "finance-settings",
        title: "Finance Settings — Cash categories",
        location: "Finance → Settings",
        body: [
          { type: "p", text: "Manages the **Category** dropdown used on every cash sheet." },
          { type: "steps", items: [
            "Type a name and press **Add** (or Enter) to add a category; edit any inline; remove with the trash icon.",
            "Click **Save**.",
          ] },
          { type: "image", slot: "finance-settings", label: "Finance settings — cash categories" },
        ],
      },
    ],
  },

  {
    key: "hr",
    label: "Human Resources",
    icon: "team",
    intro: "The people layer — the employee directory (with departments/positions/certifications), studio login accounts, department-based access control, and recruitment (careers & applications).",
    articles: [
      {
        key: "hr-where",
        title: "Where things live & who can see them",
        location: "Human Resources",
        body: [
          { type: "p", text: "The **Human Resources** group has a dashboard plus four pages; **Access Control** lives in the Company Website group but is really the access layer for these people." },
          { type: "table", headers: ["Page", "Path", "What it's for"], rows: [
            ["Employees", "Human Resources → Employees", "The staff directory + department/position/certification reference lists."],
            ["Users", "Human Resources → Users", "Studio login accounts (admin flag, passwords)."],
            ["Careers", "Human Resources → Careers", "Public job openings."],
            ["Applications", "Human Resources → Applications", "Incoming CVs."],
            ["Access Control", "Company Website → Access Control", "Grant sections to departments/users."],
          ] },
          { type: "h", text: "Visibility & permissions" },
          { type: "table", headers: ["Ability", "Who has it"], rows: [
            ["Manage the full Employees directory (all fields, sensitive numbers)", "Admin or **HR**."],
            ["Manage Users, Access Control", "**Admin only.**"],
            ["A person’s section access", "Derived from their linked employee’s **department code** (+ any extra access tags) — not set on the user record."],
          ] },
          { type: "note", text: "The HR dashboard shows stat cards (Employees, Users, Careers, Applications) linking to each page." },
        ],
      },
      {
        key: "hr-employees",
        title: "Employees & reference lists",
        location: "Human Resources → Employees",
        body: [
          { type: "p", text: "The directory of every staff member. At the top, a collapsible panel manages the three reference lists used everywhere else." },
          { type: "steps", items: [
            "Open the **“Departments, Positions & Certifications”** panel and create those first (each has a code/name; certifications carry an image).",
            "Search the employee list, or click **“Add employee”** to create one.",
            "Certifications appear as badges on each employee card. Delete removes them from the public team list.",
          ] },
          { type: "note", text: "Department **code** is what drives access — see Access Control. Positions and Certifications are labels/badges." },
          { type: "image", slot: "hr-employees", label: "Employees list + reference lists" },
        ],
      },
      {
        key: "hr-employee-form",
        title: "The employee form (all fields)",
        location: "Human Resources → Employees → Add / edit",
        body: [
          { type: "h", text: "Details" },
          { type: "fields", items: [
            { name: "Photo", required: false, auto: false, desc: "Profile image." },
            { name: "Full Name", required: true, auto: false, desc: "Employee name." },
            { name: "Employee Code", required: false, auto: false, desc: "Internal code." },
            { name: "Department", required: false, auto: false, desc: "Home department (drives access)." },
            { name: "Date of Join", required: false, auto: false, desc: "Start date." },
            { name: "Position", required: false, auto: false, desc: "Job title." },
            { name: "Email / Mobile", required: false, auto: false, desc: "Contact details." },
          ] },
          { type: "h", text: "Login & access (admin/HR only)" },
          { type: "fields", items: [
            { name: "Username", required: false, auto: false, desc: "Blank = no login. Creating one shows a one-time password; existing accounts get a Reset password button." },
            { name: "Administrator", required: false, auto: false, desc: "Super-flag — sees every section." },
            { name: "Access tags", required: false, auto: false, desc: "Extra department codes on top of the home department." },
            { name: "Certifications", required: false, auto: false, desc: "Up to 3 (badges)." },
          ] },
          { type: "h", text: "Sensitive numbers (gated)" },
          { type: "fields", items: [
            { name: "ID Number / Expiry / Image", required: false, auto: false, desc: "Number is greyed until HR clicks **edit**; encrypted at rest; scans are gated." },
            { name: "Passport Number / Expiry / Image", required: false, auto: false, desc: "Same edit/lock gating & encryption." },
          ] },
          { type: "note", text: "Section access, task approvals and quotation visibility are all driven by the employee’s **department**, not set field-by-field." },
          { type: "image", slot: "hr-add-employee", label: "Add / edit employee form" },
        ],
      },
      {
        key: "hr-users",
        title: "Users (login accounts)",
        location: "Human Resources → Users",
        body: [
          { type: "p", text: "Admin-only. Most logins are created from **Employees**; use this page for the admin flag, passwords, and logins with no employee record." },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["User ID", "The login id."],
            ["Full name", "From the linked employee."],
            ["Department", "The admin badge + department/access tags."],
            ["Actions", "Edit · Reset password · Delete."],
          ] },
          { type: "steps", items: [
            "**Add user** — enter a **User ID** and optionally tick **Administrator**. A random password is generated and shown **once** (copy it — it can’t be recovered).",
            "**Reset password** generates a new one-time password.",
            "**Edit** changes the User ID / admin flag; **Delete** removes the account.",
          ] },
          { type: "note", text: "Non-admin section access is NOT set here — it comes from the linked employee’s department." },
          { type: "image", slot: "hr-users", label: "Users list" },
        ],
      },
      {
        key: "hr-access",
        title: "Access Control",
        location: "Company Website → Access Control",
        body: [
          { type: "p", text: "Grants are a permission tree of **node → action**, attached to a **department** (everyone in it inherits) or an **individual user**. Admins always have full access and don’t appear here." },
          { type: "steps", items: [
            "Switch the scope between **Departments** and **Individual users**, then pick a subject from the dropdown.",
            "Walk the tree and set each action to **— (none) / Allow / Deny**. **View** opens a section; **Manage** adds create/edit/delete (and implies View).",
            "**Deny always beats Allow** — use it to carve one user out of a department grant.",
            "Click **Save changes**. **Clear all grants** wipes everything (admins keep access).",
          ] },
          { type: "h", text: "Named actions (beyond View/Manage)" },
          { type: "table", headers: ["Action", "Unlocks"], rows: [
            ["See all records", "See every record in a section, not just your own."],
            ["See cost", "Quotation cost figures (cost box + Free/Margin/Unit/Total)."],
            ["Submit PO", "Raise a PO submission from an approved ticket."],
            ["Issue project #", "Finance completes a PO task."],
            ["Receive Sales chats", "See/accept website Contact Sales chats (Live Chat node)."],
            ["Receive Support chats", "See/accept website Contact Support chats (Live Chat node)."],
          ] },
          { type: "note", text: "Nodes are independent — granting a section’s dashboard does NOT unlock its sub-sections. Users land on the first section their department can reach at sign-in. Task **approval** is not here — it comes from Tasks → Task settings assignment." },
          { type: "image", slot: "hr-access-tree", label: "Access Control permission tree" },
        ],
      },
      {
        key: "hr-careers",
        title: "Careers",
        location: "Human Resources → Careers",
        body: [
          { type: "p", text: "Job openings shown on the public site. Add, edit, reorder or delete roles." },
          { type: "fields", items: [
            { name: "Title (EN/AR)", required: false, auto: false, desc: "Role title." },
            { name: "Job description (EN/AR)", required: false, auto: false, desc: "Rich text." },
            { name: "Department (EN/AR)", required: false, auto: false, desc: "Hiring department." },
            { name: "Location (EN/AR)", required: false, auto: false, desc: "Where the role is based." },
            { name: "Employment type (EN/AR)", required: true, auto: false, desc: "e.g. Full-time / Part-time." },
          ] },
          { type: "image", slot: "hr-careers", label: "Careers" },
        ],
      },
      {
        key: "hr-applications",
        title: "Applications",
        location: "Human Resources → Applications",
        body: [
          { type: "p", text: "Incoming job applications (submitted with a CV from the public careers page)." },
          { type: "steps", items: [
            "Review each application; **download the CV**.",
            "**Reject** an application you’re not proceeding with.",
            "Rejected applications (and their CV files) are **automatically purged after 7 days**.",
          ] },
          { type: "image", slot: "hr-applications", label: "Applications" },
        ],
      },
    ],
  },

  {
    key: "operations",
    label: "Operations",
    icon: "dashboard",
    intro: "Field operations: the weekly work calendar, document-expiry watch, permits and a locations directory, plus configurable working hours and live location tracking.",
    articles: [
      {
        key: "operations-where",
        title: "Where things live & who can see them",
        location: "Operations",
        body: [
          { type: "p", text: "The **Operations** group has three pages. The main page itself is organised as **sheet tabs** along the bottom." },
          { type: "table", headers: ["Page / tab", "Path", "What it's for"], rows: [
            ["Operations (Main)", "Operations", "Work calendar + document-expiry watch."],
            ["Employees sheet", "Operations (tab)", "Staff ID/passport expiry table — **admin only**."],
            ["Permits sheet", "Operations (tab)", "Work permits with expiry."],
            ["Locations", "Operations (tab)", "Operations directory of sites/contacts."],
            ["Tracking", "Operations → Tracking", "Live field-staff location on a Riyadh map."],
            ["Settings", "Operations → Settings", "Working hours + calendar legend."],
          ] },
          { type: "note", text: "Editing (add/remove permits, locations, calendar tasks) needs **Operations → Manage**. The **Employees** sheet and the Tracking **Map** are **admin-only**." },
        ],
      },
      {
        key: "operations-calendar",
        title: "The Work Calendar",
        location: "Operations → Main",
        body: [
          { type: "p", text: "A weekly roster: each day lists the work tasks and the employees (avatars) assigned to them." },
          { type: "steps", items: [
            "Navigate weeks with **◀ / ▶**, or jump to **Current week**.",
            "Click **Add Work Task** — it opens pre-filled with **tomorrow’s date** and the **working-hours** start/end for that day. (The dialog won’t close if you click outside it — use ✕ or Cancel.)",
            "Assign a **work task** to a day (with a type from the legend and assignees); remove one from the calendar as needed.",
            "Use a day’s **copy** control to duplicate that day’s task roster.",
            "The **Legend** (configured in Settings) colour-codes task types.",
          ] },
          { type: "note", text: "**Non-working days** (per the working-hours schedule in Operations → Settings) are shown with a muted, striped background so they stand apart from working days. Working hours and the legend of task types are set in **Operations → Settings**." },
          { type: "note", text: "With **Show overtimes** on (Operations → Settings), overtime entries appear as blocks labelled **OT** (project + user on hover), coloured by the **Overtime** legend colour, on the full-day window. **Copy this day's roster** lists **work tasks only** — not overtimes." },
          { type: "image", slot: "operations-calendar", label: "Work Calendar" },
        ],
      },
      {
        key: "operations-expiry",
        title: "Document-expiry watch",
        location: "Operations → Main",
        body: [
          { type: "p", text: "Three cards surface the **nearest upcoming (and overdue)** documents so nothing lapses:" },
          { type: "table", headers: ["Card", "Watches"], rows: [
            ["ID expiring soon", "Employee national-ID expiry dates."],
            ["Passport expiring soon", "Employee passport expiry dates."],
            ["Permit expiring soon", "Work-permit expiry dates."],
          ] },
          { type: "image", slot: "operations-expiry", label: "Expiry watch cards" },
        ],
      },
      {
        key: "operations-employees-permits",
        title: "Employees & Permits sheets",
        location: "Operations → (Employees / Permits tabs)",
        body: [
          { type: "h", text: "Employees sheet (admin only)" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Employee", "Name."],
            ["ID Number", "National ID."],
            ["ID Expiry", "Colour-coded expiry badge."],
            ["Passport Expiry", "Colour-coded expiry badge."],
          ] },
          { type: "h", text: "Permits sheet" },
          { type: "table", headers: ["Column", "Shows"], rows: [
            ["Permit", "Composed as “Client — Location”."],
            ["Number", "Permit number."],
            ["Issue date / Expire date", "Validity (expiry is badge-coloured)."],
            ["File", "Attached permit document."],
            ["Employees", "Who it covers."],
          ] },
          { type: "steps", items: [
            "Click **“+ Add permit”**. Instead of a free-text name, pick a **Client** (from Sales clients) and one of that client’s saved **Locations** (city). A **location icon** links out to the saved map link. If the client has **no saved location** (or you choose **“+ Add a new location…”**), enter one inline — **name**, **city** (from Sales → Settings) and an optional **link** — and it’s saved back onto the client for reuse.",
            "Add the **Number**, **Issue / Expire** dates, a mandatory **attachment** (PDF/image, max 5 MB) and the covered **Employees**, then **Save**. The permit’s **city** (from the location) is what a project’s long-permit dropdown matches on.",
            "Click a permit row to edit it (managers only). Both sheets can be **renamed** (the tab label) by a manager.",
          ] },
          { type: "image", slot: "operations-permits", label: "Permits sheet" },
        ],
      },
      {
        key: "operations-locations",
        title: "Locations directory",
        location: "Operations → Locations tab",
        body: [
          { type: "steps", items: [
            "Click **“+ Add location”** to add a site to the directory.",
            "Add one or more **contacts** to a location with **“+ Add contact”**.",
          ] },
          { type: "image", slot: "operations-locations", label: "Locations directory" },
        ],
      },
      {
        key: "operations-settings",
        title: "Operations Settings",
        location: "Operations → Settings",
        body: [
          { type: "table", headers: ["Setting", "What it controls"], rows: [
            ["Working Hours", "The working hours per day used by the Work Calendar, plus **Show only Working Hours** and **Show overtimes** display toggles."],
            ["Work Calendar legend", "The task-bar colours — a **fixed** set of types (incl. **Overtime**); recolour or rename them, but you can't add or delete."],
          ] },
          { type: "steps", items: [
            "Adjust working hours. Toggle **Show only Working Hours**, or **Show overtimes** (which overrides it — overtime is drawn as **OT** blocks in the full-day window).",
            "Recolour/rename legend types (including the **Overtime** colour). Click **Save**.",
          ] },
          { type: "image", slot: "operations-settings", label: "Operations settings" },
        ],
      },
      {
        key: "operations-tracking",
        title: "Live tracking",
        location: "Operations → Tracking",
        body: [
          { type: "p", text: "Shows field staff on a **Riyadh** map. Two tabs:" },
          { type: "table", headers: ["Tab", "Shows"], rows: [
            ["Main", "Your **own** location — share your position; it’s recorded periodically (throttled)."],
            ["Map (admin only)", "A dispatch view of the **latest position per user**."],
          ] },
          { type: "note", text: "The map needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configured (referrer-restricted); without it the map shows a setup message. Positions are stored in the trackingPositions store and bounded per user." },
          { type: "image", slot: "operations-tracking", label: "Live tracking map" },
        ],
      },
    ],
  },

  {
    key: "notifications",
    label: "Notifications",
    icon: "bell",
    intro: "Personal, targeted notifications — you're only notified when something is assigned to or awaiting you. Available to every signed-in user via the bell and the Notifications Center.",
    articles: [
      {
        key: "notifications-how",
        title: "How notifications work",
        location: "Notifications",
        body: [
          { type: "p", text: "Notifications are **personal**: you receive one only when something concerns you directly. Read state is saved on the **server**, so it's consistent across devices." },
          { type: "h", text: "What triggers a notification to you" },
          { type: "table", headers: ["Kind", "You're notified when…"], rows: [
            ["Appointed to a task", "You're assigned to a task type in Task settings — including that type's existing open tasks."],
            ["Approval awaiting my sign-off", "A quotation approval is waiting for you (Sales or Management)."],
            ["PO awaiting me", "A client PO approval is waiting for you (Management)."],
            ["Delivery / return request for me", "A material delivery or return is assigned to you (Logistics)."],
            ["Assigned as project manager", "You're made the manager of a project."],
            ["Comment on my record", "Someone comments on a ticket / quotation / project you own or handle."],
            ["Mentioned in a comment", "Someone @mentions you (only if you have access to that record)."],
          ] },
          { type: "note", text: "You're never notified about your own actions. Each kind can be turned off in your settings." },
          { type: "image", slot: "notifications-bell", label: "Notification bell dropdown" },
        ],
      },
      {
        key: "notifications-center",
        title: "The Notifications Center",
        location: "Notifications",
        body: [
          { type: "p", text: "Your full list of notifications — reached from the sidebar or the bell's “Open Notifications Center” link." },
          { type: "steps", items: [
            "Filter by **All / Unread**, or by **type**.",
            "**Open** a notification to jump to the record (marks it read), or **Mark as read** without leaving.",
            "**Mark all as read** clears your unread count.",
          ] },
          { type: "image", slot: "notifications-center", label: "Notifications Center" },
        ],
      },
      {
        key: "notifications-settings",
        title: "Your notification settings",
        location: "Notifications → Settings",
        body: [
          { type: "p", text: "Choose which kinds you receive — these are **your own** settings and don't affect anyone else." },
          { type: "steps", items: [
            "Open **Notifications → Settings**.",
            "Toggle any kind on/off, then **Save**. A kind that's off never creates a notification for you.",
          ] },
          { type: "image", slot: "notifications-settings-page", label: "Notification settings" },
        ],
      },
      {
        key: "notifications-sidebar",
        title: "Sidebar indicators & @mentions",
        location: "Studio",
        body: [
          { type: "h", text: "Sidebar dot & counter" },
          { type: "p", text: "The sidebar shows **one** indicator per item, driven by your unread notifications:" },
          { type: "table", headers: ["Where", "Shows"], rows: [
            ["A section/item with its own page", "A numeric **counter** of your unread notifications for it."],
            ["A parent group (with sub-sections)", "A small **pulsing red dot** when any sub-section has unread — pointing you to the location."],
          ] },
          { type: "p", text: "Counters clear as you read the notifications (in the bell or the Center)." },
          { type: "h", text: "@mentions" },
          { type: "p", text: "In a **ticket**, **quotation** or **project** comment box, type **@** to mention someone. The picker only lists users who have **access** to that record, and only they can be notified." },
          { type: "image", slot: "notifications-mention", label: "@mention in a comment" },
        ],
      },
    ],
  },

  {
    key: "chat",
    label: "Live Chat",
    icon: "messages",
    intro: "Real-time chat between website visitors and studio users. Visitors pick Contact Sales or Contact Support; granted studio users answer. Chats are ephemeral (never stored) and End Chat downloads a PDF transcript.",
    articles: [
      {
        key: "chat-visitor",
        title: "The website chat widget (visitors)",
        location: "Public site",
        body: [
          { type: "p", text: "A floating message button sits on every public page. It follows the visitor's chosen **theme** (light/dark) and **language** (English/Arabic, right-to-left)." },
          { type: "steps", items: [
            "Click the message button → choose **Contact Sales** or **Contact Support**.",
            "Fill the required details — **name, email, phone, company** — and **Start chat**.",
            "While no agent has joined, the chat shows a spinning **“Waiting for a representative to connect…”**. When an agent accepts, a **“X has joined the chat”** line appears and the header shows **Connected · X**.",
            "**End chat & download transcript** closes the conversation and downloads a **PDF** (company logo + client details header + the full conversation).",
          ] },
          { type: "note", text: "**Outside working hours** (from Operations → Settings), the chat shows a notice that the request was received and will be answered when the team is back. Chats are **not stored** — the PDF transcript is the only record; a page refresh resumes an in-progress chat." },
          { type: "image", slot: "chat-widget", label: "Website chat widget" },
        ],
      },
      {
        key: "chat-studio",
        title: "Answering chats (studio)",
        location: "Company Website → Live Chat",
        body: [
          { type: "p", text: "Granted users answer incoming chats in **Live Chat**. A new chat rings **all** granted users; the **first to accept** owns it." },
          { type: "steps", items: [
            "Open **Company Website → Live Chat**. **Waiting** lists unaccepted chats in your granted topics; **My chats** lists the ones you own.",
            "Click **Accept** on a waiting chat (first-wins — if someone beat you, it disappears).",
            "Reply in the thread. **End & download** closes the chat and downloads the PDF transcript.",
          ] },
          { type: "note", text: "The sidebar **Live Chat** item shows a count of waiting chats for your topics." },
          { type: "image", slot: "chat-studio", label: "Studio Live Chat" },
        ],
      },
      {
        key: "chat-access",
        title: "Who receives which chats",
        location: "Company Website → Access Control",
        body: [
          { type: "p", text: "Access is per-topic, set on the **Live Chat** node in Access Control:" },
          { type: "table", headers: ["Action", "Grants"], rows: [
            ["Receive Sales chats", "See and accept **Contact Sales** conversations."],
            ["Receive Support chats", "See and accept **Contact Support** conversations."],
          ] },
          { type: "note", text: "A user with neither action sees no chats. Chats live only in temporary storage and expire automatically — nothing is written to the database." },
        ],
      },
    ],
  },

  {
    key: "general",
    label: "General & Admin",
    icon: "settings",
    intro: "The parts that sit outside a single department — the dashboard, your profile, company-wide settings, public website content, client reviews, and the header tools every user shares.",
    articles: [
      {
        key: "general-dashboard",
        title: "Dashboard & landing",
        location: "Studio",
        body: [
          { type: "p", text: "The **Dashboard** (the studio home) shows live counts, an inline donut chart, and recent messages/applications." },
          { type: "note", text: "Only users granted the **dashboard** section see it. Everyone else is sent to the **first section their department can reach** at sign-in — so a Sales user lands on Sales, a PM on Projects, and so on. If none matches, a minimal personal home is shown." },
          { type: "image", slot: "general-dashboard", label: "Studio dashboard" },
        ],
      },
      {
        key: "general-profile",
        title: "Your profile",
        location: "Studio → (avatar, top-right) → Profile",
        body: [
          { type: "p", text: "Reachable by **every** signed-in user (no access gate) via the avatar menu. It shows your own employee profile with the fields you may edit yourself, plus password tools." },
          { type: "steps", items: [
            "Edit your self-serviceable details (e.g. contact info, photo, ID image) and **Save**.",
            "Use **Change password** — enter current, new and confirm.",
            "After you replace your **ID image** and save, click the button to **send an information-update request** — this raises the HR *Information update* task so the assigned team can set your new ID expiry.",
          ] },
          { type: "note", text: "Users with no linked employee record see a minimal account card with a reset-password option instead." },
          { type: "image", slot: "general-profile", label: "Your profile" },
        ],
      },
      {
        key: "general-company-info",
        title: "Main Website content",
        location: "Content → Main Website content",
        body: [
          { type: "p", text: "The public-website content editor (formerly “Company Info”). It lives under the **Content** sidebar group alongside **Client Reviews** and **Statistics**, laid out like the Documentation guide: the **Section selection** (left list of containers) and the **Save changes** bar stay fixed, and only the **fields** area scrolls. One **Save** applies everything." },
          { type: "table", headers: ["Container", "Controls"], rows: [
            ["Brand", "Company/brand name, tagline, hero, intro, founded year."],
            ["Contact", "Address, city, phone, email, hours, Google-Maps link."],
            ["About Page", "About-page copy (story, mission, vision, image)."],
            ["Leadership Message", "The “word from management” quote, name, position, photo."],
            ["Social", "Social-media links (LinkedIn / X / Instagram)."],
            ["Homepage highlights", "The headline counters shown on the homepage (Years / Projects / Cities / Clients)."],
          ] },
          { type: "note", text: "Each setting appears in **exactly one container** — repeated fields were removed. The site **footer** renders from the Brand/Contact/Social values (there is no separate Footer editor). **Project Requirement Weights** moved to **Projects → Settings**; the old “Statistics” container is now **Homepage highlights** (distinct from the new **Content → Statistics** traffic page)." },
          { type: "image", slot: "general-company-info", label: "Main Website content editor" },
        ],
      },
      {
        key: "content-statistics",
        title: "Website Statistics (traffic)",
        location: "Content → Statistics",
        body: [
          { type: "p", text: "Public-website traffic analytics. Pick a range — **7 days / 7 weeks / 7 months** — to see **bar charts** (activity count on Y, date on X) of visitors, page visits, section clicks and chat-box opens, plus breakdowns of the most-visited pages, most-clicked sections and the chat topic split (Contact Sales vs Support)." },
          { type: "table", headers: ["Metric", "What it counts"], rows: [
            ["Visitors", "Distinct browsers per day (via a first-party visitor id)."],
            ["Page visits", "Every public page load (per page + total)."],
            ["Section clicks", "Clicks on the site navigation links (per section)."],
            ["Chat opens / topic", "How often the chat box is opened and which topic — Contact Sales or Contact Support — is chosen."],
          ] },
          { type: "note", text: "Data is retained for **8 months** and then removed automatically. **Download report** exports a full CSV of every retained day at any time (so it can be captured before deletion). Tracking covers the **public website only** — studio usage is not tracked." },
        ],
      },
      {
        key: "general-messages",
        title: "Messages",
        location: "Company Website → Messages",
        body: [
          { type: "p", text: "Submissions from the public contact form — **read-only**. Each shows the sender’s name, email, phone, subject, message and date." },
          { type: "image", slot: "general-messages", label: "Messages" },
        ],
      },
      {
        key: "general-content",
        title: "Public website content",
        location: "Company Website → Services / Previous Projects / Gallery",
        body: [
          { type: "p", text: "Three catalogues drive the public site (and some studio behaviour). All use the same add/edit/reorder/delete pattern." },
          { type: "table", headers: ["Page", "Key fields / notes"], rows: [
            ["Services", "Icon, Title (EN/AR), service **code**, Description (EN/AR), Image, and **Completion KPIs** (“Name : weight” per line). Feeds the ticket’s “Type of services” and each project’s KPI completion."],
            ["Previous Projects", "Title (EN/AR), YouTube URL, Description — rendered as a video grid on the public Services page."],
            ["Gallery", "Caption (EN/AR) + image (≤1 MB) — the homepage showcase bento/carousel."],
          ] },
          { type: "image", slot: "general-content", label: "Services / Previous Projects / Gallery" },
        ],
      },
      {
        key: "general-reviews",
        title: "Client Reviews",
        location: "Inbox → Client Reviews",
        body: [
          { type: "p", text: "Reviews submitted by clients (name, position, rating out of 5, comment). They arrive as **new** (hidden) and appear on the public site only once **approved**." },
          { type: "steps", items: [
            "Review each entry, then **approve** it to publish, or **reject** it.",
          ] },
          { type: "image", slot: "general-reviews", label: "Client reviews" },
        ],
      },
      {
        key: "general-header-tools",
        title: "Header tools — Notifications, Sync, theme & language",
        location: "Studio (top bar)",
        body: [
          { type: "table", headers: ["Tool", "What it does"], rows: [
            ["Notifications (bell)", "Your **personal** notifications with a real unread count; open one, Mark as read, or Mark all as read. Links to the Notifications Center. See the Notifications section."],
            ["Sync (cloud)", "Refreshes the live data behind everything you can see **in the background** — it never reloads the page, so any open form, popup or print view stays put. Auto-syncs about every 20 seconds while the tab is active."],
            ["Language (LTR/RTL)", "Switches the studio between left-to-right and right-to-left."],
            ["Theme", "Light / dark / system."],
            ["Avatar", "Opens your profile; the sidebar footer has **View website** and **Sign out**."],
          ] },
          { type: "image", slot: "general-header-tools", label: "Studio header tools" },
        ],
      },
    ],
  },
];

// Flat list of every image slot across the guide — powers the location dropdown
// in Documentation → Settings. Each entry: { slot, label, section, article }.
export function imageSlots() {
  const out = [];
  for (const section of DOC_SECTIONS) {
    for (const article of section.articles) {
      for (const block of article.body) {
        if (block.type === "image" && block.slot) {
          out.push({ slot: block.slot, label: block.label || block.slot, section: section.label, article: article.title });
        }
      }
    }
  }
  return out;
}
