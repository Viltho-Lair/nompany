# MegaTech Arabia — Website

A dynamic, bilingual (English / Arabic) corporate website for **MegaTech Arabia**, with an admin control panel for managing all content.

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 3
- **Data:** JSON file store (`data/db.json`, created from `data/seed.json` on first run)
- **Languages:** English (LTR) and Arabic (RTL), switchable from the header

## Getting started

```bash
npm install
npm run dev
```

Then open:

- Public site: <http://localhost:3000> (redirects to `/en`; Arabic at `/ar`)
- Admin panel: <http://localhost:3000/admin>

### Admin credentials

```
username: admin
password: admin
```

> These are demo credentials. To change them, set `ADMIN_USER` and `ADMIN_PASS`
> environment variables (see `src/lib/auth.js`). Replace the simple cookie
> session with a real auth provider before deploying publicly.

## What you can manage

From **/admin** you can create, edit and delete:

- **Company info** — brand names, taglines, about text, contact details, office hours, social links and the homepage statistics (all in English and Arabic).
- **Services**, **Projects**, **Vendors**, **Clients**, **Careers** — full CRUD.
- **Messages** — submissions from the contact form (view and delete).

Changes are written to `data/db.json` and appear on the site immediately.

## Sections

`Home · Services · Projects · Vendors · Clients · Careers · Contact`

## Brand notes

- Colours come from the supplied palette (navy `#031f5d → #0159ae`, greys `#8f8f8f → #5c5c5e`).
- The logo is not legible on dark backgrounds, so headers and section
  surfaces stay light. In the dark footer the wordmark logo sits on a white
  chip so it remains visible.
- Fonts load from Google Fonts (Saira + IBM Plex Sans for Latin, Tajawal +
  IBM Plex Sans Arabic for Arabic), so an internet connection is needed on
  first load.

## Resetting content

Delete `data/db.json` and restart — it will be recreated from `data/seed.json`.

## Production build

```bash
npm run build
npm start
```

## Project structure

```
src/
  app/
    [locale]/        Public pages (en / ar)
    admin/           Control panel (login-protected)
    api/             Auth + CRUD endpoints
  components/        UI + admin components
  lib/               db, i18n, auth, schemas
data/
  seed.json          Pristine seed content
  db.json            Live data (generated)
public/brand/        Logos
```
