# Finora v2.0.9 — Custom Domain Ready

This update adds GitHub Pages custom-domain support for:

```text
finora.madebydesignlab.com
```

## Added

- `CNAME` file in the repository root
- Version bump to `2.0.9`
- Manifest cache-busting update
- Service worker cache update
- Deployment note update

## DNS record needed

Create this DNS record at the domain provider for `madebydesignlab.com`:

```text
Type: CNAME
Name/Host: finora
Value/Target: jndesignlab-cloud.github.io
```

After the DNS record is active, add `finora.madebydesignlab.com` in GitHub Pages custom domain settings and enable Enforce HTTPS once available.
