import { applyBurakoMove, type BurakoMove } from './burako';
import { applyCasinoMove, type CasinoMove } from './casino';
import { applyCinquilloMove, type CinquilloMove } from './cinquillo';
import type { GameState } from './index';
import type { MoveResult } from './shared';

/** Aplica una jugada llegada de la red al juego correcto. Las propias reglas validan los detalles. */
export function applyGameMove(state: GameState, seat: number, move: unknown): MoveResult<GameState> {
  if (typeof move !== 'object' || move === null || typeof (move as { type?: unknown }).type !== 'string') {
    return { error: 'Jugada no válida.' };
  }
  try {
    if (state.game === 'casino') return applyCasinoMove(state, seat, move as CasinoMove);
    if (state.game === 'cinquillo') return applyCinquilloMove(state, seat, move as CinquilloMove);
    return applyBurakoMove(state, seat, move as BurakoMove);
  } catch {
    return { error: 'Jugada no válida.' };
  }
}
