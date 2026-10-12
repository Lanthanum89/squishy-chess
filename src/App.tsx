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
  if (s.turn === player) return s.check ? 'Your king is in check' : 'Your move'
  return s.check ? 'Computer is in check' : 'Computer is thinking…'
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
    setManualFlip(false)
    game.reset(side)
  }

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="game-brand">
          <Piece type="k" color={player} className="h-10 w-10" />
          <h1>Squishy Chess</h1>
        </div>
        {canInstall && <Button onClick={install} className="btn-small">Install app</Button>}
      </header>

      <div className="game-content">
        <section className="board-column" aria-label="Chessboard">
          <Board game={game} flipped={flipped} locked={computerTurn} />
          <p className="save-note">{game.saveAvailable ? 'Your game saves automatically.' : 'Your game cannot be saved in this browser.'}</p>
        </section>

        <aside className="game-sidebar" aria-label="Game controls">
          <div className="turn-status" aria-live="polite">
            <Piece type="k" color={game.status.kind === 'checkmate' ? game.status.winner : game.turn} className="h-12 w-12" />
            <div>
              <div className="turn-title">{statusText(game, player)}</div>
              {game.status.kind === 'playing' && <div className="turn-detail">{NAMES[game.turn]} · Move {Math.floor(game.moveCount / 2) + 1}</div>}
            </div>
          </div>

          <div className="game-actions">
            <Button onClick={undo} disabled={!canUndo}>Undo</Button>
            <Button onClick={() => setManualFlip((f) => !f)} aria-pressed={manualFlip}>Flip board</Button>
            <Button onClick={newGame} className="btn-quiet">New game</Button>
          </div>

          {game.captured.w.length + game.captured.b.length > 0 && <section className="captured-pieces" aria-label="Captured pieces">
            {([player, computer] as const).map((side) => <div className="capture-row" key={side}>
              <div className="capture-label">{side === player ? 'You' : NAMES[side]} captured <span>{game.captured[side].length}</span></div>
              <div className="capture-tray">{game.captured[side].map((t, i) => <Piece key={i} type={t} color={side === 'w' ? 'b' : 'w'} className="h-8 w-8" />)}</div>
            </div>)}
          </section>}

          <details className="game-settings">
            <summary>Settings <span className="settings-chevron" aria-hidden="true" /></summary>
            <div className="settings-content">
              <div>
                <div className="setting-label" id="play-as-label">Play as</div>
                <div className="side-picker" role="radiogroup" aria-labelledby="play-as-label">
                  {(['w', 'b'] as const).map((side) => <label key={side}>
                    <input type="radio" name="play-as" value={side} checked={player === side} onChange={() => chooseSide(side)} className="sr-only" />
                    <Piece type="k" color={side} className="h-11 w-11" />
                    <span>{NAMES[side]}<small>{side === 'w' ? 'Moves first' : 'Moves second'}</small></span>
                  </label>)}
                </div>
              </div>
              <Segmented label="Computer difficulty" options={LEVELS} value={level} onChange={setLevel} />
              <Segmented label="Theme" options={THEMES} value={theme} onChange={setTheme} />
              <Segmented label="Screen" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
            </div>
          </details>
        </aside>
      </div>
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
