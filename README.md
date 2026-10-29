# Tay Scientific Instrument Sdn Bhd — labstoreonline.com

Catalogue and quotation website. Next.js (App Router) + Supabase + Tailwind.

## 1. Run locally
```bash
npm install
cp .env.example .env.local     # then fill in your Supabase URL + anon key
npm run dev                    # http://localhost:3000
```

## 2. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → Users → Add user (your admin email + password).
4. SQL Editor → run:
   `insert into admin_users (user_id) select id from auth.users where email = 'YOUR-ADMIN-EMAIL';`
5. Copy Project URL and anon key (Settings → API) into `.env.local`.

## 2b. Brands page data
In Supabase SQL Editor run, in this order: `supabase/migration_brand_page.sql`, then `supabase/seed_from_website.sql`.

## 2c. Form limits (recommended)
In Supabase SQL Editor run `supabase/migration_hardening.sql`. It adds size limits to the enquiry form and quotation requests.

## 3. Edit your company details
Open `src/lib/company.ts`. Phone, email, addresses and opening hours are filled in from tayscientific.com.my. Check the lines marked `CHECK` (WhatsApp number and the About text).

## 3a. Brand logos and website links
The Brands page shows logo tiles. Put each logo in `public/brands/<slug>.png` (for example `public/brands/merck.png`), or set `logo_url` for the brand in Supabase (any image type, e.g. `/brands/merck.svg`). A brand without a logo shows its name instead.
Slugs: merck, sigma-aldrich, thermo-fisher, fstest, memmert, innova, bwb, precisa, biobase, drawell, lachoi, lichen, hach, hanna-instruments, hudson, newstar.
Each brand's official website link comes from `website_url` in the `brands` table (seeded from tayscientific.com.my). It shows in one panel on that brand's page. Brands without a link show an "Ask our team" button instead.

## 3a-2. Home page promotions (monthly)
Run `supabase/migration_promotions.sql` once in the Supabase SQL Editor (creates the `promotions` table and image bucket).
Then go to **Admin → Promotions**, upload the poster (JPG/PNG/WebP, square or portrait), add a title, dates and an optional button link, and Save.
The promotion shows in the home page banner from its start date to its end date (Malaysia time). Several live promotions rotate. If none is live, the sample quotation card shows instead.
Use **Hide** to take one down early, **Delete** to remove it and its image.
All home page banners are managed in **Admin → Banners**: upload, hide, delete, change the end date and reorder with ↑ ↓. Ready-made banners (Tay Scientific, LACHOI, FSTest, MANTECH MT3/MT4 offer) can be added there with one click; they are listed in `src/lib/defaultAds.ts`. Until any banner is added there, the home page shows the Tay, LACHOI and FSTest banners.

## 3a-3. LACHOI catalogue (114 models)
Run `supabase/import_lachoi_catalog.sql` once in Supabase → SQL Editor. It adds every model from the LACHOI 2025 catalogue with
specifications, key features and a photo (photos are in `public/products/lachoi/`, served by the website, not Supabase Storage).
Safe to run again: it updates products by SKU. It also hides the old one-line-per-series LACHOI placeholders.

## 3a-4. FSTest products (8)
Run `supabase/import_fstest_products.sql` in Supabase → SQL Editor. Adds the ATP monitor, swabs, pathogen rapid test kits and count plates
from the FSTest brochure. Photos: `public/products/fstest/`, logo: `public/brands/fstest.png`. Safe to run again.

## 3a-5. Product photos
`supabase/update_product_photos.sql` points every LACHOI and FSTest product at its sharp photo in `public/products/`
and hides the old FSTest name-only placeholders. Safe to run any time.
To refresh FSTest photos from the official website: `npm run images:fstest`, then run the SQL file it creates.

## 3a-6. DLAB catalogue (183 products)
Run `supabase/import_dlab_catalog.sql` in Supabase → SQL Editor. Adds the DLAB brand and every instrument model from the
DLAB 2025 catalogue (incl. "coming soon" new arrivals) with specs, features and photos (`public/products/dlab/`). Safe to run again.

