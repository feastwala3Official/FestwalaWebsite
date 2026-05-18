# FeastWala — Deployment Guide

## Prerequisites
- Node.js installed (download from nodejs.org if not)
- Git installed
- Accounts: Vercel, Supabase, Cloudinary (all done ✅)

---

## STEP 1 — Run SQL in Supabase

1. Go to supabase.com → your project
2. Click **SQL Editor** (left sidebar)
3. Click **New query**
4. Open the file `supabase/schema.sql` from this folder
5. Copy ALL the content and paste into SQL Editor
6. Click **Run**
7. You should see "Success" — this creates all tables and seeds menu data

---

## STEP 2 — Install and run locally

Open terminal in this folder and run:

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — website should load.
Visit http://localhost:3000/admin — admin dashboard.
Admin password: `feastwala2026`

---

## STEP 3 — Deploy to Vercel (free, no sleeping)

```bash
npm install -g vercel
vercel
```

Follow the prompts:
- Set up and deploy? → Y
- Which scope? → your account
- Link to existing project? → N
- Project name → feastwala
- Directory → ./  (just press Enter)
- Override settings? → N

Vercel gives you a URL like `feastwala.vercel.app` — that's your live site!

---

## STEP 4 — Add Razorpay key (when ready)

Open `src/lib/supabase.js`
Find: `razorpayKey: 'rzp_test_REPLACE_WITH_YOUR_KEY'`
Replace with your actual key from razorpay.com

Then redeploy: `vercel --prod`

---

## STEP 5 — Add Google Sheets webhook (when ready)

Open `src/lib/supabase.js`
Find: `sheetWebhook: 'REPLACE_WITH_YOUR_APPS_SCRIPT_URL'`
Replace with your Apps Script URL

Then redeploy: `vercel --prod`

---

## Admin password change

Open `src/pages/Admin.jsx`
Find: `const ADMIN_PASS = 'feastwala2026'`
Change to something stronger before going public.

---

## URLs after deployment
- Website: yoursite.vercel.app
- Admin: yoursite.vercel.app/admin

---

## What's real-time (works across all devices)
- New orders → admin sees instantly (Supabase realtime)
- Menu changes (out of stock, price edit) → website updates for all customers
- Settings changes → reflected everywhere

## What uses WhatsApp
- Customer order confirmation → opens WhatsApp to 9711386962
- Contact form → opens WhatsApp
- Admin order status → WhatsApp customer
- Broadcast → opens WhatsApp for each customer (800ms gap)
- Delivery partner assignment → WhatsApp partner
