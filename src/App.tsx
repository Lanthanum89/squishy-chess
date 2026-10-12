import { useEffect, useRef, useState } from 'react'
import type { Color } from 'chess.js'
import { pickMove, LEVELS, type Level } from './ai'
import Board from './components/Board'
import Piece from './components/Piece'
import WinCelebration from './components/WinCelebration'
import { useGame } from './hooks/useGame'

const NAMES = { w: 'Blush', b: 'Blueberry' } as const

function statusText(game: ReturnType<typeof useGame>, player: Color) {
  const s = game.status
  if (s.kind === 'checkmate') return s.winner === player ? 'You win, superstar!' : 'A good game, little thinker'
  if (s.kind === 'draw') return `Draw: ${s.reason}`
  if (s.turn === player) return s.check ? 'Your king is in check!' : 'Your move, superstar'
  return s.check ? `${NAMES[s.turn]} is in check!` : `${NAMES[s.turn]} is thinking…`
}

function Icon({ name }: { name: 'undo' | 'flip' | 'new' | 'sparkle' }) {
  const paths = {
    undo: <><path d="M9 5 4 10l5 5" /><path d="M4 10h10a6 6 0 0 1 0 12" /></>,
    flip: <><path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" /></>,
    new: <><path d="M12 5v14M5 12h14" /></>,
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export default function App() {
  const game = useGame()
  const [player, setPlayer] = useState<Color>('w')
  const [manualFlip, setManualFlip] = useState(false)
  const flipped = (player === 'b') !== manualFlip
  const computer: Color = player === 'w' ? 'b' : 'w'
  const [level, setLevel] = useState<Level>('easy')
  const [pendingSide, setPendingSide] = useState<Color | null>(null)
  const confirmNew = pendingSide !== null
  const resetTrigger = useRef<HTMLElement | null>(null)
  const [winClosed, setWinClosed] = useState(false)
  const inCheckmate = game.status.kind === 'checkmate'
  const showWin = game.status.kind === 'checkmate' && game.status.winner === player && !winClosed
  useEffect(() => { if (!inCheckmate) setWinClosed(false) }, [inCheckmate])
  useEffect(() => { if (!confirmNew) resetTrigger.current?.focus() }, [confirmNew])
  const computerTurn = game.status.kind === 'playing' && game.turn !== player
  const finished = game.status.kind !== 'playing'

  useEffect(() => {
    if (!computerTurn || confirmNew) return
    const id = setTimeout(() => {
      const move = pickMove(game.fen, level)
      if (move) game.play(move)
    }, 700)
    return () => clearTimeout(id)
  }, [computerTurn, game.fen, level, confirmNew])

  const undo = () => game.undo(game.turn === player ? 2 : 1)
  const canUndo = game.moveCount > (player === 'w' ? 0 : 1)
  const startNew = (side: Color = player) => {
    setPlayer(side)
    setManualFlip(false)
    game.reset()
    setPendingSide(null)
  }
  const requestNew = (side: Color) => {
    if (game.status.kind === 'playing' && game.moveCount > 0) {
      resetTrigger.current = document.activeElement as HTMLElement | null
      setPendingSide(side)
    } else startNew(side)
  }

  return (
    <main className="app-shell">
      <header className="app-header" inert={confirmNew || showWin}>
        <div className="brand">
          <span className="brand-mark"><Piece type="q" color={player} /></span>
          <span>Squishy<span className="brand-light"> Chess</span></span>
        </div>
        <span className="header-note"><Icon name="sparkle" /> A little brain adventure</span>
      </header>

      <div className="game-layout" inert={confirmNew || showWin}>
        <section className="play-area" aria-label="Chess game">
          <div className="player-strip">
            <span className={`avatar ${computer === 'b' ? 'avatar-blue' : 'avatar-pink'}`}><Piece type="k" color={computer} /></span>
            <div><strong>{NAMES[computer]}</strong><span>Your squishy opponent</span></div>
            <span className={`turn-tag ${computerTurn ? 'is-active' : ''}`}><i />{computerTurn ? 'Thinking' : 'Computer'}</span>
          </div>
          <Board game={game} flipped={flipped} locked={computerTurn || confirmNew} />
          <div className="player-strip">
            <span className={`avatar ${player === 'w' ? 'avatar-pink' : 'avatar-blue'}`}><Piece type="k" color={player} /></span>
            <div><strong>{NAMES[player]} <span className="you-label">YOU</span></strong><span>Little moves. Big possibilities.</span></div>
            <span className={`turn-tag ${!computerTurn && !finished ? 'is-active' : ''}`}><i />{finished ? 'Nice playing!' : computerTurn ? 'Up next' : 'Your turn'}</span>
          </div>
        </section>

        <aside className="game-panel" aria-label="Game controls">
          <div className={`status-card ${game.status.kind === 'playing' && game.status.check ? 'status-check' : ''}`} aria-live="polite">
            <span className="eyebrow">{finished ? 'WHAT A GAME' : 'LET’S PLAY'}</span>
            <h1>{statusText(game, player)}</h1>
            <p>{finished ? 'Ready for another little adventure?' : computerTurn ? 'A tiny pause for a big idea.' : 'Tap a friend, then tap a glowing spot.'}</p>
            <span className="status-star"><Icon name="sparkle" /></span>
          </div>

          <div className="game-actions">
            <button type="button" onClick={undo} disabled={!canUndo}><Icon name="undo" /><span>Undo</span></button>
            <button type="button" onClick={() => setManualFlip((f) => !f)} aria-pressed={manualFlip}><Icon name="flip" /><span>Flip board</span></button>
            <button type="button" className="new-game" onClick={() => requestNew(player)}><Icon name="new" /><span>New game</span></button>
          </div>

          <fieldset className="team-picker">
            <legend>Your team</legend>
            <div className="team-options">
              {(['w', 'b'] as const).map((side) => <label key={side} className={player === side ? 'team-selected' : ''}>
                <input type="radio" name="play-as" checked={player === side} onChange={() => requestNew(side)} />
                <Piece type="k" color={side} />
                <span><strong>{NAMES[side]}</strong><small>{side === 'w' ? 'Moves first' : 'Moves second'}</small></span>
              </label>)}
            </div>
          </fieldset>

          <fieldset className="difficulty-picker">
            <legend>Pick your pace</legend>
            <div className="difficulty-options">
              {LEVELS.map((option) => <button type="button" key={option.id} onClick={() => setLevel(option.id)} aria-pressed={level === option.id} disabled={computerTurn}>{option.label}</button>)}
            </div>
            <p>{level === 'sleepy' ? 'A gentle game. Take your time.' : level === 'easy' ? 'A little challenge, a lot of fun.' : 'Put your clever ideas to the test.'}</p>
          </fieldset>

          <div className="captured-section">
            <span className="eyebrow">THE SQUISH COLLECTION</span>
            {([player, computer] as const).map((side) => (
              <div className="collection-row" key={side}>
                <div className="collection-label"><i className={side === 'w' ? 'dot-pink' : 'dot-blue'} /><strong>{NAMES[side]} collected</strong><span>{game.captured[side].length}</span></div>
                <div className="collected-pieces">{game.captured[side].length ? game.captured[side].map((t, i) => <Piece key={i} type={t} color={side === 'w' ? 'b' : 'w'} />) : <span className="empty-collection">New friends will pop up here</span>}</div>
              </div>
            ))}
          </div>
          <p className="panel-footer">Small steps. Smart moves. Have fun.</p>
        </aside>
      </div>

      {pendingSide !== null && <NewGameDialog side={pendingSide} onCancel={() => setPendingSide(null)} onConfirm={() => startNew(pendingSide)} />}
      {showWin && <WinCelebration winner={player} onPlayAgain={() => startNew()} onClose={() => setWinClosed(true)} />}
    </main>
  )
}

function NewGameDialog({ side, onCancel, onConfirm }: { side: Color; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop" onClick={onCancel}>
    <div className="new-game-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Tab') {
        const buttons = e.currentTarget.querySelectorAll('button')
        const target = e.shiftKey ? buttons[0] : buttons[buttons.length - 1]
        if (document.activeElement === target) { e.preventDefault(); (e.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus() }
      }
    }}>
      <span className="dialog-mascot"><Piece type="q" color={side} /></span>
      <h2 id="new-game-title">A fresh adventure?</h2>
      <p>Start a new board as {NAMES[side]}. Your current game will end.</p>
      <div><button type="button" autoFocus onClick={onCancel}>Keep playing</button><button type="button" onClick={onConfirm}>Let’s go!</button></div>
    </div>
  </div>
}
