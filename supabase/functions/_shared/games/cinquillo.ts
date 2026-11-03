import { AMERICAN_RANKS, americanDeck, type Card, shuffle } from './cards.ts';
import type { MoveResult, Player } from './shared.ts';

export interface CinquilloState {
  game: 'cinquillo';
  phase: 'playing' | 'finished';
  players: Player[];
  hands: Card[][];
  board: Card[];
  turn: number;
  passes: number;
  winners: number[];
  endReason: 'vaciado' | 'tranque' | null;
}

export type CinquilloMove = { type: 'play'; cardId: string } | { type: 'pass' };

function rowRange(board: Card[], suit: Card['suit']): { min: number; max: number } | null {
  const indexes = board
    .filter((c) => c.suit === suit)
    .map((c) => AMERICAN_RANKS.indexOf(c.rank));
  if (indexes.length === 0) return null;
  return { min: Math.min(...indexes), max: Math.max(...indexes) };
}

export function isPlayable(card: Card, board: Card[]): boolean {
  const range = rowRange(board, card.suit);
  if (card.rank === 5) {
    const fiveOfDiamondsOnBoard = rowRange(board, 'diamantes') !== null;
    return range === null && (card.suit === 'diamantes' || fiveOfDiamondsOnBoard);
  }
  if (!range) return false;
  const index = AMERICAN_RANKS.indexOf(card.rank);
  return index === range.min - 1 || index === range.max + 1;
}

export function createCinquilloGame(players: Player[]): CinquilloState {
  const hands: Card[][] = Array.from({ length: players.length }, () => []);
  shuffle(americanDeck()).forEach((card, i) => hands[i % players.length].push(card));
  const starter = hands.findIndex((hand) =>
    hand.some((c) => c.suit === 'diamantes' && c.rank === 5),
  );
  return {
    game: 'cinquillo',
    phase: 'playing',
    players,
    hands,
    board: [],
    turn: starter,
    passes: 0,
    winners: [],
    endReason: null,
  };
}

function nextSeat(seat: number, total: number): number {
  return (seat + 1) % total;
}

export function applyCinquilloMove(
  state: CinquilloState,
  seat: number,
  move: CinquilloMove,
): MoveResult<CinquilloState> {
  if (state.phase !== 'playing') return { error: 'La partida ya terminó.' };
  if (seat !== state.turn) return { error: 'No es tu turno.' };
  const hand = state.hands[seat];
  const total = state.players.length;

  if (move.type === 'pass') {
    if (hand.some((c) => isPlayable(c, state.board))) {
      return { error: 'Tienes una carta que puedes colocar.' };
    }
    const passes = state.passes + 1;
    if (passes >= total) {
      const fewest = Math.min(...state.hands.map((h) => h.length));
      const winners = state.hands
        .map((h, i) => (h.length === fewest ? i : -1))
        .filter((i) => i >= 0);
      return { state: { ...state, passes, phase: 'finished', winners, endReason: 'tranque' } };
    }
    return { state: { ...state, passes, turn: nextSeat(seat, total) } };
  }

  const card = hand.find((c) => c.id === move.cardId);
  if (!card) return { error: 'Esa carta no está en tu mano.' };
  if (!isPlayable(card, state.board)) {
    return { error: 'Esa carta no encaja en la mesa todavía.' };
  }

  const remaining = hand.filter((c) => c.id !== card.id);
  const hands = state.hands.map((h, i) => (i === seat ? remaining : h));
  const board = [...state.board, card];
  if (remaining.length === 0) {
    return {
      state: { ...state, hands, board, passes: 0, phase: 'finished', winners: [seat], endReason: 'vaciado' },
    };
  }
  return { state: { ...state, hands, board, passes: 0, turn: nextSeat(seat, total) } };
}