## 3a-7. Precisa, NEWSTAR, STIER, Innova, Steroglass
Run each `supabase/import_<brand>_catalog.sql` once in Supabase → SQL Editor (precisa 151, newstar 83, stier 9, innova 11, steroglass 1 products).
Photos: `public/products/<brand>/`, logos: `public/brands/<brand>.png`. Safe to run again.

## 3a-9. Drawell DC/DCW baths and Eutech 150 & 450 meters
Run in Supabase → SQL Editor: `supabase/import_drawell_dc_series.sql` (28 Drawell DC-Series/DCW-Series refrigerated
thermostatic baths) and `supabase/import_eutech_150_450.sql` (new brand **Eutech Instruments**, 21 waterproof handheld
pH / conductivity / DO meter configurations). Photos: `public/products/drawell/`, `public/products/eutech/`;
logo: `public/brands/eutech-instruments.png`. Safe to run again.

Eutech 1700 Series bench meters (1710 pH/mV, 1720 conductivity, 1730 DO, 9 configurations + 3 accessories):
run `supabase/import_eutech_1700_series.sql`.
Eutech TN-100 turbidimeter (2 versions + calibration kit and cuvettes): run `supabase/import_eutech_tn100.sql`.
HORIBA (new brand) LAQUAtwin pocket meters (13) and LAQUA 2000 Series benchtop meters (20 kits): run `supabase/import_horiba_laqua.sql`.
HORIBA LAQUA 200 Series handheld meters (13 kits incl. TB220 turbidity) and 1500 Series benchtop meters (8 kits): run `supabase/import_horiba_laqua_200_1500.sql`.
MANTECH (new brand) T10, PeCOD L50, MT3, MT4, MT10, MT30, MT100: run `supabase/import_mantech.sql`. Photos: `public/products/mantech/`, logo: `public/brands/mantech.png`.
METTLER TOLEDO (new brand) EasyPlus titrators, Easy EPM, Easy Dose, EasyDirect software, Densito/DensitoPro, MyBrix: run `supabase/import_mettler_toledo.sql`. Photos: `public/products/mettler-toledo/`.
PEAK Scientific gas generators (Genius XE, Precision, Solaris, Intura; 41 models): run `supabase/import_peak_scientific.sql`. Photos: `public/products/peak-scientific/`.
Photos: `public/products/horiba/`, logo: `public/brands/horiba.png`.

## 3a-10. Remove old placeholders
Run `supabase/remove_old_placeholders.sql` (after the imports above). It deletes only the old name-only products from
`seed_from_website.sql` that have no photo, and the brands without a logo (Biobase, Lichen, Hach, Hanna Instruments, Hudson).
All products from the brand catalogues are kept. The Brands page only shows brands that have a logo.

## 3a-11. Product search
Search ignores spaces, dashes, slashes and word order, so "uv vis", "uv-vis" and "uvvis" all find "UV-VIS",
and "dc1006" finds "DC-1006". It looks in the product name, SKU, brand and category. See `src/lib/search.ts`.

## 3a-8. Admin → Products
Run `supabase/migration_admin_products.sql` once (creates the `product-images` photo storage).
Then staff can add, edit, hide and delete products and upload photos in **Admin → Products** — no SQL needed.

## 3a-12. Customer address on quotations
Run `supabase/migration_quotation_address.sql` once. The quote cart then saves the customer's address; it shows in Admin → Quotations, in the quotation email and on the customer's printable request.

## 3a-13. Service request form
The Services page has a "Request a service" form (type of service, equipment info, customer contact).
Run `supabase/migration_service_requests.sql` once: each request is then saved in the database with a reference
(e.g. SR-2026-0001), shown in **Admin → Service requests** (status, staff notes, search) and emailed to
`service@tayscientific.com.my` using the same SMTP settings as the careers form. To send test emails elsewhere, set
`SERVICE_EMAIL=you@example.com` in `.env.local`. The address is `serviceEmail` in `src/lib/company.ts`; the dropdown
choices are in `src/lib/serviceTypes.ts` (keep them in step with the list in the SQL function).

