import { type Card, americanDoubleDeck, shuffle } from './cards';
import { type MoveResult, type Player, type ScoreLine, teamOf } from './shared';

export const BURAKO_TARGET = 3000;
const HAND_SIZE = 11;
export const CANASTA_SIZE = 7;
const CLEAN_CANASTA_BONUS = 200;
const DIRTY_CANASTA_BONUS = 100;
const CLOSE_BONUS = 100;

export interface Meld {
  id: string;
  cards: Card[];
}

export interface BurakoSummary {
  lines: [ScoreLine[], ScoreLine[]];
  totals: [number, number];
  closedByTeam: number | null;
}

export interface BurakoState {
  game: 'burako';
  phase: 'playing' | 'roundEnd' | 'gameOver';
  players: Player[];
  deck: Card[];
  pile: Card[];
  hands: Card[][];
  melds: [Meld[], Meld[]];
  muertos: [Card[] | null, Card[] | null];
  turn: number;
  drawn: boolean;
  scores: [number, number];
  roundNo: number;
  summary: BurakoSummary | null;
  winnerTeam: number | null;
}

export type BurakoMove =
  | { type: 'draw' }
  | { type: 'takePile'; handIds: string[]; meldId?: string }
  | { type: 'meld'; handIds: string[]; meldId?: string }
  | { type: 'discard'; cardId: string }
  | { type: 'nextRound' };

type Placement = { melds: Meld[] } | { error: string };

export function isWild(card: Card): boolean {
  return card.suit === 'comodin' || card.rank === 2;
}

function isClean(meld: Meld): boolean {
  return meld.cards.every((c) => !isWild(c));
}

export function cardPoints(card: Card): number {
  if (card.suit === 'comodin') return 50;
  if (card.rank === 2) return 20;
  if (card.rank === 1) return 15;
  if (card.rank >= 8) return 10;
  return 5;
}

function isGroup(naturals: Card[], wilds: number): boolean {
  return naturals.every((c) => c.rank === naturals[0].rank) && wilds <= naturals.length;
}

function isRun(naturals: Card[], wilds: number): boolean {
  const suit = naturals[0].suit;
  if (naturals.some((c) => c.suit !== suit)) return false;
  const ranks = naturals.map((c) => c.rank).sort((a, b) => a - b);
  if (new Set(ranks).size !== ranks.length) return false;
  const span = ranks[ranks.length - 1] - ranks[0] + 1;
  return span - ranks.length <= wilds;
}

