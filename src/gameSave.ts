import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'

export type MoveInput = { from: Square; to: Square; promotion?: PieceSymbol }
export type GameMode = 'computer' | 'pass-play'
export type SavedGame = { version: 1; player: Color; mode: GameMode; moves: MoveInput[] }
export const GAME_KEY = 'squishy-game-v1'

export const emptyGame = (): SavedGame => ({ version: 1, player: 'w', mode: 'computer', moves: [] })

// Replay the entire history so captures, castling, repetition and undo survive a reload.
// Treat storage as untrusted: an incomplete or invalid save must never break the board.
export function readSavedGame(storage: Pick<Storage, 'getItem'>): SavedGame {
  try {
    const raw = storage.getItem(GAME_KEY)
    if (!raw) return emptyGame()
    const data = JSON.parse(raw)
    if (data?.version !== 1 || !['w', 'b'].includes(data.player) || !Array.isArray(data.moves) || data.moves.length > 2000) return emptyGame()
    if (data.mode !== undefined && !['computer', 'pass-play'].includes(data.mode)) return emptyGame()
    const chess = new Chess()
    const moves: MoveInput[] = []
    for (const move of data.moves) {
      if (!move || typeof move.from !== 'string' || typeof move.to !== 'string' ||
        !/^[a-h][1-8]$/.test(move.from) || !/^[a-h][1-8]$/.test(move.to) ||
        (move.promotion !== undefined && !['q', 'r', 'b', 'n'].includes(move.promotion))) return emptyGame()
      const input: MoveInput = { from: move.from as Square, to: move.to as Square }
      if (move.promotion !== undefined) input.promotion = move.promotion
      chess.move(input)
      moves.push(input)
    }
    return { version: 1, player: data.player, mode: data.mode ?? 'computer', moves }
  } catch {
    return emptyGame()
  }
}

export function writeSavedGame(storage: Pick<Storage, 'setItem'>, game: SavedGame): boolean {
  try {
    storage.setItem(GAME_KEY, JSON.stringify(game))
    return true
  } catch {
    return false
  }
}
