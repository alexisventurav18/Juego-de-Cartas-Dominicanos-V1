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
  if (state.game === 'tresydos') {
    // Al terminar la ronda todos muestran sus 5 cartas. Mientras se juega, solo se ve la propia mano.
    const revealed = state.phase !== 'playing';
    return {
      ...state,
      hands: revealed ? state.hands : hands,
      deck: faceDown('deck', state.deck.length),
      // La carta robada del Monte es secreta para los demás; la del Pozo ya la vio toda la mesa.
      drawnCardId: state.drawnFrom === 'deck' && seat !== state.turn ? null : state.drawnCardId,
    };
  }
  if (state.game === 'cagao') {
    // Mientras se juega solo ves tu mano. Al terminar se muestra quién se quedó con El Cagao.
    const event = state.lastEvent;
    return {
      ...state,
      hands: state.phase === 'gameOver' ? state.hands : hands,
      lastEvent: event
        ? {
            ...event,
            // La carta robada es secreta, salvo que sea El Cagao o haya formado un par (ambos son públicos).
            drawnCardId: event.cagao || seat === event.by ? event.drawnCardId : null,
          }
        : null,
    };
  }
  return { ...state, hands, deck: faceDown('deck', state.deck.length) };
}
