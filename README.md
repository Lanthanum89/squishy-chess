# Squishy Chess

Pastel chess with squishy, blobby characters instead of pieces. Built as a tablet-first PWA, best in landscape.

## Stack

- Node 24 (see `.nvmrc`), TypeScript, React 19, Vite, Tailwind CSS 4
- [chess.js](https://github.com/jhlywa/chess.js) for rules and move legality (no hand-rolled move generation)
- `vite-plugin-pwa` for the manifest and service worker (offline, installable)
- pnpm, Oxlint

## Getting started

```bash
pnpm install
pnpm dev        # dev server, exposed on the LAN for testing on a tablet
pnpm build      # typecheck + production build
pnpm preview    # serve the production build
pnpm typecheck
pnpm lint
```

The service worker only runs in production builds. To test install and offline behaviour, use `pnpm build && pnpm preview`.

## Hosting

Built with a relative `base`, so it works from a GitHub Pages project subpath without config. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. In the repo settings, set Pages > Source to "GitHub Actions".

## Structure

```
src/
  App.tsx                 layout, side panel, controls
  components/Board.tsx    tap-to-move board, highlights, promotion picker
  components/Piece.tsx    renders a piece image from src/assets/pieces
  ai.ts                   the computer opponent and difficulty levels
  hooks/useGame.ts        game state derived from a move list (undo = pop)
assets/pieces/          12 transparent WebP pieces, named <colour><type> (e.g. wq = Blush queen)
public/                   app icons (192, 512 and a padded maskable 512)
```

## Design notes

- Tap to select, tap a dot to move. No drag, which is unreliable on touch and fiddly for small hands.
- You play Blush (white) and move first. The computer plays Blueberry.
- The computer is a small material-counting engine on top of chess.js, deliberately weak. Levels in `src/ai.ts`:
  - **Sleepy**: mostly random moves.
  - **Easy** (default): looks one move ahead, often misses things and sometimes plays a random move.
  - **Tricky**: looks two moves ahead (spots simple traps and mates in one), with a few random slips.
- The in-game difficulty toggle is deferred. The game is fixed to Easy via `LEVEL` in `src/App.tsx`.
- Tune difficulty via `CONFIG` in `src/ai.ts` (`noise` and `blunder` are the dials). Stockfish was ruled out as far too strong and a large precache asset.
- Pieces are raster art (WebP, 256x256, bottom-aligned). To swap a piece, replace its file in `src/assets/pieces` keeping the name and size. Piece heights are deliberately compressed (pawn ~74% of king) so faces stay readable on small squares.
- Game state is just the list of moves played. The position is rebuilt with chess.js on each change, which is cheap and makes undo trivial.

## Roadmap

- [ ] Difficulty toggle (engine levels already exist in `src/ai.ts`)
- [ ] Persist the game in `localStorage`
- [ ] Sounds and haptics
- [ ] Move animations between squares
- [ ] Alternative themes and character skins
- [ ] Pass-and-play auto-flip option

## Licence

MIT. See [LICENSE](LICENSE).
