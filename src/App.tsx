import { useEffect, useState } from 'react'
import { describeMove } from './moveAnnouncement'
import type { GameMode } from './gameSave'
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
  if (game.mode === 'pass-play') {
    if (s.kind === 'checkmate') return `${NAMES[s.winner]} wins!`
    if (s.kind === 'draw') return `Draw: ${s.reason}`
    return `${NAMES[s.turn]}’s move${s.check ? ' (in check!)' : ''}`
  }
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
  const player = game.player
  const [manualFlip, setManualFlip] = useState(false)
  // Applies from the computer's next move, so it is safe to change mid-game
  const [level, setLevel] = useStored<Level>('squishy-level', 'easy', LEVEL_IDS)
  const [theme, setTheme] = useTheme()
  const [orientation, setOrientation, rotationBlocked] = useOrientation()
  const { canInstall, install } = useInstall()

  // The player always starts at the bottom; Flip board turns the view round from there
  const flipped = (player === 'b') !== manualFlip
  const passPlay = game.mode === 'pass-play'
  const computerTurn = !passPlay && game.status.kind === 'playing' && game.turn !== player
  const inProgress = game.status.kind === 'playing' && game.moveCount > 0
  // Celebrate a player win, or either winner when playing with a friend. Closing it hides it until the game leaves checkmate (Undo, new game),
  // so replaying the same mating move celebrates again.
  const [winClosed, setWinClosed] = useState(false)
  const inCheckmate = game.status.kind === 'checkmate'
  const showWin = game.status.kind === 'checkmate' && (passPlay || game.status.winner === player) && !winClosed

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
  const undo = () => game.undo(passPlay ? 1 : game.turn === player ? 2 : 1)
  const canUndo = game.moveCount > (passPlay || player === 'w' ? 0 : 1)

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
    setManualFlip(false)
    game.reset(side)
  }

  function chooseMode(mode: GameMode) {
    if (mode === game.mode) return
    if (!confirmLoseGame('Change who you play with? The game in progress will be lost.')) return
    setManualFlip(false)
    game.reset('w', mode)
  }

  return (
    <main className="play-screen flex min-h-full flex-col items-center justify-center gap-4 p-4 wide:flex-row wide:items-start wide:gap-6">
      <div className="play-board w-[min(100%,62dvh)] wide:w-[min(calc(100dvw-22rem),calc(100dvh-2rem))] wide:shrink-0">
        <Board game={game} flipped={flipped} locked={computerTurn} />
      </div>

      <aside className="play-controls flex w-full max-w-sm flex-col gap-3 wide:w-72">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sel">
              <Piece type="k" color="w" className="h-9 w-9" />
            </div>
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
              Squishy Chess
            </h1>
          </div>

        </div>
        <div className="turn-status flex items-center gap-4 rounded-[1.75rem] bg-panel px-4 py-3" aria-live="polite" aria-atomic="true">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-sel">
            <Piece
              type="k"
              color={game.status.kind === 'checkmate' ? game.status.winner : game.turn}
              className="h-10 w-10"
            />
          </div>
          <div>
            {game.lastMove && <span className="sr-only">Last move: {describeMove(game.lastMove)} </span>}
            <div className="turn-title font-display text-2xl font-semibold leading-tight">{statusText(game, player)}</div>
            {game.status.kind === 'playing' && (
              <div className="text-sm font-bold text-ink-soft">
                {NAMES[game.turn]} · move {Math.floor(game.moveCount / 2) + 1}
              </div>
            )}
          </div>
        </div>

        <div className="game-actions grid grid-cols-2 gap-3">
          <Button onClick={undo} disabled={!canUndo}>Undo</Button>
          <Button onClick={() => setManualFlip((f) => !f)} aria-pressed={manualFlip}>
            Flip board
          </Button>
          <Button primary onClick={newGame} className="col-span-2">New game</Button>
        </div>

        {(game.captured.w.length > 0 || game.captured.b.length > 0) && <section className="capture-tray rounded-3xl bg-panel px-4 py-3" aria-label="Captured pieces">
          {(['w', 'b'] as const).map((side) => (
            <div key={side}>
              <div className="text-sm font-extrabold text-ink-soft">{NAMES[side]} squished</div>
              <div className="flex min-h-8 flex-wrap items-center">
                {game.captured[side].length === 0 && <span className="text-xs text-ink-soft">No captures yet</span>}
                {game.captured[side].map((type, i) => (
                  <span key={i} aria-label={`Captured ${type === 'p' ? 'pawn' : type === 'n' ? 'knight' : type === 'b' ? 'bishop' : type === 'r' ? 'rook' : 'queen'}`}>
                    <Piece type={type} color={side === 'w' ? 'b' : 'w'} className="h-8 w-8" />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>}

        <details className="move-history rounded-3xl bg-panel px-4 py-3" open={game.history.length > 0}>
          <summary className="cursor-pointer font-display text-lg font-semibold">Move history</summary>
          {game.history.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Your first move starts the story.</p> : (
            <div className="history-scroll mt-2 max-h-40 overflow-y-auto" tabIndex={0} aria-label="Scrollable move history">
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">Move</th><th scope="col">Blush</th><th scope="col">Blueberry</th></tr></thead>
                <tbody>{game.history.filter((_, i) => i % 2 === 0).map((move, i) => (
                  <tr key={i}>
                    <th scope="row">{i + 1}</th>
                    {[move, game.history[i * 2 + 1]].map((entry, side) => (
                      <td key={side} className="py-1.5" title={entry ? describeMove(entry) : undefined}>
                        {entry ? <span aria-label={describeMove(entry)}>{entry.san}</span> : '—'}
                      </td>
                    ))}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </details>



        {/* Keep game setup together and out of the way during play. */}
        <details className="game-settings group rounded-3xl bg-panel px-4 py-3">
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
            Play options
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
            <Segmented label="Play with" options={[{id:'computer',label:'Computer'},{id:'pass-play',label:'A friend'}]} value={game.mode} onChange={chooseMode} />
            {passPlay ? <p className="text-sm text-ink-soft">Take turns on this device. Blush moves first. Use Flip board when you pass it over.</p> : (
              <>
                <Segmented label="Computer difficulty" options={LEVELS} value={level} onChange={setLevel} />

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

              </>
            )}
            <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
            <div className="screen-options">
              <Segmented label="Screen" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
            </div>
            <p className="screen-help text-sm text-ink-soft" role="status">
              {rotationBlocked
                ? `Your browser couldn’t rotate the screen. Turn your device to ${orientation}.`
                : orientation === 'auto' ? 'Auto follows your device’s rotation setting.' : `Keep the screen in ${orientation}.`}
            </p>
            {canInstall && <Button onClick={install}>Install app</Button>}
          </div>
        </details>
        {!game.saveAvailable && <p className="save-note text-center text-xs font-semibold text-ink-soft">Your game cannot be saved in this browser.</p>}
      </aside>
      {showWin && (
        <WinCelebration
          winner={game.status.kind === 'checkmate' ? game.status.winner : player}
          title={passPlay && game.status.kind === 'checkmate' ? `${NAMES[game.status.winner]} wins!` : 'You win!'}
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
