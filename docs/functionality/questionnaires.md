# Questionnaires — what is asked, what branches, and what is recorded

**The builder:** `/super/questionnaires/<id>`, console-only.
**The responses:** `/super/questionnaires/<id>/responses`, console-only, with a CSV export.
**The one live form:** `/<locale>/questionnaire`, answered once by everyone who registers.
**No permission key.** A questionnaire is nompany's, not a studio's; the only doors are a
super-admin session and, for the person's own answers, their own session.

## What it is

A questionnaire is **a form authored in the console** — pages, questions, choices — and
**a set of replies to it**. The two are separate records on purpose, and a third copy
exists as well:

| Record | Key | Whose | Dies with |
|---|---|---|---|
| The form | `g:questionnaires` (one row) | nompany's | being deleted in the console |
| Every reply to it | `q:<QuestionnaireID>:responses` | nompany's, for analysis | the form |
| One person's own answers | `u:<UserID>:questionnaire` | theirs | the user |

The third is not a duplicate for its own sake: it is what the **onboarding gate** reads
(`needsQuestionnaire`), and it is the person's own copy. Deleting a form must not delete
what people said; deleting a person must not delete the form. Both directions are covered —
the form's DELETE clears its responses first (children-first, invariant 11), and
`cascadeDeleteUser` clears that person's reply from every form.

## What it stores

### The form

`name`, `route`, `status`, and `pages` — each page a title, a lead, a Nova hint and a list
of questions. `src/lib/questionnaireElements.ts` is the catalogue of question types.

A question's **`key`** is what binds it to a stored field. With one, its answer lands on
that field; without one, it lands on the question's own id. That is `fieldOf()`, and it is
the same rule on both sides of the wire.

**There is no stored response count.** The row carried `responses` and `completed` from the
day it was written and nothing ever moved either, so the console showed `-` for every form
forever. The count is **derived** from the responses now, by whoever asks — one read per
form on one console screen, and it cannot drift.

### A reply

```
{ id, questionnaireId, userId, email, answers, asked, definitionUpdatedAt, createdAt, updatedAt }
```

`answers` is **open**, keyed by `fieldOf(question)`, bounded by `cleanAnswers` rather than
whitelisted: strings (2000 chars), lists of strings (50 × 200), finite numbers and booleans,
up to 200 fields. Anything else — an object, a null, a NaN — is not an answer.

`asked` records **the questions as they were put** (field, label, type), which is redundant
on the day it is written and is the only reason a reply survives the form being reworded or
a question being deleted. Fifty bytes a question is the difference between an archive and a
pile.

**A reply is an upsert on `userId`**, mirroring the per-user document beside it: a person
has one answer to a form, and re-answering replaces it. Appending would let one person's
second pass count twice in every total.

### The person's own copy

Six fields typed by name — `intent`, `field`, `country`, `city`, `erps`, `packageKey` —
plus `completedAt`, the whole open `answers` map again, and `questionnaireId`. The six are
typed because product code reaches for them by name: `intent` routes the account screen,
`field` seeds a studio's trade, `packageKey` decides billing, and `completedAt` gates every
surface behind sign-in.

## What it does

### It records the answers

**It did not.** `saveQuestionnaire` accepted those six named fields and dropped everything
else, so every question an author added in the builder was asked, answered, posted — and
discarded, with the submit reporting success. A whitelist cannot work here: the field names
are authored at runtime, not known at compile time. The shape is open and the **size** is
closed instead.

The API resolves **which form was answered from the ROUTE, on the server** — never from the
body. A client-named questionnaire id would let anybody file a made-up row into somebody
else's analysis for the cost of one fetch.

**Failing to record the analysis copy does not fail the registration.** The person's own
answers are saved and the gate is open by then; losing the analysis row is a reporting gap,
and it is logged loudly rather than swallowed.

### It branches

A question can decide which question comes next. **The respondent never sees the logic** —
they answer, and the next question is simply the right one. The author sees all of it.

The rule lives on the question that **decides**:

```
q.reveals = [{ op, value, show: [questionId, …] }]
```

Five operators: `is`, `is-not`, `includes`, `answered`, `not-answered`. `is` and `includes`
differ only on a multi-select — "that is the whole answer" against "it is among them".
Comparison is against the **stored** value (`optionValues[i]`), not the label, so rewording
a choice does not break a rule.

**Conditional is derived, not stored.** A question is conditional exactly when some rule
names it, so deleting the rule makes it unconditional again — the safe direction. A stored
`hidden: true` would outlive the rule that justified it.

Visibility is a **fixed point**, not one pass: a revealed question may itself decide
something (A → B → C), and a rule on a question that is *not* on screen must not fire, or
hiding a branch would leave its consequences standing. The set only ever grows, so it
settles in at most one round per question, and a cycle settles with neither visible.

Three consequences on the live screen, all of them the same rule applied in different
places:

- **A hidden required question does not block the page.** It was not asked, so there is
  nothing to withhold — gating on the authored list would strand somebody on a page whose
  blocker they cannot see.
- **A page whose every question is hidden is skipped**, not shown empty. A page with *no*
  questions at all is kept: that is a statement the author put there.
- **Answers to questions that are no longer on screen are dropped at submit** — on the
  screen and again on the server. Answering a branch and then changing the answer above it
  leaves replies behind, and recording those would put an answer to a question this person
  was not asked into the analysis. At submit, not on every keystroke, so going back to look
  at something does not destroy it.

