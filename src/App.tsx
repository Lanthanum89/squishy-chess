import { useState } from 'react'
import Board from './components/Board'
import Piece from './components/Piece'
import { useGame } from './hooks/useGame'

const NAMES = { w: 'Blush', b: 'Blueberry' } as const

function statusText(game: ReturnType<typeof useGame>) {
  const s = game.status
  if (s.kind === 'checkmate') return `${NAMES[s.winner]} wins!`
  if (s.kind === 'draw') return `Draw: ${s.reason}`
  return `${NAMES[s.turn]} to move${s.check ? ' (check!)' : ''}`
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

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4 landscape:flex-row landscape:gap-6">
      <div className="w-[min(100%,calc(100dvh-2rem))] landscape:w-[min(calc(100dvw-22rem),calc(100dvh-2rem))] landscape:shrink-0">
        <Board game={game} flipped={flipped} />
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

        <div className="grid grid-cols-3 gap-3">
          <Button onClick={game.undo} disabled={!game.canUndo}>Undo</Button>
          <Button onClick={() => setFlipped((f) => !f)}>Flip</Button>
          <Button onClick={game.reset}>New</Button>
        </div>
      </aside>
    </main>
  )
}
