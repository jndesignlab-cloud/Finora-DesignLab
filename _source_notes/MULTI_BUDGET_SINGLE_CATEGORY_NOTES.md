# Finora v2.1.2 — Multi-Budget Transactions + Single Category

This update corrects the v2.1.1 category behavior. Categories are now single-select again, while budget linking in the transaction form supports selecting multiple budgets.

## Updated behavior

- Transaction category is back to a normal dropdown.
- You can still add a new category from the transaction, budget, recurring, and Settings categories areas.
- The transaction budget toggle now reveals budget checkboxes so one transaction can update more than one budget.
- Budgets use a single category scope or All categories.
- Existing v2.1.1 multi-category records are normalized to their first category when edited/saved.
- Existing single-budget transaction links are migrated to the new budgetIds array automatically.

## Note

If one expense is linked to two budgets, Finora counts the full expense against each selected budget.