## 3a-14. Events page
Run `supabase/migration_events.sql` once. It creates the events table and photo storage, and adds the first event
(Product Knowledge Sharing Session, 30 Sep 2026, photos in `public/events/`). Staff add, edit, hide and delete events in
**Admin → Events** (title, date, time, location, collaboration partners, summary, write-up and photos; the first photo is the cover).
The public page is `/events` (menu: Events). Events dated today or later show as Upcoming, older ones as Past.
Optional header photo: `public/bg/events.jpg`.

## 3a-15. Photo resizing and storage used
Photos uploaded in Admin → Products, Banners and Events are resized in the browser before upload (products 1200 px,
banners 1920 px, events 1600 px, JPG), so phone photos take about 150-400 KB instead of several MB.
Run `supabase/migration_storage_usage.sql` once to show **Storage used** on the Admin dashboard (uploaded photos per
section and database size, against the Supabase Free plan limits set in `src/app/admin/(panel)/StorageUsage.tsx`).

## 3a-16. Admin areas, Service portal and Career jobs
The admin dashboard shows three boxes: **Sales** (Quotations, Enquiries, Products, Banners, Events),
**Admin / Finance** (Career jobs, Banners) and **Services** (New service requests, Service portal).
Storage used is shown at the bottom of the dashboard. Click a box to see its sections, then a section to open its list. "Dashboard / Sales / Quotations" links at the top of
each page lead back. The areas and their sections are set in `src/app/admin/(panel)/adminGroups.ts`.

**Service portal** (replaces the old Staff Portal / service-recorder): run `supabase/migration_service_portal.sql` once.
Staff add a service record when an instrument comes in (status goods received, in progress, completed), search and
edit records, and fill in the report details (work scope with PASS/FAIL and photos, working time, Sections G, H, I).
Report numbers are given automatically as TSI/SR/<year>/<number>. To continue from your old numbers, run the
commented `insert into service_report_counters ...` line in that file with the last number used.
Only completed jobs have a **service report** (Print / Save as PDF, A4, same layout as the paper form SR V2.0).
A website service request can be turned into a service record with "Create service job from this request".
Ongoing jobs show in the Service portal (Goods received / In progress tabs).
Filter the list by month and year (counted by date in or date out) to see how many jobs were done in that period;
"Download Excel (.xlsx)" exports the filtered jobs plus a Summary sheet (by status, month, service type, technician, brand).
After updating, run `npm install` once (adds the exceljs package).
More than one instrument on a report: run `supabase/migration_service_equipment.sql` once, then use
"+ Add another instrument" on the form (each becomes a column in Section D). Section I has a customer approval signature box.
Customer emails: run `supabase/migration_service_notifications.sql` once (after the service portal file). When staff
save a record with "Email the customer about this update" ticked, the company email gets a goods received / in progress /
completed email (copy to the service inbox). The completed email has a "View service report" link
(`/service-report/<code>`, a private link only the customer receives). Each record lists the emails sent.
The report is computer-generated: it has no signature boxes and says no signature is required.

**Career jobs**: run `supabase/migration_jobs.sql` (job openings, copied from `src/lib/jobs.ts`) and
`supabase/migration_job_applications.sql` (applications + private CV storage) once. Admin → Admin / Finance → Career jobs
lists everyone who applied (position, contact details, Download CV, status, staff notes). "Manage job openings" on that
page adds, edits, closes and deletes openings; the Careers page shows open jobs. Applications are still emailed too.

