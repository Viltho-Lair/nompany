import type { ManualArticle } from "./manual";

// THE CRM & SALES ARTICLE of the studio manual — every screen, every button,
// what it writes and what the product refuses, for the person doing the job.
//
// Its own module rather than a block in `./manual`, because eighteen
// departments written to this depth would make one file nobody can review.
// `./manual` assembles the articles; this is only the words.
//
// WRITTEN FROM THE CODE, 23/09/2026, not from `docs/functionality/*.md` — where
// the two disagreed the code was taken as the truth. The places it says what the
// product does NOT do (winning creates nothing; a sales order reserves no stock;
// no screen records a new contract) are deliberate: somebody acts on a manual,
// and a silent gap reads as a feature. When any of them ships, this moves in the
// same commit.
//
// Section ids carry a `crm-` prefix: every article renders on ONE page, and an
// anchor shared with another article (Maintenance also has "who" and
// "contracts") would send the contents link to the wrong department.

export const crmSalesEn: ManualArticle = {
  key: "crm-sales",
  title: "CRM & Sales",
  summary:
    "Finding the work and winning it: the leads that come in, the deals you chase for each "
    + "customer, the quotation you ask Quotations for, and what a customer has signed and ordered.",
  sections: [
    {
      id: "crm-what",
      heading: "What it is",
      blocks: [
        {
          kind: "p",
          text:
            "CRM & Sales keeps track of everybody the company sells to and every piece of work it is "
            + "chasing. The central record is the TICKET: one deal, for one customer, from the first "
            + "enquiry to the day it is won or lost. Everything else here is either a way of looking at "
            + "tickets or a record that belongs to a customer.",
        },
        {
          kind: "list",
          items: [
            "Dashboard — the department's front page: what is open, what it is worth, what is at risk.",
            "Pipeline — every open deal as a card, in the stage it has reached.",
            "Tickets — the list of deals, the queue of leads waiting for somebody, and each deal's own page.",
            "Customers — the companies you sell to, each with a page showing the whole relationship.",
            "Customer insights — who is buying more, who is buying less, who has stopped, and a way to send them back to Sales.",
            "Contracts — what has been signed, and the variations raised against it.",
            "Sales orders — what a customer has actually ordered.",
            "Live view — a full-screen table of tickets for a wall screen.",
            "Settings — the suggestions the forms offer, and the Live view's columns.",
          ],
        },
        {
          kind: "p",
          text:
            "A quotation is not built here. Sales asks the Quotations department for one — an RFQ — "
            + "and the priced quotation comes back to the ticket. Sales raises the request and receives "
            + "the answer; it does not do the pricing.",
        },
      ],
    },
    {
      id: "crm-flow",
      heading: "The life of a deal",
      blocks: [
        {
          kind: "steps",
          items: [
            "A lead arrives. Somebody raises a ticket by hand, or a campaign, a web form or Customer insights sends one in.",
            "If it arrived with nobody on it, whoever assigns leads gives it to a sales executive.",
            "The executive works it: fills in what the customer needs, comments, and sets how likely it is.",
            "Request RFQ hands the ticket to Quotations. A Lead becomes an Opportunity.",
            "Quotations prices it and the quotation appears on the ticket — or turns the request down, which closes the deal as lost.",
            "Send for Approval asks the people named in Approval settings to approve the quotation.",
            "The customer sends a purchase order. Submit PO records it and sends it for approval.",
            "You close the ticket: Closed Won, or lost with the reason.",
          ],
        },
        {
          kind: "p",
          text:
            "Winning creates nothing by itself. The project is opened in Projects from the approved "
            + "quotation, a sales order is raised on the Sales orders screen, and each of them attaches "
            + "to the same deal — which is why the customer's page can show all of it together.",
        },
      ],
    },
    {
      id: "crm-stages",
      heading: "Stages, and what the product refuses",
      blocks: [
        {
          kind: "p",
          text: "A ticket is always at one of eight stages.",
        },
        {
          kind: "list",
          items: [
            "Lead — a first contact nobody has qualified yet. Every new ticket starts here.",
            "Opportunity — worth pursuing. Requesting the first RFQ moves a Lead here by itself.",
            "Commit — the customer is expected to go ahead.",
            "On-Hold — paused. It stays on the board but is left out of the forecast.",
            "Closed Won — the customer said yes.",
            "Closed Lost, Cancelled by Client, Dropped — the three ways a deal ends without the work.",
          ],
        },
        {
          kind: "p",
          text:
            "You change the stage by editing the ticket and choosing a Status. The list only offers the "
            + "stages you are allowed to reach from where the deal is:",
        },
        {
          kind: "list",
          items: [
            "A closed deal cannot be reopened. Once a ticket is Won, Lost, Cancelled or Dropped its stage never changes again; new work for the same customer is a new ticket.",
            "Commit and Closed Won need a finished quotation on the ticket — completed, sent or approved, and not rejected.",
            "Closing a deal as Lost, Cancelled by Client or Dropped asks WHY. Those reasons are what the dashboard's \"Why deals are lost\" is built from, so write the real one — \"price\", \"went with a competitor\" — rather than \"lost\".",
          ],
        },
        {
          kind: "p",
          text:
            "Every stage change is recorded with who made it and when. That record is where the "
            + "pipeline's \"days in stage\" comes from.",
        },
      ],
    },
    {
      id: "crm-dashboard",
      heading: "The dashboard",
      blocks: [
        {
          kind: "p",
          text:
            "The front page of CRM & Sales. It changes nothing; it reads the tickets and draws them. "
            + "Some studios keep dashboards behind a right of their own — without it you see a note "
            + "saying so, and every screen in the sidebar works as normal.",
        },
        {
          kind: "list",
          items: [
            "Open tickets — deals not yet closed, including those on hold. Click it to open the ticket list.",
            "Weighted pipeline — each open deal's value multiplied by its probability, added up. Deals on hold count here.",
            "Won, and Won value — how many deals were won, and what they were worth.",
            "At risk — open deals that are High or Critical urgency, or due within 14 days, or overdue.",
          ],
        },
        {
          kind: "p",
          text: "Below the figures, depending on the studio's plan:",
        },
        {
          kind: "list",
          items: [
            "Sales funnel — how many tickets reached Lead, Opportunity, RFQ, Quotation and Closed Won.",
            "Probability forecast — open value grouped by probability, with the weighted total.",
            "Stage mix — where every ticket sits right now.",
            "At-risk tickets — the eight most urgent, soonest deadline first.",
            "Why deals are lost — the reasons given when deals were closed, commonest first. This is how a company finds out it keeps losing on price.",
            "Stalled deals — open deals that have sat in one stage for 30 days or more.",
            "Open value by stage, Top clients by open value, and Open deals by urgency.",
            "Deals opened per month, Won and lost by month, and When deals arrive — the last year, and the last eight weeks.",
          ],
        },
        {
          kind: "p",
          text:
            "A widget your plan does not include shows as locked. A widget for a part of the department "
            + "your studio has switched off is not shown at all. At the bottom is a button to open the "
            + "Live view. The dashboard shows figures, not lists: the deals themselves are on the "
            + "Tickets screen.",
        },
        {
          kind: "p",
          text:
            "A deal's value, everywhere in the department, is the figure set on the ticket if there is "
            + "one, otherwise the total of its latest quotation.",
        },
      ],
    },
    {
      id: "crm-pipeline",
      heading: "The pipeline",
      blocks: [
        {
          kind: "p",
          text:
            "Every open deal as a card, in a column for each stage: Lead, Opportunity, Commit and "
            + "On-Hold. The card that has waited longest in its stage is at the top, because that is the "
            + "one to look at first.",
        },
        {
          kind: "list",
          items: [
            "Each card shows the reference, the title, the customer, the value, the probability with the weighted value, how many days it has been at this stage, and the deadline. The days turn amber at 30; an overdue deadline turns red.",
            "Click the reference to open the ticket.",
            "Above the columns: Open value (Lead, Opportunity and Commit — not On-Hold), Weighted, and Win rate — deals won out of all the deals decided. Win rate shows a dash until something has closed, because nothing decided is not 0%.",
            "Below the columns, the deals that have closed, counted by how they ended.",
          ],
        },
        {
          kind: "p",
          text:
            "The board is for looking. To move a deal, open it and change its Status. The two weighted "
            + "figures differ on purpose: the dashboard counts deals on hold, the board does not.",
        },
      ],
    },
    {
      id: "crm-leads",
      heading: "Leads waiting to be assigned",
      blocks: [
        {
          kind: "p",
          text:
            "Leads can arrive with nobody on them — from a campaign, a web form or Customer insights. "
            + "Until somebody is assigned, only the people who hold the right to assign leads can see "
            + "them; everybody else's lists leave them out.",
        },
        {
          kind: "p",
          text:
            "Those people see a panel at the top of Tickets: \"N leads waiting to be assigned\".",
        },
        {
          kind: "list",
          items: [
            "Late leads come first, then the strongest.",
            "Each lead shows its reference, the customer, the campaign, the contact details and the deadline, with a chip saying where it stands: waiting to be assigned, past its deadline and not assigned, or past its deadline with nobody having acted.",
            "Choose a sales executive and press Assign. They are told at once. On a lead that already has somebody the button reads Move to someone else.",
            "The clock restarts for the new person. Their first comment, or the first edit they save, counts as acting on the lead.",
            "A lead cannot be un-assigned — only moved to someone else.",
          ],
        },
        {
          kind: "p",
          text:
            "The same Assign control is on each ticket's own page, for the same people. A late lead is "
            + "also announced to them in their notifications, on the day it falls late and again after.",
        },
      ],
    },
    {
      id: "crm-score",
      heading: "The lead score",
      blocks: [
        {
          kind: "p",
          text:
            "Every ticket still at Lead carries a score from 0 to 100 and a band: Hot from 70, Warm "
            + "from 40, Cold below that. Click the score to see why — which facts earned points and "
            + "which are not known yet.",
        },
        {
          kind: "list",
          items: [
            "Can be reached — both an email and a phone. One of the two earns half.",
            "A company, not only a person.",
            "Said what they can spend — a client budget.",
            "Has bought before — a won deal with this customer, or half for another deal already under way.",
            "Has come back — filled in your forms more than once. Counted only where the studio keeps a consent ledger.",
            "Said what they want — the services, or half for just the industry.",
            "Told us about the job — a description.",
            "Came from a campaign.",
          ],
        },
        {
          kind: "p",
          text:
            "A lead nobody touches fades: after 14 days its score falls steadily, reaching half at 90 "
            + "days. A comment or a new form answer freshens it. The score is worked out every time it "
            + "is shown and never stored, so it is always current.",
        },
      ],
    },
    {
      id: "crm-tickets",
      heading: "The ticket list",
      blocks: [
        {
          kind: "p",
          text: "Every deal, newest first.",
        },
        {
          kind: "list",
          items: [
            "New ticket — raise a deal (next section). If you may only look, the button is replaced by \"View only\".",
            "Search — the title, customer, reference or description.",
            "Filters — customer, status, urgency, probability, value, and date ranges for created, deadline and updated. Clear all filters resets them.",
            "Columns — choose which columns you see. Actions is always shown; Reset to default puts them back.",
            "Your filters and columns are remembered in this browser only.",
            "Click a row, or Open, to go to the ticket's page. The list itself never changes a ticket.",
            "An amber stripe on the left marks a Lead or Opportunity that has not been sent to Quotations yet.",
          ],
        },
        {
          kind: "p",
          text:
            "The RFQ column says where the quotation is: Requested, In review, Rejected, Handled by "
            + "(somebody is building it) or Completed by (it is finished). \"N raised\" means the ticket "
            + "has asked more than once.",
        },
        {
          kind: "p",
          text:
            "Tickets are never deleted. A deal that went nowhere is closed as Dropped, with the reason, "
            + "so its history stays.",
        },
      ],
    },
    {
      id: "crm-new-ticket",
      heading: "Raising a ticket",
      blocks: [
        {
          kind: "p",
          text:
            "New ticket opens the form. Fields marked * are required, and Save ticket stays off until "
            + "they are filled.",
        },
        {
          kind: "list",
          items: [
            "Title * — what the work is.",
            "Client * — pick an existing customer or type a new name. A new name creates the customer when you save. The client cannot be changed once the ticket is raised.",
            "Contact and site — who you are dealing with, and where. Picking a known contact fills in their email, phone and position; picking a known site fills in its country, city and map link. What you type is added to the customer's record.",
            "Deadline * and Type of industry *.",
            "Client budget — what the customer said they can spend. The ticket's Value Quoted is not typed; it comes from its latest quotation.",
            "Probability — how likely the deal is, 0 to 100%. It drives the weighted forecast.",
            "Type of services * — at least one of the studio's service actions. If there are none, somebody must add them in Studio Settings → Service Actions first.",
            "Description.",
            "Which campaign brought them? — only when Marketing is on. Once set it stays, because the campaign is the original source.",
          ],
        },
        {
          kind: "p",
          text:
            "A new ticket starts at Lead, at Normal urgency, assigned to you. Status and Urgency appear "
            + "when you edit it.",
        },
        {
          kind: "p",
          text:
            "Leads that arrived from a campaign, a form or Customer insights have no deadline, industry "
            + "or services yet. Fill those in the first time you edit one — the form will not save "
            + "without them, even to close the lead.",
        },
      ],
    },
    {
      id: "crm-ticket-page",
      heading: "A ticket's own page",
      blocks: [
        {
          kind: "list",
          items: [
            "Edit — the same form, with Status, Urgency, and the reason when closing a deal as lost.",
            "The details — stage, urgency, deadline, who it is assigned to and who raised it, the source campaign, the value quoted, the budget, the site and a link to its map. A closed deal shows when it closed and why.",
            "Quotations — every quotation raised for this ticket, newest first, with its revision and status. Click one to read it.",
            "Comments — write in \"Add a comment\" and press Post. A comment cannot be edited or removed; the comments are the ticket's record of what was said.",
            "The customer card — the contact's name, number and email.",
            "Ticket timeline — when it was created, each quotation, the approval, each comment, and the last update.",
            "Request RFQ, Send for Approval and Submit PO — the three steps that move the deal forward, in the next two sections.",
          ],
        },
      ],
    },
    {
      id: "crm-rfq",
      heading: "Asking Quotations for a price",
      blocks: [
        {
          kind: "p",
          text:
            "Request RFQ hands the ticket to the Quotations department to be priced. It is offered while "
            + "the deal is at Lead or Opportunity.",
        },
        {
          kind: "steps",
          items: [
            "Press Request RFQ. A request is created carrying the ticket's reference, and everybody who builds quotations is told.",
            "A Lead moves to Opportunity by itself.",
            "The button turns grey and reads \"Quotation Sent\" while Quotations has it. You cannot ask twice at once.",
            "When the quotation is raised it appears under Quotations on the ticket, and Value Quoted follows its total.",
          ],
        },
        {
          kind: "p",
          text:
            "To have a quotation revised, press Request RFQ again once it has come back. The previous "
            + "quotation is locked as superseded, so what the customer was sent is never overwritten. "
            + "Once a quotation is approved the button disappears — a change after approval is a new "
            + "ticket.",
        },
        {
          kind: "p",
          text:
            "If Quotations turns the request down, a ticket still at Lead or Opportunity is closed as "
            + "lost by itself, with the reason \"Quotations turned the RFQ down\".",
        },
        {
          kind: "p",
          text:
            "Clicking a quotation opens it read-only: its lines, grouped as they were priced, then the "
            + "subtotal, the VAT and the total. Print produces it on the studio's own quotation layout.",
        },
      ],
    },
    {
      id: "crm-approval",
      heading: "Approval, and the customer's PO",
      blocks: [
        {
          kind: "p",
          text:
            "Both steps go to the people your studio names in Approval settings, and both show their "
            + "progress on the button itself. The person who sends something for approval is never the "
            + "one asked to approve it.",
        },
        {
          kind: "p",
          text: "Send for Approval asks for the latest finished quotation to be approved.",
        },
        {
          kind: "list",
          items: [
            "It reads \"Pending approval (1/2)\" while the steps are being signed, \"Quotation approved\" when it is done, and \"Rejected — send again\" if it was turned down.",
            "It is refused while a new RFQ is outstanding — wait for the revised quotation.",
            "If nobody is named to approve quotations, an Admin sets that up in Approval settings first. If you are the only approver on a step, somebody else must be named.",
          ],
        },
        {
          kind: "p",
          text: "Submit PO appears once the quotation is approved. When the customer sends their purchase order:",
        },
        {
          kind: "steps",
          items: [
            "Press Submit PO.",
            "Attach the PO file (up to 5 MB), or describe it — the PO number, the value, anything Finance needs — or both. One of the two is required.",
            "Press \"Submit PO for approval\".",
          ],
        },
        {
          kind: "p",
          text:
            "Approving the PO gives the project opened from that quotation its project number, which the "
            + "work is billed under. If the project is opened after the PO was approved, it gets its "
            + "number the moment it opens.",
        },
      ],
    },
    {
      id: "crm-winning",
      heading: "Winning and losing",
      blocks: [
        {
          kind: "p",
          text: "Closing is always a person's decision: edit the ticket and set its Status.",
        },
        {
          kind: "list",
          items: [
            "Closed Won needs a finished quotation.",
            "Closed Lost, Cancelled by Client and Dropped need the reason.",
            "Winning creates nothing by itself. Open the project in Projects from the approved quotation, and raise a sales order if the customer ordered goods. Both attach to the same deal.",
            "A won deal counts toward the campaign that brought it.",
          ],
        },
      ],
    },
    {
      id: "crm-live",
      heading: "Live view",
      blocks: [
        {
          kind: "p",
          text:
            "A full-screen table of tickets, meant to be left up on a wall screen. It refreshes every "
            + "five seconds, and at once whenever somebody changes a ticket.",
        },
        {
          kind: "list",
          items: [
            "The back arrow returns to CRM & Sales.",
            "Pause stops the refreshing on this screen; Resume starts it again. It also pauses by itself while the browser tab is hidden.",
            "The columns are chosen for everybody in Settings. Change columns takes you there, if you may change them.",
            "The Live view is a right of its own: somebody without it is told the screen is not theirs, even by typing its address.",
            "Nothing in the table can be clicked or changed.",
          ],
        },
      ],
    },
    {
      id: "crm-customers",
      heading: "Customers",
      blocks: [
        {
          kind: "p",
          text:
            "The companies you sell to. A customer is added here with Add client, or appears by itself "
            + "when a ticket, a quotation, a tender, a project or the till names a company that is not "
            + "on the list yet. A customer created at the till is named after the last digits of their "
            + "phone until somebody renames them here.",
        },
        {
          kind: "list",
          items: [
            "Search — the name, a contact, or a city.",
            "Click a customer's name to open their page.",
            "The list shows each customer's contacts, their sites (the pin opens the map), how many tickets they have, when they were added and by whom.",
            "Edit opens the customer's form.",
            "Delete asks once, then removes the customer for good. A customer with any ticket cannot be deleted at all: their deals are their history, and a ticket is closed, never deleted.",
          ],
        },
        {
          kind: "p",
          text: "The customer's form:",
        },
        {
          kind: "list",
          items: [
            "Company name * — must be unique. \"ACME\" and \"Acme \" are the same name, and the second is refused. The customer's code, used in ticket references such as ACME-001, is made from the name.",
            "Industry, Website, and Logo — an image up to 2 MB, with Upload, Change and Remove.",
            "Contacts — Add contact for each person: name, position, email, phone. Up to 20. A ticket adds its contact here by itself.",
            "Locations — Add location for each site: name, country, city, map link. Up to 20.",
            "Tags — the studio's own groupings (Regular, VIP, Wholesale…), kept under Settings → Master data → Client tags. The till uses them to decide which offers a customer gets.",
            "Notes.",
          ],
        },
        {
          kind: "p",
          text: "A customer's details are encrypted when they are stored.",
        },
      ],
    },
    {
      id: "crm-customer-page",
      heading: "A customer's page",
      blocks: [
        {
          kind: "p",
          text:
            "One relationship in one place. What you see depends on what you may open: deals, "
            + "quotations, contracts and projects each need their own access, and a part you cannot "
            + "open is left out entirely — from the totals as well. Two people can look at the same "
            + "customer and see different figures, and both are right.",
        },
        {
          kind: "list",
          items: [
            "Won — the value of the deals won.",
            "Open value — Lead, Opportunity and Commit, with the weighted value beneath. Deals on hold are listed but not counted.",
            "Under contract — what the signed contracts are worth now, approved variations included.",
            "Win rate — won out of decided. A dash until something is decided.",
          ],
        },
        {
          kind: "list",
          items: [
            "Contacts and Sites.",
            "Open deals, longest in stage first, and Decided deals with the reason each was lost. Click one to open its ticket.",
            "Agreed rates — next section.",
            "Quotations, Contracts (with how many variations are waiting) and Projects.",
            "Notes.",
          ],
        },
        {
          kind: "p",
          text:
            "Add a tender opens the tender register with this customer already chosen. It is there when "
            + "Tendering is on and you may create tenders.",
        },
      ],
    },
    {
      id: "crm-rates",
      heading: "Agreed rates",
      blocks: [
        {
          kind: "p",
          text:
            "A price this customer has been promised for an item, whatever the list says. When a "
            + "quotation is raised for them, each line is priced from the customer's agreed rate first, "
            + "then the item's sell price, then its cost — and the quotation says which one it used.",
        },
        {
          kind: "steps",
          items: [
            "On the customer's page, press Edit rates.",
            "Add a rate, choose the item, type the agreed price and, if it helps, a note.",
            "Save.",
          ],
        },
        {
          kind: "list",
          items: [
            "A price of 0, or left blank, removes that rate.",
            "Rates are in the studio's own currency.",
            "Whoever builds a quotation sees the price that results, never the customer's whole price list.",
            "An item that has since been deleted shows as \"This item no longer exists\".",
          ],
        },
      ],
    },
    {
      id: "crm-insights",
      heading: "Customer insights",
      blocks: [
        {
          kind: "p",
          text:
            "Which customers are buying more, which are buying less, and which have stopped. It looks at "
            + "seven periods and splits them into three blocks: the first three, the next three, and now.",
        },
        {
          kind: "list",
          items: [
            "Period — months, quarters, half-years or years.",
            "Judge by — value, or number of sales.",
            "Last period — the last complete one, or this one so far.",
            "Download CSV — the table as a spreadsheet, for the pattern you have chosen.",
          ],
        },
        {
          kind: "p",
          text:
            "A sale is an issued invoice, less its credit notes, or a till receipt that names the "
            + "customer. In each block the customers who bought are split into thirds — Low, Medium, "
            + "High — so the levels follow your own studio rather than a fixed amount.",
        },
        {
          kind: "list",
          items: [
            "Growing — bought in all three blocks, more now than at first.",
            "Fading — all three, less now than at first.",
            "Loyal — all three, steadily at Medium or High.",
            "Steady — all three, at a lower level.",
            "Slipping — bought at first and in the middle, not now.",
            "Returning — came back after a gap.",
            "Lapsed — bought only at first.",
            "Stopped — bought only in the middle.",
            "New — first bought recently.",
            "Dormant — has bought before, but nothing in these seven periods.",
          ],
        },
        {
          kind: "p",
          text:
            "Click a pattern's tile to show only those customers; click it again to show everybody. "
            + "Search, the pattern list and \"Changed pattern since the period before\" narrow the table "
            + "further, and \"Was\" shows the pattern a customer had one period earlier.",
        },
        {
          kind: "p",
          text:
            "Who is selling plots the number of sales against their value — by person, by team or by "
            + "channel — from won deals and till sales.",
        },
        {
          kind: "p",
          text: "Sending customers back to Sales, for those allowed to:",
        },
        {
          kind: "steps",
          items: [
            "Tick the customers, or press Choose all shown. A customer with a deal already open cannot be ticked.",
            "Press Send N to Sales.",
            "Choose the campaign if there is one, and write what Sales should do — \"offer 10% on their next order\".",
            "Press Send. Each customer becomes a lead waiting to be assigned, saying why it was sent, and whoever assigns leads is told once for the whole batch.",
          ],
        },
        {
          kind: "p",
          text:
            "At most 100 at a time. A customer known only from the name on an invoice is added to "
            + "Customers when they are sent.",
        },
      ],
    },
    {
      id: "crm-contracts",
      heading: "Contracts and variations",
      blocks: [
        {
          kind: "p",
          text:
            "What has been signed with each customer. Each contract shows its current value in large "
            + "figures: the signed value plus every APPROVED variation. A variation that has only been "
            + "submitted is a claim, not money, and does not count.",
        },
        {
          kind: "list",
          items: [
            "Click a contract's number to see its dates, its notes and the variations raised against it. \"N waiting\" counts the variations waiting for an answer.",
            "This screen has no button for recording a new contract yet; it shows the contracts already recorded against deals.",
            "A contract is never deleted — it is the deal's baseline.",
          ],
        },
        {
          kind: "p",
          text: "A variation is a change to what was agreed:",
        },
        {
          kind: "steps",
          items: [
            "Press Raise a variation on the contract.",
            "Say what is changing, the scope, the change in value, and the change in time in days. Both changes are signed — a negative value is an omission. Give the change, never the new total.",
            "Save. It is a draft, and you can edit it until it is submitted.",
            "Press Submit for an answer. If the amount is under every approval limit it is approved at once and the contract's value moves. Otherwise it goes to the approvers, and Open in Approvals shows where it stands.",
          ],
        },
        {
          kind: "p",
          text:
            "Variations are answered on the Approvals page, not here. A turned-down variation shows "
            + "the reason. The change in time does not move the contract's end date; it records what the "
            + "variation grants.",
        },
      ],
    },
    {
      id: "crm-orders",
      heading: "Sales orders",
      blocks: [
        {
          kind: "p",
          text:
            "What a customer has actually ordered — from an accepted quotation, as a call-off against a "
            + "contract, or on its own.",
        },
        {
          kind: "steps",
          items: [
            "Press New order. Give it a title and choose the deal it belongs to (open or won); the customer fills in from the deal.",
            "If it applies, choose the quotation it comes from and the contract it is called off against. Choosing a quotation does not copy its lines.",
            "Add the lines: description, quantity and unit price, and — where the studio charges VAT — the tax treatment: Standard, Zero-rated or Exempt. The subtotal, VAT and total are worked out as you type.",
            "Save. The order gets its SO number and starts as Draft.",
          ],
        },
        {
          kind: "list",
          items: [
            "Draft → Mark Confirmed (it needs at least one line) or Mark Cancelled.",
            "Confirmed → Mark Fulfilled or Mark Cancelled.",
            "Fulfilled and Cancelled are final.",
          ],
        },
        {
          kind: "list",
          items: [
            "The lines and the VAT rate are fixed once the order is confirmed, so its total is what the customer agreed to. The title and dates can still be corrected.",
            "Only a draft can be deleted. A confirmed order is cancelled instead, so the record survives, and its number is never issued again.",
            "Today an order records what was ordered. It does not reserve stock, raise an invoice or open a project.",
          ],
        },
      ],
    },
    {
      id: "crm-settings",
      heading: "Settings",
      blocks: [
        {
          kind: "list",
          items: [
            "Cities — offered when a ticket names its site's city.",
            "Contact positions — offered for a contact's position.",
          ],
        },
        {
          kind: "p",
          text:
            "Both are suggestions, not a closed list — anything can still be typed. Type a value and "
            + "press Add or Enter; the × removes one. Each change saves at once.",
        },
        {
          kind: "list",
          items: [
            "Live view columns — tick the columns the Live view shows and press Save columns. It applies to everybody. If you untick them all, the default columns come back.",
          ],
        },
        {
          kind: "p",
          text:
            "The services a ticket offers are not kept here: they are the studio's Service Actions, in "
            + "Studio Settings.",
        },
      ],
    },
    {
      id: "crm-who",
      heading: "Who does what",
      blocks: [
        {
          kind: "list",
          items: [
            "Viewing tickets, raising them and editing them are three rights. There is no right to delete a ticket, because nobody can.",
            "Assigning leads is a right of its own. Without it, leads nobody is on are hidden from you everywhere.",
            "Moving a deal's stage is editing its ticket — there is no separate pipeline right.",
            "Customers: view, create, edit and delete. Agreed rates need edit.",
            "Customer insights: viewing, downloading, and sending customers to Sales are three rights.",
            "Contracts: viewing, raising variations, and editing and submitting them. Answering a variation is an approval, set up in Approval settings.",
            "Sales orders: view, create, edit (the status moves included) and delete.",
            "Settings: view and edit.",
            "The dashboard, the pipeline and the Live view are for looking only, and each is a right of its own — the dashboard included.",
          ],
        },
      ],
    },
  ],
};

