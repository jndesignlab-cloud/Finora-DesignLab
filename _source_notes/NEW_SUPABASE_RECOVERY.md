# Finora v2.1.5 — New Supabase Recovery

This build points Finora to the replacement Supabase project:

- Project URL: `https://ulclhxperkzuchaoqwps.supabase.co`
- Publishable key: configured in `assets/js/config.js`

## Recovery order

1. If any existing Finora tab on any device is still open and still displays your old data, **do not refresh it**. Immediately go to Settings and export a JSON backup.
2. In the new Supabase project, open SQL Editor and run `supabase/finora_schema.sql` once.
3. Deploy this build to the Finora GitHub Pages repository.
4. Sign in with the seeded personal account (`jaravata`).
5. If you recovered a JSON backup, import it from Settings, then allow Finora to sync it to the new Supabase project.

## Important

Deleting a Supabase project deletes its database and Supabase-hosted backups. This build recreates the Finora schema and reconnects the app, but it cannot recreate deleted finance records unless you have an exported JSON backup or an already-open Finora tab that still has the old state in memory.

The publishable key is intended for browser clients. Never place a Supabase `service_role` key in the frontend.
