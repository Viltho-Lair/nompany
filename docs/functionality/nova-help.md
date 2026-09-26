# Nova's help desk

Built 2026-09-26. Nova answers "how do I…" questions about the product itself, from a written
knowledge base, before, and separately from, answering questions about a studio's data with
the model. Whatever it cannot answer goes to support, and support's answers come back.

## What a person sees

Opening Nova shows two blocks above the usual data examples:

- **Common questions**: four main questions, the ones about the screen you are on first.
- **Browse help**: the top of a topic tree. *Getting started*, *Departments* (every section
  and its sub-sections), *Studio settings & access*, *Your account & plan*, and *Something
  isn't working*.

Clicking a topic adds a card to the transcript. It lists that topic's questions, main ones
first, followed by its sub-topics and a "Back to…" link. Clicking a question shows its answer
card: the answer, a *Have this ready* list when the question is about a form, numbered
*Steps* for a procedure, an **Open <screen>** button, and related questions. None of this
makes a request. The whole tree is already in the browser (see *Caching*).

A **typed** question is matched against the knowledge base first:

| Match | What Nova does |
|---|---|
| Sure (most of the question explained, clearly ahead of the runner-up, at least two words) | Answers outright, with **Not what I meant** underneath |
| Plausible | **Did you mean: …?** with Yes and No |
| Nothing close | Says so. Offers any weak matches, **Send to support**, and **Ask Nova about my data instead** |

**No** or **Not what I meant** offers the next two matches from the same ranking — only ones that explain at least half the question; a runner-up sharing a single word is not an alternative, and with none left the support form opens directly. **None of
these** opens the support form, pre-filled with the question. A suggestion that was turned
down is not offered again.

Typed text reaches the model only when help cannot handle it at all: the help route is
unreachable, or the knowledge base has not loaded. It also reaches the model when the person
chooses *Ask Nova about my data*. The data examples still go straight to the model. Help
cards never go to the model: the model only receives the conversation turns.

## Sending a question to support

The support form sends two copies, as the owner specified:

1. **An email to support@nompany.com.** It carries who asked, which studio, when, which
   screen they were on, their language, the question in their own words, and what Nova
   offered before they gave up. The asker's address is the Reply-To, so replying from the
   inbox reaches them.
2. **A row in /super → Nova questions**, with the same facts plus the topics they browsed. The
   console's bell rings too.

The question is stored first and emailed second, the contact form's order. A failed email
still counts as sent; the row is marked *email not sent*. The route resolves "What Nova
offered" from entry ids on the server, never from text the browser sent. Each person may
send six questions an hour.

## What support does with a question (/super → Nova questions)

- **Send reply.** The answer goes to the asker by email and to their bell in the studio they
  asked from. It is addressed to their collaborator id, in their language.
- **Teach Nova.** Pick the existing answer the question meant. The asker's own wording becomes
  a phrasing of that entry, so the next person who asks it that way is answered without a
  ticket.
- **Close.** Answered elsewhere, or not a question.

Every card shows what Nova offered. That is how you tell a missing entry from a badly worded
question.

## How matching works (`src/lib/nova/help/search.ts`)

It is not a regex. It uses standard FAQ retrieval:

- **BM25 over weighted fields.** Question ×3, taught phrasings ×3, keywords ×2.5, topic label
  ×1.5, answer ×1, steps and fields ×0.5. Both languages are indexed into one document, so a
  mixed question works too.
- **Arabic normalisation.** Diacritics and tatweel are dropped; أ/إ/آ become ا, ى becomes ي,
  ة becomes ه; Arabic-Indic digits are read as digits. A light stemmer removes ال, English
  plural endings and a few Arabic suffixes.
- **Typo tolerance.** One edit is allowed from four letters, two from eight, and
  transpositions count as one edit. Prefixes also match. Fuzzy matches are tried only when the
  exact word is not in the index.
- **Synonyms.** A cross-department table: vacation and leave, vendor and supplier, bill and
  invoice, and so on, in both languages. An expanded word counts for 0.8 of the typed one.
- **The screen you are on** raises that section's entries by ×1.25, and its department's by
  ×1.1. This breaks ties such as "how do I add one?" without overruling a clear match.
- **A taught phrasing counts as a question** for the focus measure, so wording support linked is answered outright rather than only suggested — found by sending a real question and teaching it, 2026-09-26.
- **The decision uses coverage and lead, never a raw score**, because BM25's scale shifts with
  every entry added. A single word is never answered outright.

