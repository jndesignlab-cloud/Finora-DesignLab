# Finora v2.1.1 — Toggleable Multi-Categories

This update makes categories toggleable instead of single-choice for transactions, budgets, and recurring items.

## Behavior

- A transaction can have no category, one category, or multiple categories.
- A budget can target all categories by leaving all category chips unchecked.
- A budget can also target one or multiple category chips.
- Transaction-to-budget inclusion is still controlled manually through the Include this transaction in a budget toggle.
- Category insights split a multi-category expense evenly across its selected categories to avoid inflating the total expense amount.

## Storage

The app keeps the legacy `category` field for older records and adds a `categories` array for multi-category support. No SQL rerun is required because the data is stored in the existing Supabase app state JSON.
