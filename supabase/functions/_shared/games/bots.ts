// GENERADO por scripts/syncFunctions.ts desde src/games. No lo edites a mano: cambia el original y ejecuta `npm run sync:functions`.
import { AMERICAN_RANKS, type Card } from './cards.ts';
import { applyCasinoMove, nextDealerSeat } from './casino.ts';
import { casinoBotMove } from './casinoBot.ts';
import { applyCinquilloMove, type CinquilloState, isPlayable } from './cinquillo.ts';
import { applyBurakoMove, type BurakoState, cardPoints, isValidMeld, isWild, type Meld } from './burako.ts';
import type { GameState } from './index.ts';
import { isBotPlayer, type MoveResult, teamOf } from './shared.ts';

const BOT_MOVE_MS = 1000;
const ROUND_PAUSE_MS = 6000;

export interface BotStep {
  result: MoveResult<GameState>;
  delayMs: number;
}

function isBotTurn(state: GameState): boolean {
  return state.phase === 'playing' && isBotPlayer(state.players[state.turn]);
}

/**
 * Espera antes de la siguiente jugada automática, o null si ahora no le toca a un bot.
 * Solo usa datos públicos, así que funciona con la vista de cualquier jugador.
 */
export function botTickDelay(state: GameState): number | null {
  if (state.game === 'cinquillo') return isBotTurn(state) ? BOT_MOVE_MS : null;
  if (state.phase === 'roundEnd') {
    if (state.game === 'casino') {
      return isBotPlayer(state.players[nextDealerSeat(state)]) ? ROUND_PAUSE_MS : null;
    }
    return state.summary ? ROUND_PAUSE_MS : BOT_MOVE_MS;
  }
  return isBotTurn(state) ? BOT_MOVE_MS : null;
}

export function botStep(state: GameState): BotStep | null {
  if (state.game === 'cinquillo') {
    if (!isBotTurn(state)) return null;
    return { result: cinquilloBotMove(state), delayMs: BOT_MOVE_MS };
  }
  if (state.phase === 'roundEnd') {
    if (state.game === 'casino') {
      const dealerSeat = nextDealerSeat(state);
      if (!isBotPlayer(state.players[dealerSeat])) return null;
      return { result: applyCasinoMove(state, dealerSeat, { type: 'nextRound' }), delayMs: ROUND_PAUSE_MS };
    }
    const result = applyBurakoMove(state, 0, { type: 'nextRound' });
    return { result, delayMs: state.summary ? ROUND_PAUSE_MS : BOT_MOVE_MS };
  }
  if (!isBotTurn(state)) return null;
  const result = state.game === 'casino' ? casinoBotMove(state) : burakoBotMove(state);
  return { result, delayMs: BOT_MOVE_MS };
}

function rankIndex(card: Card): number {
  return AMERICAN_RANKS.indexOf(card.rank);
}

/** Cuántas cartas de mi mano encadenan seguidas desde `start` en la dirección `step`. */
function chainLength(hand: Card[], suit: Card['suit'], start: number, step: 1 | -1): number {
  let length = 0;
  for (let i = start; i >= 0 && i < AMERICAN_RANKS.length; i += step) {
    if (!hand.some((c) => c.suit === suit && rankIndex(c) === i)) break;
    length += 1;
  }
  return length;
}

/**
 * Puntúa una carta jugable en Cinquillo:
 *  - prefiere las que dejan jugables otras cartas mías de la misma escalera (cadena propia),
 *  - evita abrirle la siguiente carta a los rivales si yo no la tengo,
 *  - los 5 abren una fila nueva: casi siempre conviene, sobre todo si tengo vecinas.
 * Ajustado con scripts/simulate.ts; en Cinquillo pesa mucho la suerte del reparto,
 * así que la ventaja realista es de pocos puntos porcentuales.
 */
