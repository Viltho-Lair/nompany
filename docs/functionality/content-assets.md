# Content & brand assets

Marketing's eighth subsection of the owner's plan, live 2026-09-22. Section key
`marketing-content`, which owns the `marketingAssets` collection. Right
`marketing.content` view/create/edit/delete. Code:
`src/modules/marketing/assets.ts` (the rules, pure) and `assetsService.ts`.

## The gap it closes

A campaign has carried a **brief** since earlier the same day — who it is for,
what it says to them, what it offers, what would make it a success — and
nowhere at all to put what was MADE from that brief. So the artwork, the copy
document and the logo lived in somebody's Drive, and "which logo was on the
autumn adverts" had no answer inside the product that had the adverts in it.

## An asset

A name, a **kind** (artwork, copy, video, logo, document, other), free-text
notes, an optional **campaign**, a **version** label and a file.

**The kind is what it is FOR, not what program made it.** "PSD", "MP4" and
"docx" are a toolchain's vocabulary and change every few years; a studio wants
the ARTWORK for a campaign whether it is a PNG or a PDF. The file's real type is
on the media record and the screen shows it.

**The campaign is optional, and that is deliberate.** A studio's logo belongs to
the studio rather than to any one campaign, and a library that could only hold
campaign work would send people back to the Drive for the brand itself. Those
sit in their own group, shown first.

**An asset whose campaign has been deleted is not lost.** It falls into that
same unattached group rather than vanishing — the reader contains it, which is
where `projectCosting` puts the same rule, because deleting a campaign must not
delete the artwork somebody paid a designer for.

## The file

**Uploaded to `/api/media?kind=private`**, which verifies membership before it
writes; the record keeps only the id it hands back. The same route serves the
bytes after checking again, so a link on this screen is never a Blob URL. That
is the rule the whole product follows for a private file, and it is the storage
the tender pack already uses — nothing new was built.

**The file is set once, on create.** Swapping the bytes under a name is exactly
what the version chain exists to prevent: "which logo was on the autumn
adverts" stops being answerable the moment a file can be replaced in place.

**A media id is checked against this studio.** `/api/media` already refuses a
non-member, but an id is just a string in a request body — without the check a
member of one studio could file another studio's id into their own library, and
the reader would resolve it to nothing while the record claimed a file existed.

**Deleting takes the file with it**, children first (invariant 11): the blob
goes, then the record. The other order leaves a file nothing names and nothing
can ever reach to remove.

## Versions

**A new version is its own asset, then marked as replacing the older one**,
which STAYS and stays readable. Three rules make a chain a chain, and they are
`lib/revisions` — **shared with Tendering's bid documents, not copied from
them**:

- the replacement must itself be CURRENT, which is what stops A←B←C←A from ever
  being *written* rather than having to be detected afterwards by a walk that
  has to guess which link to break;
- nothing is replaced twice;
- **neither end of a chain deletes** — removing the old one destroys the
  history, and removing its replacement leaves the older one reading as replaced
  by nothing. A loose asset is an upload somebody got wrong, and that one goes.
  The screen SAYS why rather than hiding the button, because a button that
  vanishes reads as a missing feature.

**The campaign is NOT a boundary here**, and it is the one place this differs
from a tender's documents. A tender's pack is that tender's, and a document from
another bid has no business in it. An asset genuinely moves: the autumn artwork
is reworked for the winter campaign, and the new file is honestly the next
version of the old one.

**`tests/assets-model` asserts the sharing by IDENTITY**, not by behaviour — two
implementations that agree today are exactly what the extraction prevents, and
only sameness rules that out. Tendering keeps its own refusal token
(`other-tender` rather than `other-parent`), so lifting the logic out moved no
string anybody reads.

## Who may do what

`marketing.content.*`. Replacing an asset with a newer version is an **edit**
rather than a verb of its own: the old file stays and stays readable, so marking
it replaced is the library's own content changing rather than anything being
taken away. Whoever works the campaigns catches up to this right verb for verb,
and the winner-of-work shape holds it at full.

## What has not been proven

**The upload path has never been run.** `BLOB_READ_WRITE_TOKEN` is present but
EMPTY in `.env.local`, so `put()` throws and `/api/media` answers 500 to every
upload on a local sandbox. That is not this feature's defect and not a
production one — it is an environment limit that applies to **every upload in
the product**: a form's file question, the tender pack, HR documents and the
quality workflow are all equally unverifiable locally.

So what HAS been exercised against a running studio is everything that does not
need a stored file: the library reads, the refusals (a missing name, a missing
file, a media id that is not this studio's, an unrecognised kind), replacing
with ids that do not exist, and deleting one that does not. **Creating a real
asset, the version chain end to end, and deleting a file have been proven by
the model test alone.** Anybody who can upload should exercise those four
before trusting them.

## Not built yet

- **No preview.** An image is a link, not a thumbnail, and a PDF does not render
  in place.
- **No folders, tags or search.** The grouping is by campaign and nothing else,
  so a studio with three hundred assets scrolls.
- **No approval.** An asset is uploaded, not signed off — there is no draft, no
  review and no "cleared for use" state.
- **No usage.** Nothing records which advert, form or landing page an asset was
  actually used on, so "where is this logo still live" cannot be asked.
- **No size or type limits of its own** beyond what `/api/media` enforces, and
  no per-studio storage cap the way a form has one.
- **Nothing reads the library but this screen.** An asset is not offered when
  writing a campaign, a form or an event.
