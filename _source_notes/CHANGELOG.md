# Changelog

## v2.0.6 — DesignLab Colorway

- Recolored Finora using the DesignLab palette: white/light base, deep navy text, royal/electric blue accents, and soft blue-violet support glow.
- Replaced the Finsights-style yellow/lime brand treatment with a blue-led DesignLab gradient system.
- Updated active navigation, CTA buttons, progress bars, cards, login accents, app icon, manifest theme color, and cache version.
- Kept the v2.0.4 softer Finsights layout and session-only login behavior.

## v2.0.6 — Finsights UI Refinement

- Refined the visual style to feel closer to the original Finsights app reference.
- Reduced heavy/blocky font weights across navigation, headings, buttons, account cards, and summaries.
- Reduced large desktop dashboard sizing and softened the sidebar, cards, buttons, and login panel.
- Restored the flatter Finsights-style background, yellow brand mark, black primary CTA, and lime accent treatment.
- Kept the session-only login flow: the dashboard remains hidden until login succeeds, and closing/resetting the browser session logs the user out.
- Updated cache/version references to force GitHub Pages and the service worker to load the new UI.


## v2.0.3 — Session Login + Finsights Typography Fix

- Fixed the login screen appearing on top of the dashboard by enforcing hidden-state rendering with `[hidden] { display: none !important; }`.
- Updated authentication storage from persistent `localStorage` to session-only `sessionStorage`, so closing/resetting the browser session logs the user out.
- Added cleanup for old persistent login tokens from v2.0.2.
- Changed the first screen into a focused login window before the dashboard loads.
- Softened typography to match the earlier Finsights build: lighter Inter weights, smoother spacing, and less blocky labels/buttons.
- Updated cache/version metadata to v2.0.3.

## v2.0.2 — GitHub Pages Deployment Fix

- Added `.nojekyll` for cleaner GitHub Pages static deployment.
- Added `DEPLOYMENT_FIX.md` with troubleshooting steps for the raw `config.md` display issue.
- Updated service worker cache name and navigation handling to reduce stale-cache problems.
- Verified that `index.html` contains the actual Finora app shell, not configuration notes.

## v2.0.2 — Supabase Configured Build

### Changed
- Inserted the provided Supabase project URL in `assets/js/config.js`.
- Inserted the provided Supabase publishable key in `assets/js/config.js`.
- Updated version metadata from v2.0.0 to v2.0.2.

### Setup
- Schema setup is still required: run `supabase/finora_schema.sql` in the Supabase SQL Editor before logging in.

## v2.0.0 — Supabase Edition

### Added
- Renamed product to **Finora by DesignLab**.
- Added Supabase-backed personal login using username/password.
- Added default seeded login: `jaravata` / `atavaraj`.
- Added owner recovery-code password reset.
- Added password change and recovery-code change.
- Added Supabase SQL schema with hashed passwords, hashed session tokens, failed-login lockout, audit logs, and private RPC functions.
- Added account-based finance state sync through Supabase JSONB.
- Added accounts, transactions, budgets, goals, recurring items, reminders, insights, app preferences, JSON import/export, CSV export, and reset.
- Added PWA shell, manifest, and service worker.
- Added privacy, terms, and security documents.

### Changed
- Shifted from local demo authentication / Apps Script concept to Supabase-backed personal cloud sync.
- Registration is disabled for this personal edition.

### Security
- Direct table grants to `anon` and `authenticated` are revoked.
- Tables have Row Level Security enabled.
- Public client uses specific RPC functions only.
