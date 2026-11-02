import { AMERICAN_RANKS, type Card } from './cards';
import { applyCasinoMove, type CasinoMove, type CasinoState, formationMoves, nextDealerSeat } from './casino';
import { captureOptions, type TableItem, tableItems } from './casinoCapture';
import { applyCinquilloMove, type CinquilloState, isPlayable } from './cinquillo';
import { applyBurakoMove, type BurakoState, cardPoints, isValidMeld, type Meld } from './burako';
import type { GameState } from './index';
import { isBotPlayer, type MoveResult, teamOf } from './shared';

const BOT_MOVE_MS = 1000;
const ROUND_PAUSE_MS = 6000;

export interface BotStep {
  result: MoveResult<GameState>;
  delayMs: number;
}

function isBotTurn(state: GameState): boolean {
  return state.phase === 'playing' && isBotPlayer(state.players[state.turn]);
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

function casinoValue(card: Card): number {
  if (card.suit === 'diamantes' && card.rank === 10) return 5;
  if (card.suit === 'picas' && card.rank === 2) return 4;
  if (card.rank === 1) return 2;
  if (card.suit === 'picas') return 1.5;
  return 1;
}

function captureScore(taken: TableItem[], tableSize: number): number {
  const cards = taken.flatMap((item) => item.cards);
  const value = cards.reduce((sum, c) => sum + casinoValue(c), 0);
  const clearsTable = taken.length === tableSize ? 3 : 0;
  return value + cards.length * 0.1 + clearsTable;
}

function casinoBotMove(state: CasinoState): MoveResult<CasinoState> {
  const seat = state.turn;
  const hand = state.hands[seat];
  const items = tableItems(state.table, state.builds);
  let best: { cardId: string; captureIds: string[]; score: number } | null = null;
  for (const card of hand) {
    for (const taken of captureOptions(card, items, seat)) {
      const score = captureScore(taken, items.length);
      if (!best || score > best.score) {
        best = { cardId: card.id, captureIds: taken.map((item) => item.id), score };
      }
    }
  }
  if (best) {
    return applyCasinoMove(state, seat, { type: 'play', cardId: best.cardId, captureIds: best.captureIds });
  }
  const formation = bestFormation(state);
  if (formation) return applyCasinoMove(state, seat, formation);
  const discard = [...hand].sort((a, b) => casinoValue(a) - casinoValue(b))[0];
  return applyCasinoMove(state, seat, { type: 'play', cardId: discard.id, captureIds: [] });
}

function formationScore(move: CasinoMove): number {
  if (move.type === 'build' || move.type === 'expand') return move.tableIds.length + 1;
  if (move.type === 'convert') return 1;
  return 0.5;
}

function bestFormation(state: CasinoState): CasinoMove | null {
  const moves = formationMoves(state, state.turn);
  if (moves.length === 0) return null;
  return moves.reduce((a, b) => (formationScore(b) > formationScore(a) ? b : a));
}

function cinquilloBotMove(state: CinquilloState): MoveResult<CinquilloState> {
  const seat = state.turn;
  const playable = state.hands[seat].filter((c) => isPlayable(c, state.board));
  if (playable.length === 0) return applyCinquilloMove(state, seat, { type: 'pass' });
  const fiveIndex = AMERICAN_RANKS.indexOf(5);
  const priority = (c: Card) =>
    c.rank === 5 ? Number.POSITIVE_INFINITY : Math.abs(AMERICAN_RANKS.indexOf(c.rank) - fiveIndex);
  const card = playable.reduce((a, b) => (priority(b) > priority(a) ? b : a));
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

function burakoBotMove(state: BurakoState): MoveResult<BurakoState> {
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

  const discard = [...hand].sort((a, b) => cardPoints(a) - cardPoints(b))[0];
  return applyBurakoMove(state, seat, { type: 'discard', cardId: discard.id });
}
