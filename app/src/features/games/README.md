# Games Feature

## What Is Included

- `src/features/games/pages/` contains the Games hub and the playable `ME Bingo` page.
- `src/features/games/data/gameCatalog.ts` defines which games appear in the hub.
- `src/features/games/me-bingo/data/content.ts` stores the editorial bingo prompt pool with DE/EN text.
- `src/features/games/me-bingo/logic/` contains pure helpers for board generation, bingo detection, reset handling, and local statistics.
- `src/features/games/me-bingo/hooks/useMeBingoGame.ts` keeps the active round in local React state and persists only minimal aggregate stats to localStorage.

## How To Add Another Game

1. Add a new page under `src/features/games/pages/`.
2. Register it in `src/features/games/data/gameCatalog.ts`.
3. Add a route in `src/AppRoutes.tsx`.
4. Add DE/EN copy under `src/i18n/resources/`.
5. Prefer pure logic under a game-specific `logic/` folder and keep only aggregate stats in browser storage.

## How To Extend ME Bingo Content

- Add new prompt objects in `src/features/games/me-bingo/data/content.ts`.
- Keep `id` values stable so existing tests and board generation stay deterministic.
- Provide both `de` and `en` labels for every prompt.
- Keep prompts short enough to stay readable on a mobile 5x5 card.

## Test Coverage

- Unit tests cover board generation, toggling, bingo detection, full-card detection, stats updates, and storage fallback handling.
- Component tests cover the Games hub and the main `ME Bingo` play flow.
- E2E includes a smoke test for `/games` to `/games/me-bingo`, card interaction, new-card reset, and navigation back to the hub.
