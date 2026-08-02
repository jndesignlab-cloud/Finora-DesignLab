# Finora v2.1.3 — Invitation Home + Clean App Route

This update separates the marketing/home page from the private app route.

## Route structure

- `/` or `/index.html` shows the public Finora hero page.
- The homepage Log in button opens an invitation-only modal and does not expose the app link.
- `/login.html` remains a private/manual entry point for the owner.
- `/login.html` redirects to `/app/` so the visible address bar uses a clean app route.
- `/app/` contains the actual Supabase-backed Finora login and dashboard.

## Notes

A static GitHub Pages site cannot truly hide a file path from the browser. The clean route only removes `.html` from the visible URL. Login/session security remains the real protection.
