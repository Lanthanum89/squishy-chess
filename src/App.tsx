import { useEffect, useState } from 'react'
import type { Color } from 'chess.js'
import { LEVELS, pickMove, type Level } from './ai'
import Board from './components/Board'
import Piece from './components/Piece'
import Segmented from './components/Segmented'
import WinCelebration from './components/WinCelebration'
import { useGame } from './hooks/useGame'
import { useInstall } from './hooks/useInstall'
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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-2xl bg-blush px-2 py-4 text-base font-bold shadow-sm active:scale-95 disabled:opacity-40 ${className}`}
      {...props}
    >
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
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-4 landscape:flex-row landscape:gap-6">
      <div className="w-[min(100%,62dvh)] landscape:w-[min(calc(100dvw-22rem),calc(100dvh-2rem))] landscape:shrink-0">
        <Board game={game} flipped={flipped} locked={computerTurn} />
      </div>

      <aside className="flex w-full max-w-sm flex-col gap-3 landscape:w-72">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold leading-tight">Squishy Chess</h1>
          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="shrink-0 whitespace-nowrap rounded-2xl bg-blush-deep px-4 py-2 text-base font-bold shadow-sm active:scale-95"
            >
              Install app
            </button>
          )}
        </div>
        <div className="rounded-3xl bg-panel/70 p-4 text-xl font-bold shadow-sm" aria-live="polite">
          {statusText(game, player)}
        </div>

        <div className="rounded-3xl bg-panel/50 p-3">
          <div className="mb-2 text-sm font-semibold opacity-90" id="play-as-label">
            You are playing as
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="play-as-label">
            {(['w', 'b'] as const).map((side) => (
              <label
                key={side}
                className="flex cursor-pointer flex-col items-center rounded-2xl bg-panel/70 px-1 py-2 text-base font-bold active:scale-95 has-checked:bg-blush-deep has-checked:shadow-sm has-focus-visible:ring-4 has-focus-visible:ring-ink/50"
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
                <span className="text-xs font-semibold">
                  {side === 'w' ? 'Moves first' : 'Moves second'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {([player, computer] as const).map((side) => (
          <div key={side} className="min-h-16 rounded-3xl bg-panel/50 p-3">
            <div className="text-sm font-semibold opacity-90">
              {side === player ? 'You' : 'Computer'} ({NAMES[side]}) squished
            </div>
            <div className="flex flex-wrap">
              {game.captured[side].map((t, i) => (
                <Piece key={i} type={t} color={side === 'w' ? 'b' : 'w'} className="h-10 w-10" />
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={undo} disabled={!canUndo}>Undo move</Button>
          <Button onClick={() => setManualFlip((f) => !f)} aria-pressed={manualFlip}>
            Flip board
          </Button>
          <Button onClick={newGame} className="col-span-2">New game</Button>
        </div>

        {/* Collapsed by default so the controls still fit a landscape tablet without scrolling */}
        <details className="group rounded-3xl bg-panel/50 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-base font-bold [&::-webkit-details-marker]:hidden">
            Settings
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Segmented label="Computer difficulty" options={LEVELS} value={level} onChange={setLevel} />
            <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
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
