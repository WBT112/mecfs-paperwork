# Brand assets

The SVG masters in this folder are the single source of truth for favicon, PWA,
Open Graph, and Twitter preview assets.

- `logo-square.svg` → favicon + app icon sizes
- `logo-wide.svg` → social share preview (`1200x630`)

## Regenerating assets

From `app/` run:

```bash
npm run brand:generate
```

Outputs are written to `app/public/` and should be committed to the repository.

## Safe area guidance

Keep artwork comfortably inside the canvas bounds so the 16×16 favicon and
rounded masks stay readable without touching the edges.
