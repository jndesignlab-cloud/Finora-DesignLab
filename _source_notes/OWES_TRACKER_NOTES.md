# Finora v2.1.4 — Owes Tracker + Wallet Payment Posting

This update adds a dedicated Owes Tracker for personal payables and receivables.

## Added
- Owes page in the app navigation.
- Track two directions: **I owe someone** and **Someone owes me**.
- Record person/name, amount, category, due date, preferred wallet/account, and notes.
- Open checklist with partial/paid/overdue status.
- Payment action for payables creates an **expense transaction** and deducts from the chosen wallet/account.
- Payment received action for receivables creates an **income transaction** and adds to the chosen wallet/account.
- Partial payments are supported.
- Deleting a payment transaction removes the linked payment from the owe record.
- Dashboard Owes Checklist summary.
- CSV export includes the linked owe record column.

## Storage
No SQL migration is required. Owe records are stored inside the existing Supabase app state JSON.