export function isValidMeld(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter((c) => !isWild(c));
  const wilds = cards.length - naturals.length;
  if (naturals.length < 2) return false;
  return isGroup(naturals, wilds) || isRun(naturals, wilds);
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pickCards(hand: Card[], ids: string[]): Card[] | null {
  const picked: Card[] = [];
  for (const id of ids) {
    const card = hand.find((c) => c.id === id);
    if (!card || picked.includes(card)) return null;
    picked.push(card);
  }
  return picked;
}

function placeCards(melds: Meld[], meldId: string | undefined, cards: Card[]): Placement {
  if (meldId === undefined) {
    if (!isValidMeld(cards)) return { error: 'Esas cartas no forman un juego válido.' };
    return { melds: [...melds, { id: newId(), cards }] };
  }
  const existing = melds.find((m) => m.id === meldId);
  if (!existing) return { error: 'Ese juego ya no está en la mesa.' };
  const combined = [...existing.cards, ...cards];
  if (!isValidMeld(combined)) return { error: 'Esas cartas no encajan en ese juego.' };
  return { melds: melds.map((m) => (m.id === meldId ? { ...m, cards: combined } : m)) };
}

function withHand(hands: Card[][], seat: number, hand: Card[]): Card[][] {
  return hands.map((h, i) => (i === seat ? hand : h));
}

function withTeamMelds(state: BurakoState, team: number, melds: Meld[]): [Meld[], Meld[]] {
  return team === 0 ? [melds, state.melds[1]] : [state.melds[0], melds];
}

function dealRound(state: BurakoState): BurakoState {
  const n = state.players.length;
  const deck = shuffle(americanDoubleDeck());
  const hands = Array.from({ length: n }, () => deck.splice(0, HAND_SIZE));
  const muertos: [Card[], Card[]] = [deck.splice(0, HAND_SIZE), deck.splice(0, HAND_SIZE)];
  return {
    ...state,
    phase: 'playing',
    deck,
    pile: deck.splice(0, 1),
    hands,
    melds: [[], []],
    muertos,
    turn: state.roundNo % n,
    drawn: false,
    roundNo: state.roundNo + 1,
    summary: null,
    winnerTeam: null,
  };
}

export function createBurakoGame(players: Player[]): BurakoState {
  return dealRound({
    game: 'burako',
    phase: 'roundEnd',
    players,
    deck: [],
    pile: [],
    hands: [],
    melds: [[], []],
    muertos: [null, null],
    turn: 0,
    drawn: false,
    scores: [0, 0],
    roundNo: 0,
    summary: null,
    winnerTeam: null,
  });
}

function scoreRound(state: BurakoState, closedByTeam: number | null): BurakoSummary {
  const lines = ([0, 1] as const).map((team): ScoreLine[] => {
    const melds = state.melds[team];
    const meldPoints = melds.reduce(
      (sum, m) => sum + m.cards.reduce((p, c) => p + cardPoints(c), 0),
      0,
    );
    const canastas = melds.filter((m) => m.cards.length >= CANASTA_SIZE);
    const clean = canastas.filter(isClean).length;
    const dirty = canastas.length - clean;
    const unplayed = [
      ...state.hands.flatMap((hand, seat) => (teamOf(seat) === team ? hand : [])),
      ...(state.muertos[team] ?? []),
    ];
    const unplayedPoints = unplayed.reduce((sum, c) => sum + cardPoints(c), 0);

    const result: ScoreLine[] = [{ label: 'Juegos bajados', points: meldPoints }];
    if (clean > 0) {
      result.push({ label: `Canastas limpias (${clean})`, points: clean * CLEAN_CANASTA_BONUS });
    }
    if (dirty > 0) {
      result.push({ label: `Canastas sucias (${dirty})`, points: dirty * DIRTY_CANASTA_BONUS });
    }
    if (closedByTeam === team) result.push({ label: 'Cierre', points: CLOSE_BONUS });
    if (unplayedPoints > 0) {
      result.push({ label: 'Cartas sin bajar', points: -unplayedPoints });
    }
    return result;
  }) as [ScoreLine[], ScoreLine[]];

  const totals: [number, number] = [
    lines[0].reduce((sum, line) => sum + line.points, 0),
    lines[1].reduce((sum, line) => sum + line.points, 0),
  ];
  return { lines, totals, closedByTeam };
}

function finishRound(state: BurakoState, closedBySeat: number | null): BurakoState {
  const closedByTeam = closedBySeat === null ? null : teamOf(closedBySeat);
  const summary = scoreRound(state, closedByTeam);
  const scores: [number, number] = [
    state.scores[0] + summary.totals[0],
    state.scores[1] + summary.totals[1],
  ];
  const leader = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : null;
  const gameOver = leader !== null && scores[leader] >= BURAKO_TARGET;
  return {
    ...state,
    phase: gameOver ? 'gameOver' : 'roundEnd',
    drawn: false,
    scores,
    summary,
    winnerTeam: gameOver ? leader : null,
  };
}

function hasClosingCanastas(melds: Meld[]): boolean {
  const canastas = melds.filter((m) => m.cards.length >= CANASTA_SIZE);
  const clean = canastas.filter(isClean).length;
  return clean >= 1 && canastas.length - clean >= 1;
}

function settle(state: BurakoState, seat: number, endTurn: boolean): BurakoState {
  const team = teamOf(seat);
  let next = state;
  if (next.hands[seat].length === 0) {
    const muerto = next.muertos[team];
    if (!muerto) {
      return finishRound(next, hasClosingCanastas(next.melds[team]) ? seat : null);
    }
    next = {
      ...next,
      hands: withHand(next.hands, seat, muerto),
      muertos: team === 0 ? [null, next.muertos[1]] : [next.muertos[0], null],
    };
  }
  if (!endTurn) return next;
  return { ...next, turn: (seat + 1) % next.players.length, drawn: false };
}

export function applyBurakoMove(
  state: BurakoState,
  seat: number,
  move: BurakoMove,
): MoveResult<BurakoState> {
  if (move.type === 'nextRound') {
    if (state.phase !== 'roundEnd') return { error: 'La ronda todavía no ha terminado.' };
    return { state: dealRound(state) };
  }
  if (state.phase !== 'playing') return { error: 'La partida no está en curso.' };
  if (seat !== state.turn) return { error: 'No es tu turno.' };

  const team = teamOf(seat);
  const hand = state.hands[seat];

  if (move.type === 'draw') {
    if (state.drawn) return { error: 'Ya robaste en este turno.' };
    if (state.deck.length === 0) return { state: finishRound(state, null) };
    return {
      state: {
        ...state,
        deck: state.deck.slice(1),
        hands: withHand(state.hands, seat, [...hand, state.deck[0]]),
        drawn: true,
      },
    };
  }

  if (move.type === 'takePile') {
    if (state.drawn) return { error: 'Ya robaste en este turno.' };
    if (state.pile.length === 0) return { error: 'El pozo está vacío.' };
    const picked = pickCards(hand, move.handIds);
    if (!picked) return { error: 'Alguna carta elegida no está en tu mano.' };
    const top = state.pile[state.pile.length - 1];
    const placed = placeCards(state.melds[team], move.meldId, [top, ...picked]);
    if ('error' in placed) return { error: placed.error };
    const remaining = hand.filter((c) => !picked.includes(c));
    return {
      state: settle(
        {
          ...state,
          melds: withTeamMelds(state, team, placed.melds),
          hands: withHand(state.hands, seat, [...remaining, ...state.pile.slice(0, -1)]),
          pile: [],
          drawn: true,
        },
        seat,
        false,
      ),
    };
  }

  if (move.type === 'meld') {
    if (!state.drawn) return { error: 'Primero debes robar o levantar el pozo.' };
    const picked = pickCards(hand, move.handIds);
    if (!picked || picked.length === 0) return { error: 'Elige cartas válidas de tu mano.' };
    const placed = placeCards(state.melds[team], move.meldId, picked);
    if ('error' in placed) return { error: placed.error };
    const remaining = hand.filter((c) => !picked.includes(c));
    return {
      state: settle(
        {
          ...state,
          melds: withTeamMelds(state, team, placed.melds),
          hands: withHand(state.hands, seat, remaining),
        },
        seat,
        false,
      ),
    };
  }

  if (!state.drawn) return { error: 'Primero debes robar o levantar el pozo.' };
  const card = hand.find((c) => c.id === move.cardId);
  if (!card) return { error: 'Esa carta no está en tu mano.' };
  return {
    state: settle(
      {
        ...state,
        hands: withHand(state.hands, seat, hand.filter((c) => c !== card)),
        pile: [...state.pile, card],
      },
      seat,
      true,
    ),
  };
}
