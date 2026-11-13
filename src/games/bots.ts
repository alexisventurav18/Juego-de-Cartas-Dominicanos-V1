import { applyCagaoMove, chooseCagaoMove, type CagaoState, seatsWithPairs } from './cagao';
import { applyCasinoMove, nextDealerSeat } from './casino';
import { casinoBotMove } from './casinoBot';
import type { GameState } from './index';
import { isBotPlayer, type MoveResult } from './shared';
import { applyTresYDosMove, chooseTresYDosMove, nextDealerSeat as nextTresYDosDealer, type TresYDosState } from './tresYDos';

const BOT_MOVE_MS = 1000;
/** En El Cagao el bot espera un poco más: así se alcanza a ver qué carta le robó a quién. */
const CAGAO_MOVE_MS = 1400;
/** Pausa entre un bot y otro al bajar sus pares iniciales en El Cagao. */
const PAIRING_MS = 900;
const ROUND_PAUSE_MS = 6000;

export interface BotStep {
  result: MoveResult<GameState>;
  delayMs: number;
}

function isBotTurn(state: GameState): boolean {
  return state.phase === 'playing' && isBotPlayer(state.players[state.turn]);
}

function moveDelay(state: GameState): number {
  return state.game === 'cagao' ? CAGAO_MOVE_MS : BOT_MOVE_MS;
}

/**
 * Espera antes de la siguiente jugada automática, o null si ahora no le toca a un bot.
 * Solo usa datos públicos, así que funciona con la vista de cualquier jugador.
 */
/** En la fase inicial de El Cagao, el primer bot que todavía tiene pares por bajar. */
function cagaoPairingBot(state: CagaoState): number | undefined {
  return seatsWithPairs(state).find((seat) => isBotPlayer(state.players[seat]));
}

export function botTickDelay(state: GameState): number | null {
  if (state.game === 'cagao' && state.phase === 'pairing') {
    return cagaoPairingBot(state) === undefined ? null : PAIRING_MS;
  }
  if (state.phase === 'roundEnd') {
    const dealer = state.game === 'tresydos' ? nextTresYDosDealer(state) : nextDealerSeat(state);
    return isBotPlayer(state.players[dealer]) ? ROUND_PAUSE_MS : null;
  }
  return isBotTurn(state) ? moveDelay(state) : null;
}

export function botStep(state: GameState): BotStep | null {
  if (state.game === 'cagao' && state.phase === 'pairing') {
    const seat = cagaoPairingBot(state);
    if (seat === undefined) return null;
    return { result: applyCagaoMove(state, seat, { type: 'pairAll' }), delayMs: PAIRING_MS };
  }
  if (state.phase === 'roundEnd') {
    if (state.game === 'tresydos') {
      const dealerSeat = nextTresYDosDealer(state);
      if (!isBotPlayer(state.players[dealerSeat])) return null;
      return { result: applyTresYDosMove(state, dealerSeat, { type: 'nextRound' }), delayMs: ROUND_PAUSE_MS };
    }
    const dealerSeat = nextDealerSeat(state);
    if (!isBotPlayer(state.players[dealerSeat])) return null;
    return { result: applyCasinoMove(state, dealerSeat, { type: 'nextRound' }), delayMs: ROUND_PAUSE_MS };
  }
  if (!isBotTurn(state)) return null;
  const result =
    state.game === 'casino'
      ? casinoBotMove(state)
      : state.game === 'tresydos'
        ? tresYDosBotMove(state)
        : cagaoBotMove(state);
  return { result, delayMs: moveDelay(state) };
}

export function tresYDosBotMove(state: TresYDosState): MoveResult<TresYDosState> {
  return applyTresYDosMove(state, state.turn, chooseTresYDosMove(state));
}

export function cagaoBotMove(state: CagaoState): MoveResult<CagaoState> {
  return applyCagaoMove(state, state.turn, chooseCagaoMove(state));
}