Navigation is **by page id, not index**: branching makes the page list a function of the
answers, and an index into a list that moves underneath you points somewhere else.

### It tells the author what is wrong

`logicProblems()` reports, per question, six ways a rule fails **silently** at run time —
it does not throw, it does not warn, the form simply never shows a question and nobody can
tell whether that was the intent:

- a rule with no condition, or an operator that needs a value and has none;
- a value that is not one of the question's choices (`"Reject"` for `"Rejected"` is the
  commonest, and looks exactly like a branch nobody has tripped yet);
- a rule that fires but shows nothing;
- a rule pointing at a question that no longer exists;
- a question revealing itself;
- **a question nothing can reveal** — which is the only report a cycle gets, since the fixed
  point simply leaves both out with nothing on any screen to say so.

The builder shows them beside the rule, and marks every question on the canvas that either
decides something or is only asked conditionally. Same module as the live flow, so the
screen and the server cannot disagree.

### It can be rehearsed before anybody meets it

**Preview** in the builder opens `/<locale>/questionnaire/preview/<id>` in a new tab —
super-admin only, 404 for everybody else. It renders **the same component the real survey
uses**, with the same chrome and the same branching; a second "preview renderer" would be a
second reading of every rule, free to disagree with the real one about exactly the thing an
author opens a preview to check.

Nothing is written. At the end the author gets what *would* have been posted, and whether
the path they walked produced an `intent` the save accepts.

The button reads **Save and preview** when there are unsaved edits, and saves first: the
preview reads the stored definition, so opening it dirty would show yesterday's form and let
somebody conclude their new rule does not work.

### It says when registration can no longer finish

**An author is allowed to break the registration form.** That is the right rule — a form
being built is allowed to be wrong. What must not happen is that nobody finds out until a
stranger is stuck on it, and that failure is completely silent: the form renders, every
question is answerable, the button appears, and the save is refused because no `intent` came
out, with nothing on screen explaining it.

So `registrationProblems()` — run only against the form at `REGISTRATION_ROUTE` — reports
the ways that happens, as a **band across the builder**, not as a refusal to save:

- nothing on the form is stored as `intent`;
- more than one question is, so they overwrite each other;
- the intent question can never be shown (behind a rule nothing can fire, or in a loop) —
  the one check that needs the branching engine, so `reachableIds` is passed in;
- it is optional, so somebody can skip it;
- its stored answers cannot produce `create` or `join`, or it has no fixed choices at all
  so what somebody types will never be the exact token.

The two halves answer different questions and both are needed: the band says a clear path
**exists**; the preview proves a particular path **works** by walking it.

### It reports them

The responses screen has two views of one thing. The **summary** is per question — how many
said each thing, commonest first. The **table** is per person, newest first, for when the
question is "who said that". Beyond either, the **CSV** takes every response, because a
screen cannot anticipate the third question and a spreadsheet does not have to.

Three rules the summary keeps:

- **The form is the spine, the responses are not.** A question nobody answered gets a block
  reading zero — an absent row is a gap in the screen, a zero is a finding.
- **A question the form no longer asks still gets one**, marked retired, named by the label
  `asked` recorded. Dropping them would shrink every historical total the moment somebody
  tidied the form — a report that punishes housekeeping.
- **Answered and skipped, never a percentage of responses.** With branching, most people may
  never have been *put* the question, and "12%" reads as indifference when it means they
  were not asked.

## What is NOT built yet

- **Only one live questionnaire.** The registration form at `/<locale>/questionnaire` is the
  single route anything renders. A questionnaire authored in the console and attached to any
  other route has no screen to appear on.
- **No partial save.** The flow posts once, from the last page. So `completed` equals
  `responses` by construction, and somebody who abandons the survey halfway leaves nothing
  at all — which is the most interesting drop-off in any survey and is not measured.
- **The response key grows without bound within one form.** `q:<id>:responses` is one
  document read and written whole, bounded by the number of people who answered. That is the
  same bound `g:users` already carries and is fine for a form answered by registrants; a form
  published to the open internet wants its own table in `collection_rows`, and moving it is a
  migration rather than a tweak.
- **A rule cannot skip a page directly**, only hide every question on it, which has the same
  effect by a longer road. There is no "jump to page" and no ending-screen routing.
- **A rule compares one question's answer.** No AND/OR across two questions, no numeric
  comparison (`greater than`), and no rule on a page.
- **The readiness check knows about `intent` and nothing else.** It is the only field with a
  hard contract today, but `field`, `country` and `packageKey` all feed real behaviour
  (a studio's trade, billing) and go unmentioned if an author unbinds them — they degrade
  quietly rather than refusing, which is why they are not in the band, and why that is a
  judgement call rather than a rule.
- **Preview runs one path at a time.** It proves the path the author walked; it does not
  enumerate every path, so a branch nobody clicks through is still unproven. Exhaustive path
  analysis is decidable for this rule language and is not built.
- **Preview always opens in English.** The button hardcodes `/en/`; the language switcher
  inside the survey works, so an Arabic rehearsal is one more click.
- **A question's `source` lists are code, not data** (industries, countries, cities, ERPs).
  The builder shows them read-only and says so.
- **No response is editable or deletable on its own.** They go when the person goes or when
  the form goes, and there is nothing in between.
- **No anonymous responses.** `userId` is allowed to be blank in the record and nothing can
  currently produce one: the only route requires a session.
