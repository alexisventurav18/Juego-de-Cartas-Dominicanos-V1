import { applyCagaoMove, type CagaoMove } from './cagao.ts';
import { applyCasinoMove, type CasinoMove } from './casino.ts';
import { applyTresYDosMove, type TresYDosMove } from './tresYDos.ts';
import type { GameState } from './index.ts';
import type { MoveResult } from './shared.ts';

/** Aplica una jugada llegada de la red al juego correcto. Las propias reglas validan los detalles. */
export function applyGameMove(state: GameState, seat: number, move: unknown): MoveResult<GameState> {
  if (typeof move !== 'object' || move === null || typeof (move as { type?: unknown }).type !== 'string') {
    return { error: 'Jugada no válida.' };
  }
  try {
    if (state.game === 'casino') return applyCasinoMove(state, seat, move as CasinoMove);
    if (state.game === 'tresydos') return applyTresYDosMove(state, seat, move as TresYDosMove);
    return applyCagaoMove(state, seat, move as CagaoMove);
  } catch {
    return { error: 'Jugada no válida.' };
  }
}