## 3a-17. Calibration log and due reminders
Run `supabase/migration_calibrations.sql` once. Admin → Services → Calibration log: add each calibration (instrument,
customer, calibration date, validity in months, in-house or external provider, cert no.); the due date is worked out
automatically and reference numbers are given as TSI/CR/<year>/<number> (continue your old numbering with the commented line in the SQL file).
Filter by month/year (calibration or due date) and status (overdue / due within 1 month / valid), and Download Excel.
**Reminders:** 1 month before the due date (e.g. due 26 Nov → emailed 26 Oct) the customer email gets a "Calibration Due Notification" (one email per
customer listing all their instruments), copied to `calibrationReminderEmail` in `src/lib/company.ts`
(for now darwisyahliana@gmail.com; or set CALIBRATION_REMINDER_EMAIL). Each due date is reminded once.
- Live site (Vercel): `vercel.json` runs the check every day at 9:00 am Malaysia time. Add `CRON_SECRET` and
  `SUPABASE_SERVICE_ROLE_KEY` to Vercel → Settings → Environment Variables (see `.env.example`).
- Any time (also on your computer): "Send due reminders now" on the Calibration log page.

## 3a-18. Speed
Public pages (home, products, brands, services, events, careers) read the database through a cached client
(`src/lib/supabase/public.ts`): results are kept for 60 seconds, so clicks don't wait for the database every time.
Admin saves (products, banners, events, jobs) clear the cache at once via `/api/revalidate`.
`vercel.json` runs the server in Mumbai (`bom1`), the same region as the Supabase project (ap-south-1). If Supabase ever moves, change it to match (Singapore = `sin1`).

## 3a-19. Where the website's emails go (`src/lib/company.ts`)
- Career applications (CV attached): admin@tayscientific.com.my, also in Admin → Career jobs
- Service requests, service portal copies, calibration reminder copies: service@tayscientific.com.my
- Contact page enquiries and quote cart quotations: sales2@, yihong.tan@ and jacqie@tayscientific.com.my, also in Admin → Enquiries / Quotations
- WhatsApp: 018-779 0021
Environment variables SERVICE_EMAIL, CALIBRATION_REMINDER_EMAIL, ENQUIRY_EMAILS (comma-separated) and QUOTATION_EMAIL
override these; remove them from .env.local / Vercel if they still point to a test inbox.

## 3b. Careers page
Open roles live in `src/lib/jobs.ts`. Edit, add or delete a block to change what shows on `/careers`.
The descriptions are drafts: replace them with your real job details.
Applicants fill in the form on `/careers` and upload their CV (PDF/DOC/DOCX, max 4 MB). On Submit, the site emails their details with the CV attached to `company.careersEmail` (admin@tayscientific.com.my). Press Reply in your inbox to answer the applicant directly.
**Apply Now** in a job window jumps to the form with that role already selected.

The form sends mail through an SMTP account. Add these env vars (in `.env.local` and in Vercel):
`SMTP_HOST`, `SMTP_PORT` (465 or 587), `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`. See `.env.example`.
- Domain mailbox (cPanel): host `mail.tayscientific.com.my`, port 465, the mailbox address and password.
- Google Workspace / Gmail: host `smtp.gmail.com`, port 465, and an App Password (not your normal password).
- Microsoft 365: host `smtp.office365.com`, port 587.
Tip: create a mailbox such as careers@tayscientific.com.my just for sending.

Link straight to a role with `/careers#service-engineer` (the slug is the part after the `#`).

## 4. Deploy
Push to GitHub → import in Vercel → add the env vars (Supabase + SMTP) → add domain `labstoreonline.com`.
In Supabase → Authentication → URL Configuration, set Site URL to your domain.

## Pages
Public: `/` `/products` (categories, then `?category=slug` for that category's products) `/products/[slug]` `/brands` (brand tiles, filter with `?category=slug`) `/brands/[slug]` (one brand's products + official website link) `/cart` `/enquiry` `/services` `/careers`
Admin: `/admin/login` `/admin` `/admin/quotations` `/admin/enquiries`
