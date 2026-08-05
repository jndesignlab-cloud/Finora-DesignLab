# Finora Configuration Notes

## Product

- Product name: **Finora**
- Owner brand: **DesignLab**
- Edition: **Supabase Edition**
- Version: **2.1.4**
- Intended use: **personal / in-house**
- Default currency: **PHP**
- Default locale: **en-PH**
- Custom domain: **finora.madebydesignlab.com**

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

## v2.1.1 category behavior

- Transactions can now have zero, one, or multiple categories.
- Category choices are toggleable chips instead of a single dropdown.
- Budgets can target all categories by leaving all chips unchecked.
- Budgets can also target one or multiple selected categories.
- Recurring items can now save multiple categories.
- Category charts split multi-category expenses evenly to avoid double-counting totals.

No SQL rerun is required because finance records are stored inside the existing Supabase app state JSON.

## Session behavior

Finora stores the active login token in `sessionStorage`, not `localStorage`. This keeps the login valid only for the current browser session. Closing/resetting the session logs the user out.

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

Suggested future versions:

```text
v2.1.4 — Transaction Polish
v2.2.0 — Smarter Budget Reports
v3.0.0 — Public Auth / Supabase Auth Edition
```


## v2.1.4 budget/category correction

Categories are single-select again. Transaction budget linking now supports selecting multiple budgets through toggle chips.


## v2.1.4 Routes
- Home: `/`
- Private manual entry: `/login.html`
- Clean app route: `/app/`
