# Finora Configuration Notes

## Product

- Product name: **Finora**
- Owner brand: **DesignLab**
- Edition: **Supabase Edition**
- Version: **2.0.2**
- Intended use: **personal / in-house**
- Default currency: **PHP**
- Default locale: **en-PH**

## Frontend config file

This build is already configured with your provided Supabase project URL and publishable key. Edit only if you move to a different Supabase project.

File:

```text
assets/js/config.js
```

Current values:

```js
SUPABASE_URL: "https://yqlvdciruweoozisjone.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_0tB9Gj5P2bIhy3-csBbccg_mFswsot1",
```

Do not put the Supabase service role key in this file. Only the public publishable/anon key should be used in the frontend.

## Default seeded user

The Supabase schema seeds one owner account:

```text
username: jaravata
password: atavaraj
recovery code: finora-recovery-2026
```

These values are created in `supabase/finora_schema.sql`. They are stored in the database as hashes, not plaintext. Change them after first login.

## Supabase SQL files

### Install schema

```text
supabase/finora_schema.sql
```

This creates:

- `finora_users`
- `finora_sessions`
- `finora_user_state`
- `finora_audit_logs`
- RPC functions for login, logout, state sync, reset, password change, and recovery

### Restore default login

```text
supabase/reset_default_user.sql
```

Use this only if you locked yourself out.

## Versioning style

Follow the usual DesignLab versioning flow:

- Patch: small fixes, text edits, UI polish
- Minor: new feature or new app module
- Major: backend/security/storage architecture changes

Suggested next version:

```text
v2.0.2 — Setup Fixes
v2.1.0 — Normalized Tables Preview
v3.0.0 — Public Auth / Supabase Auth Edition
```


## Session behavior

Finora v2.0.7 stores the active login token in `sessionStorage`, not `localStorage`. This keeps the login valid only for the current browser session. Closing/resetting the session logs the user out.


## v2.0.7 — Finsights UI Refinement

This build softens the desktop UI to match the original Finsights reference more closely: lighter font weights, smaller headings, softer cards, yellow brand mark, black primary CTA, lime accents, and a cleaner login-first session flow.


## v2.0.7 — DesignLab Colorway

This build replaces the yellow/lime Finsights accents with the DesignLab palette: white/light background, deep navy text, royal/electric blue buttons and navigation, and soft blue-violet glow support.