export const crmSalesAr: ManualArticle = {
  key: "crm-sales",
  title: "إدارة العملاء والمبيعات",
  summary:
    "إيجاد العمل والفوز به: العملاء المحتملون الذين يصلون، والصفقات التي تتابعها لكل عميل، "
    + "وعرض السعر الذي تطلبه من قسم عروض الأسعار، وما وقعه العميل وما طلبه.",
  sections: [
    {
      id: "crm-what",
      heading: "ما هو",
      blocks: [
        {
          kind: "p",
          text:
            "يتابع هذا القسم كل من تبيع له الشركة وكل عمل تسعى إليه. السجل الأساسي فيه هو التذكرة: "
            + "صفقة واحدة لعميل واحد، من أول استفسار إلى يوم الفوز بها أو خسارتها. وكل ما عداها هنا إما "
            + "طريقة لعرض التذاكر، وإما سجل يخص عميلا.",
        },
        {
          kind: "list",
          items: [
            "لوحة المعلومات — الصفحة الأولى للقسم: ما هو مفتوح، وكم يساوي، وما هو في خطر.",
            "المسار — كل صفقة مفتوحة بطاقة في المرحلة التي بلغتها.",
            "التذاكر — قائمة الصفقات، وطابور العملاء المحتملين الذين ينتظرون من يتولاهم، وصفحة كل صفقة.",
            "العملاء — الشركات التي تبيع لها، ولكل منها صفحة تعرض العلاقة كاملة.",
            "تحليلات العملاء — من يشتري أكثر، ومن يشتري أقل، ومن توقف، وطريقة لإعادتهم إلى المبيعات.",
            "العقود — ما وقع، والتغييرات المرفوعة عليه.",
            "أوامر البيع — ما طلبه العميل فعلا.",
            "العرض المباشر — جدول تذاكر بملء الشاشة لشاشة معلقة على الحائط.",
            "الإعدادات — الاقتراحات التي تعرضها النماذج، وأعمدة العرض المباشر.",
          ],
        },
        {
          kind: "p",
          text:
            "لا يبنى عرض السعر هنا. المبيعات تطلبه من قسم عروض الأسعار — طلب عرض سعر — ويعود العرض "
            + "المسعر إلى التذكرة. فالمبيعات ترفع الطلب وتستلم الجواب، ولا تقوم بالتسعير.",
        },
      ],
    },
    {
      id: "crm-flow",
      heading: "حياة الصفقة",
      blocks: [
        {
          kind: "steps",
          items: [
            "يصل عميل محتمل: يرفع أحدهم تذكرة بيده، أو ترسلها حملة أو نموذج على الموقع أو تحليلات العملاء.",
            "إن وصل ولم يسند إلى أحد، أسنده من يملك الإسناد إلى مندوب مبيعات.",
            "يعمل المندوب عليه: يكمل ما يحتاجه العميل، ويعلق، ويحدد مدى احتمال الصفقة.",
            "«طلب عرض سعر» يسلم التذكرة إلى قسم عروض الأسعار، ويصير العميل المحتمل فرصة.",
            "يسعرها قسم عروض الأسعار فيظهر العرض على التذكرة — أو يرفض الطلب، فتغلق الصفقة خاسرة.",
            "«إرسال للاعتماد» يطلب من الأشخاص المسمين في إعدادات الموافقات اعتماد العرض.",
            "يرسل العميل أمر الشراء، فيسجله زر «أرسل أمر الشراء» ويرسله للاعتماد.",
            "تغلق التذكرة: فوز، أو خسارة مع ذكر السبب.",
          ],
        },
        {
          kind: "p",
          text:
            "الفوز لا ينشئ شيئا بنفسه. يفتح المشروع في قسم المشاريع من العرض المعتمد، ويرفع أمر البيع "
            + "من شاشة أوامر البيع، وكل منهما يرتبط بالصفقة نفسها — ولهذا تستطيع صفحة العميل أن تعرضها "
            + "كلها معا.",
        },
      ],
    },
    {
      id: "crm-stages",
      heading: "المراحل، وما يرفضه النظام",
      blocks: [
        {
          kind: "p",
          text: "التذكرة دائما في واحدة من ثماني مراحل.",
        },
        {
          kind: "list",
          items: [
            "عميل محتمل (Lead) — تواصل أول لم يؤهله أحد بعد. كل تذكرة جديدة تبدأ هنا.",
            "فرصة (Opportunity) — تستحق المتابعة. أول طلب عرض سعر ينقل العميل المحتمل إليها تلقائيا.",
            "التزام (Commit) — يتوقع أن يمضي العميل في الصفقة.",
            "معلقة (On-Hold) — متوقفة مؤقتا. تبقى على اللوحة لكنها لا تدخل في التوقعات.",
            "فوز (Closed Won) — وافق العميل.",
            "خسارة، أو إلغاء من العميل، أو إسقاط — الطرق الثلاث التي تنتهي بها الصفقة دون عمل.",
          ],
        },
        {
          kind: "p",
          text:
            "تغير المرحلة بتعديل التذكرة واختيار الحالة. ولا تعرض القائمة إلا المراحل المسموح بالوصول "
            + "إليها من موضع الصفقة:",
        },
        {
          kind: "list",
          items: [
            "الصفقة المغلقة لا يعاد فتحها. متى صارت التذكرة فوزا أو خسارة أو إلغاء أو إسقاطا لا تتغير مرحلتها أبدا؛ والعمل الجديد للعميل نفسه تذكرة جديدة.",
            "الالتزام والفوز يحتاجان عرض سعر منجزا على التذكرة — مكتملا أو مرسلا أو معتمدا، وغير مرفوض.",
            "إغلاق الصفقة خسارة أو إلغاء من العميل أو إسقاطا يسأل عن السبب. ومن هذه الأسباب تبنى لوحة «لماذا نخسر الصفقات»، فاكتب السبب الحقيقي — «السعر»، «ذهب إلى منافس» — لا «خسرنا».",
          ],
        },
        {
          kind: "p",
          text:
            "كل تغيير في المرحلة يسجل مع من قام به ومتى. ومن هذا السجل تحسب «الأيام في المرحلة» على "
            + "لوحة المسار.",
        },
      ],
    },
    {
      id: "crm-dashboard",
      heading: "لوحة المعلومات",
      blocks: [
        {
          kind: "p",
          text:
            "الصفحة الأولى للقسم. لا تغير شيئا؛ تقرأ التذاكر وترسمها. بعض الاستوديوهات تجعل لوحات "
            + "المعلومات بصلاحية خاصة — ومن لا يملكها يرى ملاحظة تقول ذلك، وتعمل كل شاشات القائمة "
            + "الجانبية كالمعتاد.",
        },
        {
          kind: "list",
          items: [
            "التذاكر المفتوحة — الصفقات التي لم تغلق، ومنها المعلقة. انقر عليها لفتح قائمة التذاكر.",
            "المسار المرجح — قيمة كل صفقة مفتوحة مضروبة في احتمالها، مجموعة. والصفقات المعلقة تحسب هنا.",
            "الفوز وقيمة الفوز — كم صفقة ربحت، وكم كانت تساوي.",
            "في خطر — صفقات مفتوحة إلحاحها عال أو حرج، أو موعدها خلال 14 يوما، أو متأخرة.",
          ],
        },
        {
          kind: "p",
          text: "وتحت الأرقام، بحسب باقة الاستوديو:",
        },
        {
          kind: "list",
          items: [
            "قمع المبيعات — كم تذكرة بلغت العميل المحتمل، ثم الفرصة، ثم طلب عرض السعر، ثم العرض، ثم الفوز.",
            "توقعات الاحتمال — القيمة المفتوحة مجمعة بحسب الاحتمال، مع الإجمالي المرجح.",
            "توزيع المراحل — أين تقع كل تذكرة الآن.",
            "التذاكر المعرضة للخطر — أكثر ثمان إلحاحا، الأقرب موعدا أولا.",
            "لماذا نخسر الصفقات — الأسباب التي ذكرت عند الإغلاق، الأكثر تكرارا أولا. هكذا تعرف الشركة أنها تخسر دائما بسبب السعر.",
            "الصفقات الراكدة — صفقات مفتوحة بقيت في مرحلة واحدة 30 يوما أو أكثر.",
            "القيمة المفتوحة بحسب المرحلة، وأكبر العملاء قيمة مفتوحة، والصفقات المفتوحة بحسب الإلحاح.",
            "الصفقات المفتوحة شهريا، والفوز والخسارة شهريا، ومتى تصل الصفقات — لآخر سنة، ولآخر ثمانية أسابيع.",
          ],
        },
        {
          kind: "p",
          text:
            "الأداة التي لا تشملها باقتك تظهر مقفلة. والأداة الخاصة بجزء من القسم أوقفه الاستوديو لا "
            + "تظهر أصلا. وفي الأسفل زر لفتح العرض المباشر. ولوحة المعلومات تعرض أرقاما لا قوائم: "
            + "الصفقات نفسها في شاشة التذاكر.",
        },
        {
          kind: "p",
          text:
            "قيمة الصفقة، في كل مكان في القسم، هي الرقم المحدد على التذكرة إن وجد، وإلا فإجمالي أحدث "
            + "عرض سعر لها.",
        },
      ],
    },
    {
      id: "crm-pipeline",
      heading: "المسار",
      blocks: [
        {
          kind: "p",
          text:
            "كل صفقة مفتوحة بطاقة، في عمود لكل مرحلة: العميل المحتمل، والفرصة، والالتزام، والمعلقة. "
            + "البطاقة التي طال انتظارها في مرحلتها في الأعلى، لأنها أولى ما ينظر إليه.",
        },
        {
          kind: "list",
          items: [
            "تعرض كل بطاقة المرجع والعنوان والعميل والقيمة، والاحتمال مع القيمة المرجحة، وعدد الأيام في هذه المرحلة، والموعد. تصير الأيام كهرمانية عند 30، ويصير الموعد المتأخر أحمر.",
            "انقر على المرجع لفتح التذكرة.",
            "فوق الأعمدة: القيمة المفتوحة (العميل المحتمل والفرصة والالتزام — دون المعلقة)، والقيمة المرجحة، ونسبة الفوز — الصفقات الرابحة من كل الصفقات المحسومة. تظهر نسبة الفوز شرطة حتى يغلق شيء، لأن عدم حسم شيء ليس 0٪.",
            "وتحت الأعمدة الصفقات المغلقة، معدودة بحسب طريقة انتهائها.",
          ],
        },
        {
          kind: "p",
          text:
            "اللوحة للنظر. لنقل صفقة افتحها وغير حالتها. والرقمان المرجحان يختلفان عمدا: لوحة المعلومات "
            + "تحسب الصفقات المعلقة، ولوحة المسار لا تحسبها.",
        },
      ],
    },
    {
      id: "crm-leads",
      heading: "عملاء محتملون بانتظار الإسناد",
      blocks: [
        {
          kind: "p",
          text:
            "قد يصل العميل المحتمل دون أن يسند إلى أحد — من حملة، أو نموذج على الموقع، أو تحليلات "
            + "العملاء. وحتى يسند، لا يراه إلا من يملك صلاحية إسناد العملاء المحتملين؛ وتخفيه قوائم "
            + "الآخرين.",
        },
        {
          kind: "p",
          text: "ويرى هؤلاء لوحة في أعلى التذاكر: «N عملاء محتملين بانتظار الإسناد».",
        },
        {
          kind: "list",
          items: [
            "المتأخرون أولا، ثم الأقوى.",
            "يعرض كل عميل محتمل مرجعه والعميل والحملة وبيانات التواصل والموعد، مع شارة تقول موضعه: بانتظار الإسناد، أو تجاوز موعده ولم يسند، أو تجاوز موعده ولم يتصرف أحد.",
            "اختر مندوب مبيعات واضغط «إسناد»، فيبلغ فورا. وعلى عميل محتمل مسند أصلا يصير الزر «نقل إلى شخص آخر».",
            "يبدأ العداد من جديد للشخص الجديد. أول تعليق له، أو أول تعديل يحفظه، يعد تصرفا في العميل المحتمل.",
            "لا يلغى إسناد عميل محتمل — ينقل إلى شخص آخر فقط.",
          ],
        },
        {
          kind: "p",
          text:
            "وأداة الإسناد نفسها موجودة في صفحة كل تذكرة، للأشخاص أنفسهم. ويبلغون بالعميل المحتمل "
            + "المتأخر في إشعاراتهم، يوم يتأخر ثم بعده.",
        },
      ],
    },
    {
      id: "crm-score",
      heading: "تقييم العميل المحتمل",
      blocks: [
        {
          kind: "p",
          text:
            "كل تذكرة ما زالت في مرحلة العميل المحتمل تحمل تقييما من 0 إلى 100 وفئة: ساخن من 70، "
            + "ودافئ من 40، وبارد دون ذلك. انقر على التقييم لترى السبب — ما الذي كسب نقاطا وما الذي "
            + "لم يعرف بعد.",
        },
        {
          kind: "list",
          items: [
            "يمكن الوصول إليه — بريد وهاتف معا. وأحدهما يكسب النصف.",
            "شركة، لا شخص فقط.",
            "ذكر ما يستطيع إنفاقه — ميزانية العميل.",
            "اشترى من قبل — صفقة رابحة مع هذا العميل، أو النصف لصفقة أخرى جارية.",
            "عاد مرة أخرى — ملأ نماذجكم أكثر من مرة. ويحسب فقط حيث يحتفظ الاستوديو بسجل موافقات.",
            "ذكر ما يريده — الخدمات، أو النصف للمجال وحده.",
            "أخبرنا عن العمل — وصف.",
            "جاء من حملة.",
          ],
        },
        {
          kind: "p",
          text:
            "العميل المحتمل الذي لا يلمسه أحد يخفت: بعد 14 يوما ينخفض تقييمه بانتظام حتى يبلغ النصف "
            + "عند 90 يوما. والتعليق أو جواب جديد على نموذج ينعشه. ويحسب التقييم في كل مرة يعرض فيها "
            + "ولا يخزن، فهو دائما حالي.",
        },
      ],
    },
    {
      id: "crm-tickets",
      heading: "قائمة التذاكر",
      blocks: [
        {
          kind: "p",
          text: "كل صفقة، الأحدث أولا.",
        },
        {
          kind: "list",
          items: [
            "«تذكرة جديدة» — رفع صفقة (القسم التالي). ومن يملك النظر فقط يرى «للعرض فقط» مكان الزر.",
            "البحث — في العنوان أو العميل أو المرجع أو الوصف.",
            "المرشحات — العميل، والحالة، والإلحاح، والاحتمال، والقيمة، ونطاقات تاريخ الإنشاء والموعد والتحديث. «مسح كل المرشحات» يعيدها.",
            "«الأعمدة» — اختر الأعمدة التي تراها. عمود الإجراءات يظهر دائما، و«إعادة الافتراضي» يرجعها.",
            "تحفظ مرشحاتك وأعمدتك في هذا المتصفح وحده.",
            "انقر على صف، أو على «فتح»، للذهاب إلى صفحة التذكرة. والقائمة نفسها لا تغير أي تذكرة.",
            "الشريط الكهرماني على الجانب يميز عميلا محتملا أو فرصة لم ترسل إلى قسم عروض الأسعار بعد.",
          ],
        },
        {
          kind: "p",
          text:
            "عمود طلب عرض السعر يقول أين وصل العرض: مطلوب، قيد المراجعة، مرفوض، يتولاه (أحدهم يبنيه)، "
            + "أو أكمله (انتهى). و«رفع N» يعني أن التذكرة طلبت أكثر من مرة.",
        },
        {
          kind: "p",
          text:
            "التذاكر لا تحذف أبدا. الصفقة التي لم تثمر تغلق «إسقاطا» مع السبب، فيبقى تاريخها.",
        },
      ],
    },
    {
      id: "crm-new-ticket",
      heading: "رفع تذكرة",
      blocks: [
        {
          kind: "p",
          text:
            "«تذكرة جديدة» يفتح النموذج. الحقول المعلمة بـ * مطلوبة، ويبقى «حفظ التذكرة» معطلا حتى "
            + "تملأ.",
        },
        {
          kind: "list",
          items: [
            "العنوان * — ما هو العمل.",
            "العميل * — اختر عميلا موجودا أو اكتب اسما جديدا. الاسم الجديد ينشئ العميل عند الحفظ. ولا يتغير العميل بعد رفع التذكرة.",
            "جهة الاتصال والموقع — من تتعامل معه، وأين. اختيار جهة اتصال معروفة يملأ بريدها وهاتفها ومنصبها؛ واختيار موقع معروف يملأ دولته ومدينته ورابط خريطته. وما تكتبه يضاف إلى سجل العميل.",
            "الموعد * ونوع المجال *.",
            "ميزانية العميل — ما قال العميل إنه يستطيع إنفاقه. أما «القيمة المعروضة» فلا تكتب؛ تأتي من أحدث عرض سعر.",
            "الاحتمال — مدى احتمال الصفقة، من 0 إلى 100٪. وعليه تبنى التوقعات المرجحة.",
            "نوع الخدمات * — واحدة على الأقل من خدمات الاستوديو. إن لم توجد، فليضفها أحدهم أولا في إعدادات الاستوديو ← الخدمات.",
            "الوصف.",
            "«أي حملة جاءت به؟» — فقط حين يكون قسم التسويق مفعلا. ومتى حددت بقيت، لأن الحملة هي المصدر الأصلي.",
          ],
        },
        {
          kind: "p",
          text:
            "تبدأ التذكرة الجديدة عميلا محتملا، بإلحاح عادي، ومسندة إليك. وتظهر الحالة والإلحاح عند "
            + "تعديلها.",
        },
        {
          kind: "p",
          text:
            "العملاء المحتملون الذين وصلوا من حملة أو نموذج أو تحليلات العملاء لا موعد لهم ولا مجال ولا "
            + "خدمات بعد. املأها أول مرة تعدل فيها أحدهم — فالنموذج لا يحفظ دونها، ولو لإغلاقه.",
        },
      ],
    },
    {
      id: "crm-ticket-page",
      heading: "صفحة التذكرة",
      blocks: [
        {
          kind: "list",
          items: [
            "«تعديل» — النموذج نفسه، مع الحالة والإلحاح، والسبب عند إغلاق الصفقة خاسرة.",
            "التفاصيل — المرحلة، والإلحاح، والموعد، ومن أسندت إليه ومن رفعها، والحملة المصدر، والقيمة المعروضة، والميزانية، والموقع ورابط خريطته. والصفقة المغلقة تعرض متى أغلقت ولماذا.",
            "عروض الأسعار — كل عرض رفع لهذه التذكرة، الأحدث أولا، مع مراجعته وحالته. انقر على أحدها لقراءته.",
            "التعليقات — اكتب في «أضف تعليقا» واضغط «نشر». التعليق لا يعدل ولا يحذف؛ فالتعليقات سجل التذكرة لما قيل.",
            "بطاقة العميل — اسم جهة الاتصال ورقمها وبريدها.",
            "المسار الزمني للتذكرة — متى أنشئت، وكل عرض سعر، والاعتماد، وكل تعليق، وآخر تحديث.",
            "«طلب عرض سعر» و«إرسال للاعتماد» و«أرسل أمر الشراء» — الخطوات الثلاث التي تدفع الصفقة إلى الأمام، في القسمين التاليين.",
          ],
        },
      ],
    },
    {
      id: "crm-rfq",
      heading: "طلب السعر من قسم عروض الأسعار",
      blocks: [
        {
          kind: "p",
          text:
            "«طلب عرض سعر» يسلم التذكرة إلى قسم عروض الأسعار ليسعرها. ويعرض ما دامت الصفقة عميلا "
            + "محتملا أو فرصة.",
        },
        {
          kind: "steps",
          items: [
            "اضغط «طلب عرض سعر». ينشأ طلب يحمل مرجع التذكرة، ويبلغ كل من يبني عروض الأسعار.",
            "ينتقل العميل المحتمل إلى فرصة تلقائيا.",
            "يصير الزر رماديا ويقرأ «أرسل عرض السعر» ما دام الطلب عند قسم عروض الأسعار. لا تستطيع الطلب مرتين في الوقت نفسه.",
            "حين يرفع العرض يظهر تحت عروض الأسعار في التذكرة، وتتبع «القيمة المعروضة» إجماليه.",
          ],
        },
        {
          kind: "p",
          text:
            "لمراجعة عرض، اضغط «طلب عرض سعر» مرة أخرى بعد عودته. يقفل العرض السابق على أنه مستبدل، "
            + "فلا يكتب فوق ما أرسل إلى العميل أبدا. ومتى اعتمد العرض اختفى الزر — فالتغيير بعد الاعتماد "
            + "تذكرة جديدة.",
        },
        {
          kind: "p",
          text:
            "إن رفض قسم عروض الأسعار الطلب، تغلق التذكرة التي ما زالت عميلا محتملا أو فرصة خاسرة "
            + "تلقائيا، والسبب «قسم عروض الأسعار رفض طلب عرض السعر».",
        },
        {
          kind: "p",
          text:
            "النقر على عرض سعر يفتحه للقراءة فقط: بنوده مجمعة كما سعرت، ثم المجموع الفرعي والضريبة "
            + "والإجمالي. و«طباعة» تخرجه على قالب عرض السعر الخاص بالاستوديو.",
        },
      ],
    },
    {
      id: "crm-approval",
      heading: "الاعتماد، وأمر شراء العميل",
      blocks: [
        {
          kind: "p",
          text:
            "الخطوتان تذهبان إلى الأشخاص الذين يسميهم الاستوديو في إعدادات الموافقات، وكلتاهما تعرض "
            + "تقدمها على الزر نفسه. ومن يرسل شيئا للاعتماد لا يطلب منه اعتماده.",
        },
        {
          kind: "p",
          text: "«إرسال للاعتماد» يطلب اعتماد أحدث عرض سعر منجز.",
        },
        {
          kind: "list",
          items: [
            "يقرأ «بانتظار الاعتماد (1/2)» ما دامت المراحل توقع، و«اعتمد عرض السعر» حين يتم، و«رفض — أرسل مجددا» إن رفض.",
            "يرفض ما دام طلب عرض سعر جديد قائما — انتظر العرض المراجع.",
            "إن لم يسم أحد لاعتماد عروض الأسعار، فعلى المسؤول ضبط ذلك في إعدادات الموافقات أولا. وإن كنت المعتمد الوحيد في مرحلة، وجب تسمية غيرك.",
          ],
        },
        {
          kind: "p",
          text: "ويظهر «أرسل أمر الشراء» بعد اعتماد العرض. حين يرسل العميل أمر الشراء:",
        },
        {
          kind: "steps",
          items: [
            "اضغط «أرسل أمر الشراء».",
            "أرفق ملف أمر الشراء (حتى 5 ميغابايت)، أو صفه — رقمه وقيمته وما تحتاجه المالية — أو الاثنين. أحدهما مطلوب.",
            "اضغط «إرسال أمر الشراء للاعتماد».",
          ],
        },
        {
          kind: "p",
          text:
            "اعتماد أمر الشراء يعطي المشروع المفتوح من ذلك العرض رقم مشروعه، الذي يفوتر العمل عليه. "
            + "وإن فتح المشروع بعد اعتماد أمر الشراء، أخذ رقمه لحظة فتحه.",
        },
      ],
    },
    {
      id: "crm-winning",
      heading: "الفوز والخسارة",
      blocks: [
        {
          kind: "p",
          text: "الإغلاق قرار شخص دائما: عدل التذكرة وحدد حالتها.",
        },
        {
          kind: "list",
          items: [
            "الفوز يحتاج عرض سعر منجزا.",
            "الخسارة والإلغاء من العميل والإسقاط تحتاج السبب.",
            "الفوز لا ينشئ شيئا بنفسه. افتح المشروع في قسم المشاريع من العرض المعتمد، وارفع أمر بيع إن طلب العميل بضاعة. وكلاهما يرتبط بالصفقة نفسها.",
            "الصفقة الرابحة تحسب للحملة التي جاءت بها.",
          ],
        },
      ],
    },
    {
      id: "crm-live",
      heading: "العرض المباشر",
      blocks: [
        {
          kind: "p",
          text:
            "جدول تذاكر بملء الشاشة، ليترك على شاشة معلقة. يحدث نفسه كل خمس ثوان، وفورا متى غير "
            + "أحدهم تذكرة.",
        },
        {
          kind: "list",
          items: [
            "سهم الرجوع يعيدك إلى إدارة العملاء والمبيعات.",
            "«إيقاف مؤقت» يوقف التحديث على هذه الشاشة، و«استئناف» يعيده. ويتوقف تلقائيا ما دام تبويب المتصفح مخفيا.",
            "الأعمدة تختار للجميع في الإعدادات. و«غير الأعمدة» يأخذك إليها إن كنت تملك تغييرها.",
            "العرض المباشر صلاحية مستقلة: من لا يملكها يقال له إن الشاشة ليست له، ولو كتب عنوانها.",
            "لا شيء في الجدول ينقر أو يغير.",
          ],
        },
      ],
    },
    {
      id: "crm-customers",
      heading: "العملاء",
      blocks: [
        {
          kind: "p",
          text:
            "الشركات التي تبيع لها. يضاف العميل هنا بـ«إضافة عميل»، أو يظهر تلقائيا حين تسمي تذكرة أو "
            + "عرض سعر أو مناقصة أو مشروع أو نقطة البيع شركة ليست في القائمة. والعميل الذي ينشأ عند "
            + "نقطة البيع يسمى بآخر أرقام هاتفه حتى يعيد أحدهم تسميته هنا.",
        },
        {
          kind: "list",
          items: [
            "البحث — بالاسم، أو جهة اتصال، أو مدينة.",
            "انقر على اسم العميل لفتح صفحته.",
            "تعرض القائمة جهات اتصال كل عميل، ومواقعه (الدبوس يفتح الخريطة)، وعدد تذاكره، ومتى أضيف ومن أضافه.",
            "«تعديل» يفتح نموذج العميل.",
            "«حذف» يسأل مرة، ثم يزيل العميل نهائيا. والعميل الذي لديه أي تذكرة لا يحذف أصلا: صفقاته تاريخه، والتذكرة تغلق ولا تحذف.",
          ],
        },
        {
          kind: "p",
          text: "نموذج العميل:",
        },
        {
          kind: "list",
          items: [
            "اسم الشركة * — يجب أن يكون فريدا. «ACME» و«Acme » اسم واحد، والثاني يرفض. ومن الاسم يصنع رمز العميل الذي تستخدمه مراجع التذاكر مثل ACME-001.",
            "المجال، والموقع الإلكتروني، والشعار — صورة حتى 2 ميغابايت، مع رفع وتغيير وإزالة.",
            "جهات الاتصال — «إضافة جهة اتصال» لكل شخص: الاسم، والمنصب، والبريد، والهاتف. حتى 20. والتذكرة تضيف جهة اتصالها هنا تلقائيا.",
            "المواقع — «إضافة موقع» لكل موقع: الاسم، والدولة، والمدينة، ورابط الخريطة. حتى 20.",
            "الوسوم — تصنيفات الاستوديو الخاصة (دائم، مميز، جملة…)، وتدار من الإعدادات ← البيانات الأساسية ← وسوم العملاء. وتستخدمها نقطة البيع لتقرر أي العروض يحصل عليها العميل.",
            "ملاحظات.",
          ],
        },
        {
          kind: "p",
          text: "بيانات العميل تشفر عند تخزينها.",
        },
      ],
    },
    {
      id: "crm-customer-page",
      heading: "صفحة العميل",
      blocks: [
        {
          kind: "p",
          text:
            "العلاقة كلها في مكان واحد. وما تراه يعتمد على ما يحق لك فتحه: الصفقات وعروض الأسعار "
            + "والعقود والمشاريع لكل منها صلاحيته، والجزء الذي لا تملك فتحه يغيب كليا — من المجاميع "
            + "أيضا. قد ينظر شخصان إلى العميل نفسه فيريان أرقاما مختلفة، وكلاهما محق.",
        },
        {
          kind: "list",
          items: [
            "المربوح — قيمة الصفقات الرابحة.",
            "قيمة المفتوح — العميل المحتمل والفرصة والالتزام، وتحتها القيمة المرجحة. والصفقات المعلقة تعرض ولا تحسب.",
            "بموجب عقد — ما تساويه العقود الموقعة الآن، شاملة التغييرات المعتمدة.",
            "نسبة الفوز — الرابحة من المحسومة. شرطة حتى يحسم شيء.",
          ],
        },
        {
          kind: "list",
          items: [
            "جهات الاتصال والمواقع.",
            "الصفقات المفتوحة، الأطول بقاء في مرحلتها أولا، والصفقات المحسومة مع سبب خسارة كل منها. انقر على إحداها لفتح تذكرتها.",
            "الأسعار المتفق عليها — القسم التالي.",
            "عروض الأسعار، والعقود (مع عدد التغييرات المنتظرة)، والمشاريع.",
            "ملاحظات.",
          ],
        },
        {
          kind: "p",
          text:
            "«إضافة مناقصة» يفتح سجل المناقصات وقد اختير هذا العميل. ويظهر حين يكون قسم المناقصات "
            + "مفعلا وتملك إنشاء المناقصات.",
        },
      ],
    },
    {
      id: "crm-rates",
      heading: "الأسعار المتفق عليها",
      blocks: [
        {
          kind: "p",
          text:
            "سعر وعد به هذا العميل لصنف، مهما قالت القائمة. حين يرفع عرض سعر له، يسعر كل بند من السعر "
            + "المتفق عليه أولا، ثم سعر بيع الصنف، ثم تكلفته — ويذكر العرض أيها استخدم.",
        },
        {
          kind: "steps",
          items: [
            "في صفحة العميل، اضغط «تعديل الأسعار».",
            "«إضافة سعر»، واختر الصنف، واكتب السعر المتفق عليه، وملاحظة إن أفادت.",
            "«حفظ».",
          ],
        },
        {
          kind: "list",
          items: [
            "السعر 0، أو الفارغ، يزيل ذلك السعر.",
            "الأسعار بعملة الاستوديو.",
            "من يبني عرض السعر يرى السعر الناتج، لا قائمة أسعار العميل كلها.",
            "الصنف الذي حذف بعد ذلك يظهر «هذا الصنف لم يعد موجودا».",
          ],
        },
      ],
    },
    {
      id: "crm-insights",
      heading: "تحليلات العملاء",
      blocks: [
        {
          kind: "p",
          text:
            "أي العملاء يشترون أكثر، وأيهم يشترون أقل، وأيهم توقف. تنظر في سبع فترات وتقسمها ثلاث "
            + "كتل: الثلاث الأولى، والثلاث التالية، والآن.",
        },
        {
          kind: "list",
          items: [
            "الفترة — أشهر، أو أرباع، أو أنصاف سنة، أو سنوات.",
            "الحكم بـ — القيمة، أو عدد المبيعات.",
            "الفترة الأخيرة — آخر فترة مكتملة، أو الحالية حتى الآن.",
            "«تنزيل CSV» — الجدول جدول بيانات، للنمط الذي اخترته.",
          ],
        },
        {
          kind: "p",
          text:
            "البيعة فاتورة صادرة بعد خصم إشعارات الدائن، أو إيصال نقطة بيع يسمي العميل. وفي كل كتلة "
            + "يقسم العملاء الذين اشتروا أثلاثا — منخفض ومتوسط ومرتفع — فتتبع المستويات الاستوديو نفسه "
            + "لا مبلغا ثابتا.",
        },
        {
          kind: "list",
          items: [
            "متنام — اشترى في الكتل الثلاث، والآن أكثر من البداية.",
            "متراجع — الثلاث، والآن أقل من البداية.",
            "وفي — الثلاث، ثابتا عند المتوسط أو المرتفع.",
            "ثابت — الثلاث، بمستوى أدنى.",
            "ينزلق — اشترى في البداية والوسط، لا الآن.",
            "عائد — عاد بعد انقطاع.",
            "منقطع — اشترى في البداية فقط.",
            "متوقف — اشترى في الوسط فقط.",
            "جديد — اشترى أول مرة مؤخرا.",
            "خامل — اشترى من قبل، ولا شيء في هذه الفترات السبع.",
          ],
        },
        {
          kind: "p",
          text:
            "انقر على بطاقة نمط لتعرض عملاءه وحدهم، وانقر ثانية لتعرض الجميع. والبحث وقائمة الأنماط "
            + "و«تغير النمط منذ الفترة السابقة» تضيق الجدول أكثر، و«كان» يعرض نمط العميل قبل فترة.",
        },
        {
          kind: "p",
          text:
            "«من يبيع» يرسم عدد المبيعات مقابل قيمتها — بحسب الشخص أو الفريق أو القناة — من الصفقات "
            + "الرابحة ومبيعات نقطة البيع.",
        },
        {
          kind: "p",
          text: "إعادة العملاء إلى المبيعات، لمن يحق له ذلك:",
        },
        {
          kind: "steps",
          items: [
            "حدد العملاء، أو اضغط «اختيار كل المعروض». والعميل الذي لديه صفقة مفتوحة لا يحدد.",
            "اضغط «إرسال N إلى المبيعات».",
            "اختر الحملة إن وجدت، واكتب ما ينبغي أن تفعله المبيعات — «اعرض خصم 10٪ على طلبهم القادم».",
            "اضغط «إرسال». يصير كل عميل عميلا محتملا بانتظار الإسناد، مع سبب إرساله، ويبلغ من يملك الإسناد مرة واحدة للدفعة كلها.",
          ],
        },
        {
          kind: "p",
          text:
            "100 على الأكثر في كل مرة. والعميل المعروف من اسم على فاتورة فقط يضاف إلى العملاء عند "
            + "إرساله.",
        },
      ],
    },
    {
      id: "crm-contracts",
      heading: "العقود والتغييرات",
      blocks: [
        {
          kind: "p",
          text:
            "ما وقع مع كل عميل. يعرض كل عقد قيمته الحالية بأرقام كبيرة: القيمة الموقعة مضافا إليها كل "
            + "تغيير معتمد. والتغيير المرسل فقط مطالبة لا مال، ولا يحسب.",
        },
        {
          kind: "list",
          items: [
            "انقر على رقم العقد لترى تواريخه وملاحظاته والتغييرات المرفوعة عليه. و«N بانتظار» يعد التغييرات التي تنتظر ردا.",
            "لا زر في هذه الشاشة لتسجيل عقد جديد بعد؛ فهي تعرض العقود المسجلة على الصفقات.",
            "العقد لا يحذف أبدا — فهو أساس الصفقة.",
          ],
        },
        {
          kind: "p",
          text: "التغيير تعديل على ما اتفق عليه:",
        },
        {
          kind: "steps",
          items: [
            "اضغط «إضافة تغيير» على العقد.",
            "اذكر ما الذي يتغير، والنطاق، والتغير في القيمة، والتغير في المدة بالأيام. كلاهما بإشارة — القيمة السالبة حذف. اكتب التغير، لا الإجمالي الجديد.",
            "«حفظ». يكون مسودة، ويمكنك تعديله حتى يرسل.",
            "اضغط «إرسال للرد». إن كان المبلغ دون كل حدود الاعتماد اعتمد فورا وتحركت قيمة العقد. وإلا ذهب إلى المعتمدين، و«فتح في الموافقات» يبين أين وصل.",
          ],
        },
        {
          kind: "p",
          text:
            "يرد على التغييرات في صفحة الموافقات، لا هنا. والتغيير المرفوض يعرض السبب. والتغير في المدة "
            + "لا يحرك تاريخ نهاية العقد؛ بل يسجل ما يمنحه التغيير.",
        },
      ],
    },
    {
      id: "crm-orders",
      heading: "أوامر البيع",
      blocks: [
        {
          kind: "p",
          text:
            "ما طلبه العميل فعلا — من عرض سعر مقبول، أو سحبا على عقد، أو قائما بذاته.",
        },
        {
          kind: "steps",
          items: [
            "اضغط «أمر جديد». أعطه عنوانا واختر الصفقة التي يتبعها (مفتوحة أو رابحة)؛ ويملأ العميل من الصفقة.",
            "إن انطبق، اختر العرض الذي جاء منه والعقد الذي يسحب عليه. واختيار العرض لا ينسخ بنوده.",
            "«أضف بندا»: الوصف والكمية وسعر الوحدة، و— حيث يفرض الاستوديو ضريبة القيمة المضافة — المعاملة الضريبية: قياسية، أو صفرية، أو معفاة. ويحسب المجموع الفرعي والضريبة والإجمالي أثناء الكتابة.",
            "«حفظ». يأخذ الأمر رقم SO ويبدأ مسودة.",
          ],
        },
        {
          kind: "list",
          items: [
            "مسودة ← تأكيد (يحتاج بندا واحدا على الأقل) أو إلغاء.",
            "مؤكد ← منجز أو إلغاء.",
            "المنجز والملغى نهائيان.",
          ],
        },
        {
          kind: "list",
          items: [
            "تثبت البنود ونسبة الضريبة متى تأكد الأمر، فيبقى إجماليه ما وافق عليه العميل. ويمكن تصحيح العنوان والتواريخ.",
            "لا يحذف إلا المسودة. والأمر المؤكد يلغى بدلا من ذلك فيبقى السجل، ولا يعاد إصدار رقمه أبدا.",
            "اليوم يسجل الأمر ما طلب فقط. لا يحجز مخزونا، ولا يصدر فاتورة، ولا يفتح مشروعا.",
          ],
        },
      ],
    },
    {
      id: "crm-settings",
      heading: "الإعدادات",
      blocks: [
        {
          kind: "list",
          items: [
            "المدن — تقترح حين تسمي التذكرة مدينة موقعها.",
            "مناصب جهات الاتصال — تقترح لمنصب جهة الاتصال.",
          ],
        },
        {
          kind: "p",
          text:
            "كلاهما اقتراحات لا قائمة مغلقة — يمكن كتابة أي شيء. اكتب قيمة واضغط «إضافة» أو Enter، "
            + "و× تزيلها. وكل تغيير يحفظ فورا.",
        },
        {
          kind: "list",
          items: [
            "أعمدة العرض المباشر — حدد الأعمدة التي يعرضها العرض المباشر واضغط «حفظ الأعمدة». ينطبق على الجميع. وإن ألغيت تحديدها كلها عادت الأعمدة الافتراضية.",
          ],
        },
        {
          kind: "p",
          text:
            "الخدمات التي تعرضها التذكرة لا تدار هنا: إنها خدمات الاستوديو، في إعدادات الاستوديو.",
        },
      ],
    },
    {
      id: "crm-who",
      heading: "من يفعل ماذا",
      blocks: [
        {
          kind: "list",
          items: [
            "عرض التذاكر ورفعها وتعديلها ثلاث صلاحيات. ولا صلاحية لحذف تذكرة، لأن أحدا لا يستطيع ذلك.",
            "إسناد العملاء المحتملين صلاحية مستقلة. ومن لا يملكها تخفى عنه في كل مكان العملاء المحتملون الذين لم يسندوا.",
            "نقل مرحلة الصفقة هو تعديل تذكرتها — لا صلاحية منفصلة للمسار.",
            "العملاء: عرض وإنشاء وتعديل وحذف. والأسعار المتفق عليها تحتاج التعديل.",
            "تحليلات العملاء: العرض، والتنزيل، وإرسال العملاء إلى المبيعات ثلاث صلاحيات.",
            "العقود: العرض، ورفع التغييرات، وتعديلها وإرسالها. والرد على التغيير اعتماد يضبط في إعدادات الموافقات.",
            "أوامر البيع: عرض وإنشاء وتعديل (ومنه نقل الحالة) وحذف.",
            "الإعدادات: عرض وتعديل.",
            "لوحة المعلومات والمسار والعرض المباشر للنظر فقط، ولكل منها صلاحيته — ولوحة المعلومات منها.",
          ],
        },
      ],
    },
  ],
};
