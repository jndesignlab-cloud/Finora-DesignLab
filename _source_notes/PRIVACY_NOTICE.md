# Finora Privacy Notice

Finora by DesignLab — Supabase Edition is prepared for personal or in-house finance tracking.

## Data processed

Finora may store:

- Username and display name
- Password hash
- Recovery-code hash
- Session token hash
- Audit logs
- Accounts
- Transactions
- Budgets
- Savings goals
- Recurring items
- Reminders
- App preferences
- JSON backups exported by the user

## Purpose

The data is used to:

- Authenticate the owner account
- Save and sync finance records
- Display balances, budgets, goals, reminders, and insights
- Support backup, import, export, and reset actions
- Record basic security/audit events

## Storage

Data is stored in the Supabase project configured by the owner. The frontend does not require or store the Supabase service role key.

## Access

Access is controlled by the configured Supabase project, the seeded Finora login, and the RPC functions included in the schema.

## Data deletion

The owner can reset finance data inside the app. The owner can also delete Supabase rows or the entire Supabase project from the Supabase dashboard.

## Important note

If Finora is expanded for other users or public access, prepare a full legal/privacy review, data-processing records, user consent flow, retention policy, deletion process, and incident-response process.
