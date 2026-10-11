# Squishy Chess

Pastel chess with squishy, blobby characters instead of pieces. Built as a tablet-first PWA, best in landscape.

## Stack

- TypeScript, React 19, Vite, Tailwind CSS 4
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

## Structure

```
src/
  App.tsx                 layout, side panel, controls
  components/Board.tsx    tap-to-move board, highlights, promotion picker
  components/Piece.tsx    inline SVG characters (one per piece type, two colourways)
  hooks/useGame.ts        game state derived from a move list (undo = pop)
public/                   icons (SVG source, 192 and 512 PNGs)
```

## Design notes

- Tap to select, tap a dot to move. No drag, which is unreliable on touch and fiddly for small hands.
- Blush (white) moves first. Blueberry is black.
- Characters are original SVG art, so recolouring or swapping a piece is a change to one component.
- Game state is just the list of moves played. The position is rebuilt with chess.js on each change, which is cheap and makes undo trivial.

## Roadmap

- [ ] Play against the computer (Stockfish WASM in a Web Worker)
- [ ] Persist the game in `localStorage`
- [ ] Sounds and haptics
- [ ] Move animations between squares
- [ ] Alternative themes and character skins
- [ ] Pass-and-play auto-flip option

## Licence

MIT. See [LICENSE](LICENSE).
