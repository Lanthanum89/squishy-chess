import { useEffect, useState } from 'react'
import type { Color } from 'chess.js'
import { LEVELS, pickMove, type Level } from './ai'
import Board from './components/Board'
import Piece from './components/Piece'
import Segmented from './components/Segmented'
import WinCelebration from './components/WinCelebration'
import { useGame } from './hooks/useGame'
import { useInstall } from './hooks/useInstall'
import { ORIENTATIONS, useOrientation } from './hooks/useOrientation'
import { useStored } from './hooks/useStored'
import { THEMES, useTheme } from './hooks/useTheme'

const NAMES = { w: 'Blush', b: 'Blueberry' } as const
const LEVEL_IDS = LEVELS.map((l) => l.id)

function statusText(game: ReturnType<typeof useGame>, player: Color) {
  const s = game.status
  if (s.kind === 'checkmate') return s.winner === player ? 'You win!' : 'The computer wins this time'
  if (s.kind === 'draw') return `Draw: ${s.reason}`
  if (s.turn === player) return s.check ? 'Your move (you are in check!)' : 'Your move'
  return s.check ? 'Computer is thinking... (it is in check!)' : 'Computer is thinking...'
}

function Button({
  children,
  className = '',
  primary = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button type="button" className={`btn ${primary ? 'btn-primary' : ''} ${className}`} {...props}>
      {children}
    </button>
  )
}

export default function App() {
  const game = useGame()
  const [player, setPlayer] = useState<Color>('w')
  const [manualFlip, setManualFlip] = useState(false)
  // Applies from the computer's next move, so it is safe to change mid-game
  const [level, setLevel] = useStored<Level>('squishy-level', 'easy', LEVEL_IDS)
  const [theme, setTheme] = useTheme()
  const [orientation, setOrientation] = useOrientation()
  const { canInstall, install } = useInstall()

  // The player always starts at the bottom; Flip board turns the view round from there
  const flipped = (player === 'b') !== manualFlip
  const computer: Color = player === 'w' ? 'b' : 'w'
  const computerTurn = game.status.kind === 'playing' && game.turn !== player
  const inProgress = game.status.kind === 'playing' && game.moveCount > 0
  // Celebrate a player win. Closing it hides it until the game leaves checkmate (Undo, new game),
  // so replaying the same mating move celebrates again.
  const [winClosed, setWinClosed] = useState(false)
  const inCheckmate = game.status.kind === 'checkmate'
  const showWin = game.status.kind === 'checkmate' && game.status.winner === player && !winClosed

  useEffect(() => {
    if (!inCheckmate) setWinClosed(false)
  }, [inCheckmate])

  useEffect(() => {
    if (!computerTurn) return
    const id = setTimeout(() => {
      const move = pickMove(game.fen, level)
      if (move) game.play(move)
    }, 700)
    return () => clearTimeout(id)
    // fen changes exactly when the position does; game.play only wraps a setState.
    // level re-arms a pending move, so a difficulty change applies to the very next reply.
  }, [computerTurn, game.fen, level])

  // Take back the computer's reply as well, so undo returns to the player's turn.
  // As Blueberry the computer's opening move is not undoable, or it would just replay it.
  const undo = () => game.undo(game.turn === player ? 2 : 1)
  const canUndo = game.moveCount > (player === 'w' ? 0 : 1)

  function confirmLoseGame(message: string) {
    return !inProgress || window.confirm(message)
  }

  function newGame() {
    if (!confirmLoseGame('Start a new game? The game in progress will be lost.')) return
    setManualFlip(false)
    game.reset()
  }

  function chooseSide(side: Color) {
    if (side === player) return
    if (!confirmLoseGame(`Start a new game as ${NAMES[side]}? The game in progress will be lost.`)) return
    setPlayer(side)
    setManualFlip(false)
    game.reset()
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-4 wide:flex-row wide:gap-6">
      <div className="w-[min(100%,62dvh)] wide:w-[min(calc(100dvw-22rem),calc(100dvh-2rem))] wide:shrink-0">
        <Board game={game} flipped={flipped} locked={computerTurn} />
      </div>

      <aside className="flex w-full max-w-sm flex-col gap-3 wide:w-72">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sel">
              <Piece type="k" color="w" className="h-9 w-9" />
            </div>
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
              Squishy Chess
            </h1>
          </div>
          {canInstall && (
            <Button primary onClick={install} className="min-h-12 whitespace-nowrap text-base">
              Install app
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4 rounded-[1.75rem] bg-panel px-4 py-3" aria-live="polite">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-sel">
            <Piece
              type="k"
              color={game.status.kind === 'checkmate' ? game.status.winner : game.turn}
              className="h-10 w-10"
            />
          </div>
          <div>
            <div className="font-display text-2xl font-semibold leading-tight">{statusText(game, player)}</div>
            {game.status.kind === 'playing' && (
              <div className="text-sm font-bold text-ink-soft">
                {NAMES[game.turn]} · move {Math.floor(game.moveCount / 2) + 1}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 px-1 text-sm font-extrabold text-ink-soft" id="play-as-label">
            You are playing as
          </div>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="play-as-label">
            {(['w', 'b'] as const).map((side) => (
              <label
                key={side}
                className="flex cursor-pointer flex-col items-center rounded-3xl bg-panel px-1 py-2 font-display text-lg font-semibold leading-tight ring-3 ring-transparent active:scale-95 has-checked:bg-sel has-checked:ring-berry has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
              >
                {/* Native radios: arrow keys and a single tab stop come from the browser */}
                <input
                  type="radio"
                  name="play-as"
                  value={side}
                  checked={player === side}
                  onChange={() => chooseSide(side)}
                  className="sr-only"
                />
                <Piece type="k" color={side} className="h-14 w-14" />
                {NAMES[side]}
                <span className="font-body text-[0.8125rem] font-bold text-ink-soft">
                  {side === 'w' ? 'Moves first' : 'Moves second'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {([player, computer] as const).map((side) => (
          <div key={side} className="min-h-17 rounded-3xl bg-panel px-4 py-2.5">
            <div className="text-sm font-extrabold text-ink-soft">
              {side === player ? 'You' : 'Computer'} ({NAMES[side]}) squished
            </div>
            <div className="flex flex-wrap">
              {game.captured[side].map((t, i) => (
                <Piece key={i} type={t} color={side === 'w' ? 'b' : 'w'} className="h-8 w-8" />
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={undo} disabled={!canUndo}>Undo move</Button>
          <Button onClick={() => setManualFlip((f) => !f)} aria-pressed={manualFlip}>
            Flip board
          </Button>
          <Button primary onClick={newGame} className="col-span-2">New game</Button>
        </div>

        {/* Collapsed by default so the controls still fit a landscape tablet without scrolling */}
        <details className="group rounded-3xl bg-panel px-4 py-3">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
            Settings
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current stroke-[2.5] transition-transform group-open:rotate-180"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Segmented label="Computer difficulty" options={LEVELS} value={level} onChange={setLevel} />
            <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
            <Segmented label="Screen" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
          </div>
        </details>
      </aside>
      {showWin && (
        <WinCelebration
          winner={player}
          onPlayAgain={() => {
            setManualFlip(false)
            game.reset()
          }}
          onClose={() => setWinClosed(true)}
        />
      )}
    </main>
  )
}
