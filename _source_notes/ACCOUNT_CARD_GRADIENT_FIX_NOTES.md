# Finora v2.0.9 — Account Card + Gradient Fix

This update refines the Accounts page after the v2.0.6 clean deploy.

## UI fixes
- Reduced account-card balance size so values no longer overflow card boundaries.
- Added truncation guards for long account names, institutions, tags, and values.
- Adjusted account-card spacing, button size, and card grid minimum width.
- Dashboard mini account cards now also use safer balance sizing.

## DesignLab gradient fix
- Updated primary action buttons to the usual DesignLab blue-to-purple gradient.
- Removed the cyan middle stop from primary button gradients.
- Active navigation now follows the same blue-to-purple gradient language.

## Deploy
Upload the root contents of this build to GitHub Pages and open with `?v=2.0.9` for cache busting.
