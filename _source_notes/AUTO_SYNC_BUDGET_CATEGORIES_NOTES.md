# Finora v2.1.0 — Auto-Sync, Budget Links, and Categories

This update improves multi-device use and transaction budgeting.

## Added
- Auto-pull from Supabase on login.
- Auto-pull when returning to the tab/window if there are no unsaved local changes.
- Auto-save shortly after every edit.
- Sync button now pulls the latest cloud state when there are no local changes, or saves local changes when there are unsaved edits.
- Transaction-level budget inclusion toggle.
- Budget selector for transactions marked as budget-included.
- Category dropdowns for transactions, budgets, and recurring items.
- Category Manager in Settings.
- CSV export now includes the linked budget column.

## Notes
- New transactions do not affect budgets unless the budget toggle is enabled and a budget is selected.
- Legacy transactions without the new budget fields still use the older automatic account/category budget matching behavior for compatibility.
- No SQL rerun is required. New fields are stored inside the existing Supabase JSON app state.
