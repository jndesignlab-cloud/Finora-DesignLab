# Finora by DesignLab — Supabase Edition

**Version:** 2.0.2  
**Edition:** Supabase Edition  
**Tagline:** Money planning by DesignLab

Finora is a personal finance web app for accounts, transactions, budgets, savings goals, recurring items, reminders, insights, backup, and export. This edition uses Supabase as the private backend and is prepared for personal/in-house use.

## Default first-run login

```text
Username: jaravata
Password: atavaraj
Recovery code: finora-recovery-2026
```

Change the password and recovery code after first login if the app will be accessible outside your own device or local network.

## Included files

```text
index.html
assets/css/styles.css
assets/js/config.js
assets/js/app.js
assets/icons/icon.svg
manifest.webmanifest
service-worker.js
supabase/finora_schema.sql
supabase/reset_default_user.sql
config.md
README.md
CHANGELOG.md
VERSION
PRIVACY_NOTICE.md
TERMS_OF_USE.md
SECURITY.md
```

## Setup

1. Open your Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase/finora_schema.sql`.
4. This configured build already contains your Supabase URL and publishable key in `assets/js/config.js`.
5. Deploy the static files to your preferred private hosting, GitHub Pages, local server, or internal server.
6. Login using the default credentials.
7. Go to **Settings → Security** and change the password and recovery code.

## Recommended personal deployment

For personal use, the simplest setup is:

- Supabase project with the SQL schema installed
- Static web app hosted privately or in an unlisted GitHub Pages repository
- Strong Supabase dashboard password and 2FA
- No service role key in the frontend
- Regular JSON backup exports

## Feature list

- Username/password login
- Logout with revoked sessions
- Owner recovery-code password reset
- Password change
- Recovery-code change
- Failed-login lockout
- Hashed passwords through Postgres `pgcrypto`
- Hashed session tokens
- Audit log table
- Supabase-backed JSON state sync
- Accounts: wallet, bank, savings, credit, loan, investment, asset
- Transactions: income, expense, transfer
- Search/filter transaction ledger
- Budgets: daily, weekly, monthly, yearly
- Savings goals and contributions
- Recurring transactions and manual posting
- Credit card / loan due-day reminders
- Custom reminders
- Insights: today, month, year, category chart
- Balance visibility toggle
- Currency preference
- Light, dark, and system theme
- JSON backup/import
- CSV transaction export
- Reset finance data to zero
- PWA shell

## Security model

This version does not expose table reads/writes to the public anon client. Instead, it grants execution on specific RPC functions. Tables have Row Level Security enabled and direct grants revoked from `anon` and `authenticated`.

For personal use, finance records are saved as one JSONB state document per user. This keeps the app fast and simple while the feature flow is still evolving. A future multi-user/public release should migrate to Supabase Auth and normalized tables with user-level Row Level Security policies.

## Notes

This app is a finance tracker and planning dashboard only. It is not financial, accounting, tax, investment, or legal advice.


## v2.0.6 UI note

This release refines Finora to feel closer to the original Finsights UI: lighter type, smaller headings, softer cards, a less blocky dashboard, and a session-only login-first experience.


## v2.0.6 DesignLab Colorway

This release keeps the softer Finsights-style app layout while recoloring the product with the DesignLab visual system: white/light base, deep navy typography, royal/electric blue primary accents, and violet/lavender only as subtle supporting glow.