## Caching

The knowledge base is code, so the server builds it once per process. `HELP_VERSION` is a
fingerprint of its content. The browser receives one language of it, filtered to the
studio's switched-on sections, and keeps it in three places:

1. **In memory**, for the life of the tab.
2. **In localStorage**, under the version. After a reload, the browser sends
   `?have=<version>` and gets back a few bytes if nothing changed.
3. **The full download**, only when the version has moved: a deploy changed an answer, or the
   studio switched a section on or off.

The search index is rebuilt only when the taught phrasings change, which the phrasings'
stamp tracks.

## A studio's switches

A topic that names a section the studio has switched off is hidden, along with everything
under it. That section is also left out of search results and "Open" buttons. This is the
dashboards' rule: a visual goes when its section goes. A section with no stored row is *not*
hidden.

## One source per section: the manual is composed from the help entries

Since 2026-09-27, Finance is written **once**. Its chapter on the studio's Documentation page
is composed on the server from Nova's help entries (`src/lib/nova/help/manual.ts`):

- each topic becomes a chapter section, and the topic's first entry (an `about`) is its
  introduction;
- every other entry becomes a sub-heading, with the question as the heading and the answer as
  the paragraph, followed by *Have this ready* and the steps;
- every Finance answer in Nova carries **Read in documentation**, which opens the paragraph it
  came from. It is the same text, so reading on cannot contradict it.

A department moves over when it is added to `MANUAL_FROM_HELP`, and its hand-written article in
`shared/studio/manual*` is deleted in the same commit. `tests/help-model.mjs` enforces this:

- a department in both places fails;
- a chapter that drops an entry fails;
- an anchor that is not on the page fails;
- a section that opens on anything but its introduction fails.

The entry order in `kb/<department>.ts` is the chapter's reading order: `about`, then
`fields`, then `howto`, then `settings`, then `troubleshoot`. The Finance `fields` lists were
checked against the form components and Zod schemas named in a comment above each one.
Re-check against those when a form changes.

## Where things are

| | |
|---|---|
| Knowledge base | `src/lib/nova/help/kb/*.ts`, server-only; shape in `types.ts` |
| Assembly, filter, payload, memoised search | `src/lib/nova/help/knowledge.ts` |
| Matcher | `src/lib/nova/help/search.ts`, pure |
| Tree and search route | `GET/POST /api/studios/<slug>/nova/help` |
| Support route | `POST /api/studios/<slug>/nova/help/support` |
| Console | `/super/nova/questions`; `GET/PATCH /api/super/nova-questions` |
| Storage | `REG.novaHelpQuestions` (capped at 1,000, newest first) and `REG.novaHelpAliases` (`src/lib/data/novaHelp.ts`) |
| UI | `components/studio2/nova/useNovaHelp.js` and `NovaHelpCards.jsx`, mounted in `NovaLauncher` |
| Words | `src/shared/studio/novaHelp.ts` |
| Test | `tests/help-model.mjs` |

## Adding or changing an answer

Edit the module under `kb/`. Keep entry ids **stable forever**: a support ticket and a taught
phrasing both name them. Run `node tests/help-model.mjs`. It fails if:

- a topic has no parent, or an entry sits on a missing topic;
- an `open` is not a section key, or leads to a filed-only section;
- a string is missing in either language;
- a section with a screen has no topic.

## Not built yet

- **It is gated on Nova.** A studio whose package does not include Nova has neither the
  launcher nor the help desk, and so no guided help at all.
- **Answers are not permission-aware.** A person without the right to a department still sees
  its help. That is harmless, since it is documentation and not data, but the answer does not
  say "you do not hold this right" either.
- **No thumbs up or down, and no analytics on declined suggestions.** Only questions sent to
  support are recorded. Queries that ended on *None of these* without being sent are lost, and
  they are exactly the gaps worth knowing about.
- **No semantic (embedding) search.** Matching is lexical plus synonyms. A question sharing no
  word with its answer ("my numbers don't add up" for bank reconciliation) needs a taught
  phrasing or a keyword.
- **Taught phrasings cannot be listed or removed** from the console. They can only be added.
- **The reply is one-shot.** There is no thread: a follow-up is a new question.
- **The model is not given the knowledge base.** When a question falls through to the model,
  it answers from its tools alone, not from these entries.
