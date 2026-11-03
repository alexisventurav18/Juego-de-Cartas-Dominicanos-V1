import type { Card } from './cards.ts';
import type { GameState } from './index.ts';

/** Carta boca abajo: conserva la cantidad de cartas pero no revela cuál es. */
function faceDown(tag: string, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({ id: `hidden-${tag}-${i}`, suit: 'comodin' as const, rank: 0 }));
}

/**
 * Estado de la partida tal como puede verlo el jugador del asiento `seat`:
 * su mano completa, y de lo demás (manos rivales, orden del mazo, muertos) solo cuántas cartas hay.
 * Esto es lo único que sale del servidor hacia los navegadores.
 */
export function projectState(state: GameState, seat: number): GameState {
  const hands = state.hands.map((hand, s) => (s === seat ? hand : faceDown(`hand${s}`, hand.length)));
  if (state.game === 'cinquillo') return { ...state, hands };
  if (state.game === 'casino') return { ...state, hands, deck: faceDown('deck', state.deck.length) };
  return {
    ...state,
    hands,
    deck: faceDown('deck', state.deck.length),
    muertos: [
      state.muertos[0] ? faceDown('muerto0', state.muertos[0].length) : null,
      state.muertos[1] ? faceDown('muerto1', state.muertos[1].length) : null,
    ],
  };
}
