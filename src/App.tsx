import { useEffect, useState } from 'react'
import { LEVELS, pickMove, type Level } from './ai'
import Board from './components/Board'
import Piece from './components/Piece'
import { useGame } from './hooks/useGame'

const NAMES = { w: 'Blush', b: 'Blueberry' } as const
const PLAYER = 'w'
const LEVEL_KEY = 'squishy-chess:level'

function loadLevel(): Level {
  try {
    const v = localStorage.getItem(LEVEL_KEY)
    if (LEVELS.some((l) => l.id === v)) return v as Level
  } catch {
    // storage unavailable, fall back to the default
  }
  return 'easy'
}

function statusText(game: ReturnType<typeof useGame>) {
  const s = game.status
  if (s.kind === 'checkmate') return `${NAMES[s.winner]} wins!`
  if (s.kind === 'draw') return `Draw: ${s.reason}`
  if (s.turn === PLAYER) return `Your move${s.check ? ' (check!)' : ''}`
  return `Blueberry is thinking...${s.check ? ' (check!)' : ''}`
}

function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="rounded-2xl bg-blush px-5 py-4 text-lg font-bold shadow-sm active:scale-95 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}

export default function App() {
  const game = useGame()
  const [flipped, setFlipped] = useState(false)
  const [level, setLevel] = useState<Level>(loadLevel)

  const computerTurn = game.status.kind === 'playing' && game.turn !== PLAYER

  useEffect(() => {
    if (!computerTurn) return
    const id = setTimeout(() => {
      const move = pickMove(game.fen, level)
      if (move) game.play(move)
    }, 700)
    return () => clearTimeout(id)
    // fen changes exactly when the position does; game.play only wraps a setState
  }, [computerTurn, game.fen, level])

  function chooseLevel(l: Level) {
    setLevel(l)
    try {
      localStorage.setItem(LEVEL_KEY, l)
    } catch {
      // ignore
    }
  }

  // Take back the computer's reply as well, so undo returns to the player's turn
  const undo = () => game.undo(game.turn === PLAYER ? 2 : 1)

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4 landscape:flex-row landscape:gap-6">
      <div className="w-[min(100%,calc(100dvh-2rem))] landscape:w-[min(calc(100dvw-22rem),calc(100dvh-2rem))] landscape:shrink-0">
        <Board game={game} flipped={flipped} locked={computerTurn} />
      </div>

      <aside className="flex w-full max-w-sm flex-col gap-4 landscape:w-72">
        <h1 className="text-3xl font-extrabold tracking-tight">Squishy Chess</h1>
        <div className="rounded-3xl bg-white/70 p-4 text-xl font-bold shadow-sm" aria-live="polite">
          {statusText(game)}
        </div>

        {(['w', 'b'] as const).map((side) => (
          <div key={side} className="min-h-16 rounded-3xl bg-white/50 p-3">
            <div className="text-sm font-semibold opacity-70">{NAMES[side]} has squished</div>
            <div className="flex flex-wrap">
              {game.captured[side].map((t, i) => (
                <Piece key={i} type={t} color={side === 'w' ? 'b' : 'w'} className="h-9 w-9" />
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={level === l.id}
              onClick={() => chooseLevel(l.id)}
              className={`rounded-2xl px-2 py-3 text-base font-bold active:scale-95 ${level === l.id ? 'bg-blush-deep text-white' : 'bg-white/70'}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button onClick={undo} disabled={!game.canUndo}>Undo</Button>
          <Button onClick={() => setFlipped((f) => !f)}>Flip</Button>
          <Button onClick={game.reset}>New</Button>
        </div>
      </aside>
    </main>
  )
}
