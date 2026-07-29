# Finora v2.0.9 — Account-Bound Budgets + Cloud Sync

This update adds account-scoped budgets while preserving Supabase cloud sync.

## Budget scope

Budgets can now be configured as:

- All Accounts / All Categories
- All Accounts / Specific Category
- Specific Account / All Categories
- Specific Account / Specific Category

## Device behavior

All app data is still stored in Supabase under the logged-in Finora user account. Logging in from another PC or phone will load the same data. The active device session remains session-only, so closing or resetting the browser session logs out that device.

## SQL

No SQL rerun is required for existing v2 installs because the budget field is stored in the existing JSONB app state.
