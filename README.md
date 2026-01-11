# mecfs-paperwork

Offline-first paperwork tooling for ME/CFS documentation.

## Local development

```bash
cd app
npm install
npm run dev
```

## Quality gates

Run these from the `app/` directory:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run preview
```

## Notes

- The app is a static, offline-first React build with no telemetry.
- Use only clearly fake example data when adding fixtures or screenshots.
