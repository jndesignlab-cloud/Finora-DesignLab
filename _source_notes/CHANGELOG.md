# Changelog

## v2.1.0 — Auto-Sync, Budget Links, and Categories

- Added auto-pull on login, tab focus, online return, and visibility return.
- Changed Sync Now to pull latest cloud state when clean, or save unsaved local changes when dirty.
- Added transaction-level Include in Budget toggle.
- Added manual budget selector per transaction.
- Added category dropdowns and custom category creation.
- Added Settings → Categories manager.
- Added linked budget column to CSV exports.
- Preserved legacy budget matching for older transactions without explicit budget settings.


## v2.0.9 — Account-Bound Budgets + Cloud Sync

- Added account scope to budgets: All Accounts or one selected account.
- Budgets now calculate spending only from the selected account when an account scope is chosen.
- Budgets can still be category-based, so you can use All Categories or a specific category.
- Supported budget combinations now include overall, category, account, and account + category budgets.
- Added budget scope labels on budget cards.
- Existing budgets automatically migrate as All Accounts budgets.
- Account deletion now warns when an account is linked to budgets, goals, recurring items, or reminders.
- Clarified that Finora data is saved to Supabase under the logged-in account, so the same data can be opened on another PC or phone after logging in.
- Updated service worker cache and version references to v2.0.9.

## v2.0.8 — Custom Domain Ready

- Added root CNAME file for `finora.madebydesignlab.com`.
- Added deployment notes for DNS and GitHub Pages custom-domain setup.

## v2.0.7 — Account Card + Gradient Fix

- Reduced account card balance sizing.
- Prevented long values from overflowing.
- Updated primary buttons to the DesignLab blue-to-purple gradient.

## v2.0.6 — Clean GitHub Pages Deploy

- Moved notes away from the root to avoid GitHub Pages serving documentation as the app page.
- Kept the actual app in `index.html`.

## v2.0.5 — DesignLab Colorway

- Recolored Finora using the DesignLab palette: light base, deep navy text, royal/electric blue accents, and blue-violet support glow.

## v2.0.4 — Finsights UI Refinement

- Refined the visual style to feel closer to the original Finsights app reference.
- Reduced heavy/blocky font weights and softened cards, buttons, and layout.

## v2.0.3 — Session Login Fix

- Login screen now appears before the dashboard.
- Switched active login token from persistent localStorage to sessionStorage.
- Closing/resetting the browser session logs the user out.

## v2.0.2 — GitHub Pages Deployment Fix

- Added `.nojekyll` and cache-busting changes.
- Confirmed that `index.html` contains the app shell.

## v2.0.1 — Supabase Configured Build

- Added Supabase project URL and publishable key.

## v2.0.0 — Supabase Edition

- Added Supabase-backed personal login using username/password.
- Added default seeded login: `jaravata` / `atavaraj`.
- Added owner recovery-code password reset, password change, account-based finance state sync, and app finance modules.
