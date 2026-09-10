# Black Ridge Scope Desk

A private, internal web application for **Black Ridge Roofing** ("Elevated Roofing & Exterior
Systems") that turns purchased roof-measurement reports and field-inspection notes into
contractor-prepared insurance estimates, code reports, weather reports, supplements, homeowner
proposals, and downloadable branded PDFs.

This is a working application — every control described below is wired to a real database, real
file storage, and real PDF generation. Nothing here is a mockup.

## Architecture

- **Next.js 16** (App Router, TypeScript) — server components for data loading, client components
  for interactive forms/tables, Route Handlers for the API.
- **Prisma ORM on SQLite** by default (zero-config, file-based — `prisma/dev.db`). The schema is
  written to be portable: switch `provider = "sqlite"` to `"postgresql"` in
  `prisma/schema.prisma` and point `DATABASE_URL` at a managed Postgres instance to run in
  production. Re-run `npx prisma migrate deploy` after switching.
- **Custom session auth** — bcrypt password hashes + HMAC-signed, httpOnly session cookies
  (`src/lib/auth.ts`). All routes are gated by `src/proxy.ts` (Next 16 renamed `middleware.ts` to
  `proxy.ts`; functionally the same thing). NextAuth was intentionally avoided here since v5 is
  still beta and this app needed to run reliably against a brand-new Next 16 release — the
  hand-rolled version is small enough to audit directly.
- **Private object storage** — `src/lib/storage.ts` defines a `StorageProvider` interface with a
  `LocalStorageProvider` implementation that writes to `storage_private/` (outside `public/`,
  never served statically). Files are only readable through authenticated route handlers
  (`/api/files/[fileId]`, `/api/documents/[docId]/download`). Swap in an S3-backed
  implementation of the same interface for production without touching call sites.
- **Parser providers** — `src/lib/parsers/` defines a `ReportParser` interface with
  implementations for PDF (GAF QuickMeasure / EagleView / Roofr / generic — label-driven regex
  extraction over `pdf-parse` text), CSV, and XML. Unrecognized fields are never guessed; they're
  left blank and flagged `needs_review` for manual entry. Two more standalone parsers
  (`codeReportParser.ts`, `weatherReportParser.ts`) handle uploading a jurisdiction/code
  verification report (tuned to the OneClick Code "Residential Roofing Report" layout) and a
  verified weather-history report (tuned to the Predictive Sales AI layout) from the Code Report
  and Weather tabs — both run automatically on either upload, since some vendors bundle both
  sections into one PDF, and both were built and verified against real report samples rather than
  a synthetic test file.
- **PDF generation** — `@react-pdf/renderer`, fully server-side (`src/lib/pdf/`), branded with the
  Black Ridge matte-black/charcoal/champagne-gold theme. All 8 document types (insurance estimate,
  measurement summary, code report, weather report, supplement request, homeowner proposal,
  material order, invoice) share a common header/footer/pagination shell.
- **Calculation engine** — `src/lib/calc/` implements every stated calculation rule (removal vs.
  install squares, waste factor, ice/valley membrane coverage, remaining underlayment, starter,
  gutter apron, rake drip edge, ridge cap, high-roof/steep-slope charges, per-line taxable-material
  tax) as pure, unit-tested-by-construction functions shared by the seed script, the API, and the
  live client-side preview.
- **Background jobs** — `src/lib/jobs.ts` is a `runJob()` abstraction. This sandbox has no queue
  infrastructure (Redis/SQS), so jobs run in-process and are awaited synchronously by the caller;
  every extraction/PDF-generation call site goes through this one function, so swapping in a real
  queue (BullMQ, etc.) later is a one-file change.
- **Validation** — Zod schemas for every API input (`src/lib/validation.ts`).

## First-run setup

```bash
cd scope-desk
npm install
npx prisma migrate deploy   # creates prisma/dev.db and applies the schema
npx prisma db seed          # seeds a login user + price list + the sample Peartree Drive claim
npm run dev                 # http://localhost:3000
```

Demo login: **estimator@blackridgeroofing.com / BlackRidge2024!**

Environment variables (`.env`, already populated for local dev):

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<random 32+ char secret>"   # change this for any real deployment
STORAGE_ROOT="./storage_private"
STRIPE_SECRET_KEY="sk_test_..."          # from the Stripe Dashboard — required to accept payment
STRIPE_WEBHOOK_SECRET="whsec_..."        # from the webhook endpoint's settings in the Stripe Dashboard
APP_BASE_URL="http://localhost:3000"     # used to build Stripe Checkout's success/cancel URLs
```

### Payment (Stripe)

The public order flow at `/get-estimate` (no login required) is a real Stripe Checkout
integration — not a stub. Without valid Stripe keys, everything else in the app works normally;
only the "Continue to Payment" step will fail, with a clear error rather than a silent failure.

To wire up a real Stripe account:

1. Create a [Stripe](https://dashboard.stripe.com) account (test mode is fine for development) and
   copy the **Secret key** into `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint pointing at `<your-deployed-url>/api/public/stripe-webhook` subscribed to
   the `checkout.session.completed` event, and copy its **Signing secret** into
   `STRIPE_WEBHOOK_SECRET`. For local development, the [Stripe CLI](https://stripe.com/docs/stripe-cli)
   (`stripe listen --forward-to localhost:3000/api/public/stripe-webhook`) prints a webhook secret
   you can use directly.
3. Set `APP_BASE_URL` to the URL Stripe should redirect back to after checkout.

Once a customer completes payment, the webhook (`src/app/api/public/stripe-webhook/route.ts`) marks
the order paid and calls `fulfillPaidOrder()` (`src/lib/orderFulfillment.ts`), which
finds-or-creates the Customer, creates the Property and Claim (with `reportType` and the
customer's intake answers already populated), and shows up immediately on the staff **Orders**
page (`/orders`) with a link to the new job.

## Deployment

1. Provision a Postgres database and set `DATABASE_URL` to its connection string; change the
   `datasource` `provider` in `prisma/schema.prisma` to `"postgresql"`.
2. Set a strong, unique `AUTH_SECRET`.
3. Point `STORAGE_ROOT` at a persistent volume (or replace `LocalStorageProvider` in
   `src/lib/storage.ts` with an S3-backed implementation of the same `StorageProvider` interface —
   the rest of the app is unaffected).
4. `npm run build && npm start`, or deploy to any Node.js host that supports the Next.js App
   Router (a Vercel-style platform, a Docker container running `next start`, etc.). `src/proxy.ts`
   uses the Node.js runtime (Next 16 default) so it needs a Node server, not an edge-only runtime.
5. Run `npx prisma migrate deploy` against the production database, then `npx prisma db seed` once
   to create the first login user (edit `prisma/seed.ts` first if you don't want the sample claim
   seeded into production).
6. Create additional users directly via Prisma Studio / a script — there is intentionally no public
   self-registration route for this private tool.

## What was verified end-to-end

Using the running dev server, the full first-release acceptance path was driven through the real
API (not just eyeballed in the browser):

1. Signed in with the seeded user.
2. Created a new property/job.
3. Uploaded a synthetic sample PDF measurement report.
4. Confirmed the parser extracted the fields it recognized and flagged the rest `needs_review`
   (verified against the seeded 3950 Peartree Drive claim's real numbers, and against a second
   from-scratch test claim).
5. Corrected/overrode measurements — the original extracted value is preserved (visible in the UI
   under "Originally Extracted Values") even after correction.
6. Added accessories and an inspection finding.
7. Generated the initial estimate revision from the reusable price list (21 seeded line items,
   quantities computed from the calc engine).
8. Edited quantity, unit price, tax rate, waste %, and depreciation % — confirmed the summary
   totals recompute and that a manually-overridden quantity keeps its original
   system-calculated value alongside the override.
9. Saved the job (every mutation is a direct database write; there is no separate "save" step to
   forget).
10. Restarted the Next.js dev server process entirely and re-fetched the claim — all data
    (measurements, accessories, findings, line items) was intact.
11. Generated and downloaded a branded, paginated PDF for all 8 document types; verified each is a
    valid multi-section PDF.
12. Created a second estimate revision (duplicating the first) and edited a price on it —
    confirmed Revision 1's price was untouched.

A known bug was found and fixed during this pass: the PDF text-extraction label matcher was
escaping its own regex syntax (turning patterns like `Eaves?` into a literal string), so only the
first few fields ever matched. It's fixed and verified against a synthetic sample PDF containing
9 of the extractable fields — all 9 now extract correctly, with the remaining unset fields flagged
`needs_review` rather than left silently blank.

## What still requires an outside API, paid data source, or credential

The following are clearly labeled "Coming Soon" in the UI (never presented as working) or use
manual entry as their permanent, functional path — the app is fully usable without them, but they
would need real external services to automate:

- **Automated NOAA/NWS/NCEI weather lookups.** The Weather tab's data model and manual-entry form
  are fully functional (event date, hail size, wind speed, evidence level, confidence, source
  URL), and uploading a verified weather-history report PDF (tuned to the Predictive Sales AI
  format) auto-populates it. What's still marked "Coming Soon" is a *live* NOAA/NCEI API call
  made automatically from just an address — it's a straightforward addition (the NCEI Storm
  Events API is public/keyless) but wasn't wired up automatically to avoid making unverified
  network calls against a real address without your
  sign-off, and to keep the tool from ever fabricating a weather record.
- **Address-only roof measurement generation.** This app intentionally does **not** scrape or
  call GAF QuickMeasure, EagleView, Roofr, Google Maps, or any other imagery/measurement provider
  — doing so from an address alone would violate those services' terms and this app's own
  ground rules. Measurements only ever come from a report you upload or manual entry. Connecting
  a licensed measurement-provider API (e.g. EagleView's or GAF's official API, if you hold a
  commercial agreement with them) would need real credentials from that vendor and a
  provider-specific implementation of the existing `ReportParser` interface.
- **Production file storage (S3 or equivalent).** Ships with a local-disk `StorageProvider` that
  works out of the box; swapping to S3/Azure Blob/GCS for a multi-instance production deployment
  needs cloud credentials and a ~50-line provider implementation against the existing interface.
- **Managed Postgres.** Ships on SQLite for zero-config local use; production needs a real
  Postgres connection string (see Deployment above).
- **Company contact details in PDFs.** `src/lib/pdf/theme.ts` has placeholder phone/license text
  (`COMPANY.phone`, `COMPANY.license`) — fill in Black Ridge Roofing's real phone number and
  license number before sending these documents to a homeowner or carrier.
- **Code-enforcement citations.** By design, the app never invents a code requirement. The seeded
  sample claim's code report is intentionally left mostly as "Verification required" — a human
  must confirm each citation against Lake in the Hills / McHenry County's actual current
  ordinances and the IRC edition they've adopted before relying on it.

## Repository layout

```
scope-desk/
  prisma/schema.prisma      Data model (SQLite by default, Postgres-ready)
  prisma/seed.ts             Seed user, price list, and the 3950 Peartree Drive sample claim
  src/proxy.ts                Auth gate for every route (Next 16 "Proxy", formerly middleware)
  src/lib/auth.ts             Password hashing + signed session cookies
  src/lib/storage.ts          Private file storage interface + local implementation
  src/lib/parsers/            Report parser interface + PDF/CSV/XML implementations
  src/lib/calc/               Roofing measurement + estimate calculation engine
  src/lib/pdf/                Branded PDF document templates (all 8 types) + renderer
  src/app/api/                Route handlers (auth, claims, uploads, line items, documents, ...)
  src/app/(app)/               Authenticated pages (dashboard, new job, claim workspace, price list)
  src/components/claim/tabs/  The 8 claim-workspace tabs (Overview, Measurements, Accessories &
                               Inspection, Estimate, Code Report, Weather, Supplement, Documents)
```
