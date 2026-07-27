# Finora GitHub Pages Deployment Fix

If GitHub Pages shows the `config.md` notes as plain text instead of the Finora app, the repository root is serving the wrong `index.html` content or an old cached service worker is still active.

## Correct file placement

For GitHub Pages, the repository root must contain these files and folders directly:

```text
index.html
assets/
supabase/
manifest.webmanifest
service-worker.js
.nojekyll
README.md
config.md
```

Do not upload only `config.md`, and do not paste the contents of `config.md` into `index.html`.

## Quick fix

1. Open the GitHub repository.
2. Delete the current wrong `index.html` if it contains `# Finora Configuration Notes`.
3. Upload everything from this package root directly into the repository root.
4. Commit the update.
5. Open the Pages URL with a cache-busting query:

```text
https://jndesignlab-cloud.github.io/Finora-DesignLab/?v=2.0.2
```

## Browser cache/service worker cleanup

If the old page still appears:

1. Open the site.
2. Press `Ctrl + Shift + R`.
3. If still cached, open DevTools > Application > Service Workers.
4. Click Unregister for the old service worker.
5. Clear site data for the GitHub Pages URL.
6. Reload.