function cinquilloScore(card: Card, hand: Card[], board: Card[]): number {
  const idx = rankIndex(card);
  if (card.rank === 5) {
    const up = chainLength(hand, card.suit, idx + 1, 1);
    const down = chainLength(hand, card.suit, idx - 1, -1);
    return 4 + (up + down) * 1.5;
  }
  const row = board.filter((c) => c.suit === card.suit).map(rankIndex);
  const goingDown = idx === Math.min(...row) - 1;
  const step: 1 | -1 = goingDown ? -1 : 1;
  const nextIdx = idx + step;
  const atEnd = nextIdx < 0 || nextIdx >= AMERICAN_RANKS.length;
  const chain = atEnd ? 0 : chainLength(hand, card.suit, nextIdx, step);
  const opensForRivals = !atEnd && chain === 0 ? 1 : 0;
  return chain * 2.5 - opensForRivals * 1.0;
}

export function cinquilloBotMove(state: CinquilloState): MoveResult<CinquilloState> {
  const seat = state.turn;
  const hand = state.hands[seat];
  const playable = hand.filter((c) => isPlayable(c, state.board));
  if (playable.length === 0) return applyCinquilloMove(state, seat, { type: 'pass' });
  const card = playable.reduce((a, b) =>
    cinquilloScore(b, hand, state.board) > cinquilloScore(a, hand, state.board) ? b : a,
  );
  return applyCinquilloMove(state, seat, { type: 'play', cardId: card.id });
}

function subsetsUpTo<T>(items: T[], maxSize: number): T[][] {
  const out: T[][] = [];
  const walk = (start: number, chosen: T[]) => {
    if (chosen.length > 0) out.push(chosen);
    if (chosen.length === maxSize) return;
    for (let i = start; i < items.length; i++) walk(i + 1, [...chosen, items[i]]);
  };
  walk(0, []);
  return out;
}

interface Placement {
  handIds: string[];
  meldId?: string;
}

function findPlacement(extra: Card[], hand: Card[], melds: Meld[]): Placement | null {
  const subsets = subsetsUpTo(hand, 4);
  for (const meld of melds) {
    const picked = subsets.find((cards) => cards.length <= 3 && isValidMeld([...meld.cards, ...extra, ...cards]));
    if (picked) return { handIds: picked.map((c) => c.id), meldId: meld.id };
  }
  const fresh = subsets.find((cards) => isValidMeld([...extra, ...cards]));
  return fresh ? { handIds: fresh.map((c) => c.id) } : null;
}

export function burakoBotMove(state: BurakoState): MoveResult<BurakoState> {
  const seat = state.turn;
  const melds = state.melds[teamOf(seat)];
  const hand = state.hands[seat];

  if (!state.drawn) {
    const top = state.pile[state.pile.length - 1];
    const placement = top ? findPlacement([top], hand, melds) : null;
    if (placement) {
      return applyBurakoMove(state, seat, { type: 'takePile', ...placement });
    }
    return applyBurakoMove(state, seat, { type: 'draw' });
  }

  const placement = findPlacement([], hand, melds);
  if (placement) return applyBurakoMove(state, seat, { type: 'meld', ...placement });

  return applyBurakoMove(state, seat, { type: 'discard', cardId: pickBurakoDiscard(state, seat).id });
}

/**
 * Descarta la carta menos útil: sin vecinas en mi mano, que no encaje en mis juegos y que no le
 * sirva a los rivales (quien levanta el pozo se lleva todo). Los comodines no se tiran.
 * A igualdad, se suelta la de más puntos para reducir lo que quedaría sin bajar.
 */
function pickBurakoDiscard(state: BurakoState, seat: number): Card {
  const hand = state.hands[seat];
  const team = teamOf(seat);
  const mine = state.melds[team];
  const rivals = state.melds[1 - team];
  const keepScore = (card: Card): number => {
    if (isWild(card)) return 1000;
    let synergy = 0;
    for (const other of hand) {
      if (other.id === card.id || isWild(other)) continue;
      if (other.rank === card.rank) synergy += 2;
      else if (other.suit === card.suit) {
        const gap = Math.abs(other.rank - card.rank);
        if (gap === 1) synergy += 1.5;
        else if (gap === 2) synergy += 1;
      }
    }
    const extendsMine = mine.some((m) => isValidMeld([...m.cards, card]));
    const extendsRival = rivals.some((m) => isValidMeld([...m.cards, card]));
    return synergy * 3 + (extendsMine ? 10 : 0) + (extendsRival ? 8 : 0) - cardPoints(card) * 0.05;
  };
  return hand.reduce((best, card) => (keepScore(card) < keepScore(best) ? card : best));
}
