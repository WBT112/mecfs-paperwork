# Games Feature

## What Is Included

- `src/features/games/pages/` contains the Games hub plus the playable `ME Bingo` and `Spoon Manager` pages.
- `src/features/games/data/gameCatalog.ts` defines which games appear in the hub and whether they are playable or placeholders.
- `src/features/games/me-bingo/data/content.ts` stores the editorial bingo prompt pool with DE/EN text.
- `src/features/games/me-bingo/logic/` contains pure helpers for board generation, bingo detection, reset handling, and local statistics.
- `src/features/games/me-bingo/hooks/useMeBingoGame.ts` keeps the active round in local React state and persists only minimal aggregate stats to localStorage.
- `src/features/games/spoon-manager/data/content.ts` stores the full Spoon Manager content model: start flavors, phase text pools, actions, events, and result flavors.
- `src/features/games/spoon-manager/logic/` contains pure helpers for seeded randomness, turn generation, phase transitions, combo-rule evaluation, and result summaries.
- `src/features/games/spoon-manager/hooks/useSpoonManagerGame.ts` keeps the active Spoon Manager day in local React state and persists only aggregate local statistics.
- `src/features/games/spoon-manager/storage/stats.ts` reads and writes privacy-preserving aggregate statistics in localStorage under `mecfs-paperwork.games.spoon-manager.stats.v1`.

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

## How To Extend Spoon Manager Content

- Add or adjust the data objects in `src/features/games/spoon-manager/data/content.ts`.
- Keep action, event, and flavor `id` values stable so seeded runs remain deterministic across tests.
- Provide DE/EN strings for every `titleKey`, `feedbackKey`, and `textKey`.
- Preserve the balancing assumptions in `src/features/games/spoon-manager/logic/spoonManager.ts`: at least one protective action per turn, six total turns, and moderate combo rules.

## Seeded Testability

- Spoon Manager supports deterministic runs through `?seed=...`.
- The same seed reproduces the starting spoons, intro text, phase texts, turn actions, and random events.
- The pure logic derives fresh seeded RNG scopes from the current state instead of storing a mutable RNG in React state.

## Test Coverage

- Unit tests cover board generation, toggling, bingo detection, full-card detection, stats updates, and storage fallback handling.
- Component tests cover the Games hub and the main `ME Bingo` play flow.
- E2E includes a smoke test for `/games` to `/games/me-bingo`, card interaction, new-card reset, and navigation back to the hub.
- Spoon Manager unit tests cover deterministic setup, action generation, phase transitions, delayed costs, combo rules, result evaluation, and storage fallback handling.
- Spoon Manager component tests cover idle, active, feedback, and result states.
- Spoon Manager E2E covers `/games` to `/games/spoon-manager`, a seeded full-day flow, restart, and navigation back to the hub.
