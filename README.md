# Folio

A private, Vercel-ready mutual-fund portfolio tracker built with Next.js 16, Supabase Auth/Postgres, and daily NAV data from MFAPI's public AMFI-backed feed.

## Included

- Email/password login with cookie-based Supabase SSR auth
- Row-level security so each user only sees their own holdings
- The four screenshot purchases already mapped to AMFI scheme codes
- Latest and purchase-date NAV lookup plus market-priced ETF holdings
- Current value, return, allocation, responsive holdings table, add/remove flows
- Exact-unit support; until units are entered, values are clearly marked as estimates

## Local setup

1. Create a Supabase project.
2. Run `supabase/migrations/202608060001_create_funds.sql` in the Supabase SQL Editor.
3. In Authentication → Users, create the login email and password (disable public signups if this is a one-person app).
4. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
5. Run `npm install`, then `npm run dev`.
6. Sign in and click **Load my 4 purchases** once.

## Deploy to Vercel

Import this folder into Vercel, add both environment variables from `.env.local`, and deploy. No service-role key is used or exposed.

## Data note

Mutual funds do not trade with tick-by-tick prices. NAVs normally update once per business day. The app checks the upstream feed hourly and serves the most recently published NAV. Exact returns require the allotted units or the final purchase NAV from the fund statement; otherwise the app estimates units from the purchase-date NAV.
