# Audiences & consent (Marketing)

Built 2026-09-21/22, the fourth part of the owner's Marketing plan. A studio's forms have refused
to open without a required consent question since Forms shipped (`forms.md`), so every studio
already puts the tick in front of the public — and **nothing ever recorded the answer**. It sat
inside one sealed response row at a time, so "may we email this person" was a question the product
could not be asked.

Section `marketing-audiences`, which owns `marketingConsents`. Code:
`src/modules/marketing/consent.ts` (the rules, pure, shared with the screen,
`tests/consent-model.mjs`), `modules/marketing/audiences.ts` (the service),
`components/studio2/StudioAudiences.js` (the screen), `shared/studio/audiences.ts` (the words).

**nompany still sends nothing** (the owner, 2026-09-19). This is the record, not the gate. It is
built before a sending layer rather than with one because consent nobody wrote down at the time
cannot be reconstructed afterwards: a studio that starts sending next year needs a ledger that
already covers the people who ticked the box this year.

## The ledger

**Append-only. A withdrawal is a new entry, never an edit of the one that granted it.** There is
no update and no delete — on the screen, in the service, or in the route. A consent somebody
could change afterwards proves nothing, and a studio asked what it was entitled to do last July
has to be able to answer.

**One address is one subject**, normalised: an email lowercased, a telephone number reduced to its
digits and a leading `+`. A withdrawal recorded against `Ali@Firm.com` must stop a send addressed
to `ali@firm.com`. Two addresses belonging to one human being stay two subjects, because that is
all the evidence supports.

**The latest decision wins**, and **"never asked" is its own answer** — not a no. Nobody has been
asked and somebody has said no send a studio to different places: one to an opt-in, the other to
an apology. `mayContact` answers true only where consent was given and not since withdrawn, so
the default is not to send.

**The evidence is the wording they agreed to**, copied at the moment they agreed rather than
pointed at. A studio rewording its form next year must not silently rewrite what somebody
consented to.

## Where entries come from

- **A form tick.** When somebody answers a Marketing form and ticks its consent question, the
  addresses that answer collected are recorded — the email question earns `email`, the phone
  question earns `phone`. It is written **whether or not a lead is raised**: a survey that makes
  no lead still asked for permission to hold somebody's address, and a ledger with holes exactly
  where nobody looks is worse than none. Written with the studio's own authority (the public hold
  no rights), best-effort like the lead beside it, and **logged when it fails** rather than
  swallowed.
- **By hand**, for somebody who wrote in, telephoned, signed a sheet at a stand or asked to be
  left alone. The date may be **backdated** because those things happen away from the screen, and
  **never post-dated**: a decision that has not happened yet is refused rather than quietly
  replaced with today, which is what it used to do.

**A backdated entry may change nothing**, and the screen says so. A withdrawal dated last week
does not undo a consent given yesterday — the latest decision wins — so the answer names the
state the ledger now holds ("this address is now: Allowed") and adds that the entry was kept as
history. Found in the sandbox, where a withdrawal recorded against an address that had consented
the same morning left it allowed and the screen said only "added": somebody would have believed
they had stopped the contact.

## Two channels, not five

`email` and `phone`, where `phone` covers calling, SMS and WhatsApp together. The consent question
on a form is **one tick**, so it can only ever mean "the addresses this form collected". Splitting
it into four permissions would be recording a consent nobody was asked for.

## Sealed at rest

A consent row's `value` is an email address or a telephone number belonging to a member of the
public, so it is encrypted on the way into Postgres (invariant 18, `platform/db/sealCipher.ts`) —
exactly what a client's details are sealed for. `evidence` is the studio's own wording and stays
clear, so the ledger can be read without opening every row.

## Who may do what

`marketing.audiences` **view** and **edit**; edit records an entry, and there is nothing else to
grant because nothing can be changed or removed. The winner-of-work shape (Marketing Manager and
the rest) holds edit. **Existing roles catch up:** whoever may read form answers gains view — the
ledger is the same people, gathered by address instead of by form.

The section plants itself in every studio on the next read, and the right catches up on the next
role read. No script, no migration: a studio with no ticks yet sees an empty ledger that says
where entries come from.

## Not built yet

- **Nothing checks it.** `mayContact` exists and is pure, and no sending layer calls it, because
  nompany sends nothing. The day one exists it must ask, per address, per channel.
- **Per-channel consent.** A form cannot yet ask separately about email, SMS and WhatsApp, which
  is why `phone` covers three things at once.
- **Lists and segments** — the other half of "Audiences". There is no way to group these addresses
  into an audience, and no import beyond recording entries one at a time (`source: "import"` is
  accepted and nothing produces it).
- **A preference centre**: a public page where somebody changes their own mind. Today a withdrawal
  is recorded by the studio, so somebody must ask a person rather than a screen.
- **Data-subject requests** (export or erasure of everything held about an address). Erasure is
  the hard one against an append-only ledger and needs a decision: the record proves consent, and
  deleting it destroys the proof.
- **Bounces and complaints** do not arrive from anywhere, since nothing sends.
- **A contact is not joined to a client or a lead.** The same person may be a Sales contact and a
  ledger subject with nothing linking the two.
- No notification when somebody withdraws, and no count of withdrawals on the Marketing dashboard.
