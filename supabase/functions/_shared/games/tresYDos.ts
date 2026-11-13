import { americanDeck, type Card, randomInt, shuffle } from './cards.ts';
import type { MoveResult, Player } from './shared.ts';

/**
 * 3 y 2 (Tres y Dos), el juego dominicano de cartas: cada jugador tiene 5 cartas y en su turno
 * roba una (del Monte o del Pozo) y bota otra al Pozo. Gana la ronda quien se queda con una tercia
 * y un par (K-K-K-8-8), "cantando" el 3 y 2 al botar la carta sobrante.
 *
 * El motor es puro: cada jugada devuelve un estado nuevo y nunca modifica el anterior.
 */

export const HAND_SIZE = 5;
/** Rondas que hay que ganar para llevarse la partida. */
export const TARGET_WINS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

export interface TresYDosState {
  game: 'tresydos';
  /** 'roundEnd': alguien cantó 3 y 2 y la partida sigue. 'gameOver': alguien llegó a TARGET_WINS. */
  phase: 'playing' | 'roundEnd' | 'gameOver';
  players: Player[];
  hands: Card[][];
  /** El Monte, boca abajo. La carta de arriba es deck[0]. */
  deck: Card[];
  /** El Pozo, boca arriba. La carta de arriba es la última del arreglo. */
  discardPile: Card[];
  turn: number;
  turnStep: 'draw' | 'discard';
  drawnFrom: 'deck' | 'discard' | null;
  drawnCardId: string | null;
  dealer: number;
  roundNo: number;
  /** Rondas ganadas por asiento. */
  wins: number[];
  /** Quien cantó el 3 y 2 en la última ronda (y, en 'gameOver', ganó la partida). */
  winnerSeat: number | null;
}

export type TresYDosMove =
  | { type: 'drawDeck' }
  | { type: 'drawDiscard' }
  | { type: 'discard'; cardId: string }
  | { type: 'nextRound' };

/** Quien reparte la siguiente ronda (y por tanto quien la inicia). */
export function nextDealerSeat(state: TresYDosState): number {
  return (state.dealer + 1) % state.players.length;
}

/** Cuántas cartas de cada número hay en la mano, de mayor a menor: K-K-K-8-8 da [3, 2]. */
export function rankCounts(hand: Card[]): number[] {
  const counts = new Map<number, number>();
  for (const card of hand) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  return [...counts.values()].sort((a, b) => b - a);
}

/** Una mano de 5 cartas gana solo si es exactamente una tercia y un par (4 iguales + 1 no gana). */
export function isFullHouse(hand: Card[]): boolean {
  if (hand.length !== HAND_SIZE) return false;
  const counts = rankCounts(hand);
  return counts.length === 2 && counts[0] === 3 && counts[1] === 2;
}

/**
 * Con 6 cartas en la mano, qué cartas puede botar el jugador para quedarse con un 3 y 2.
 * `forbiddenId` es la carta que no puede botar (la que tomó del Pozo en este turno).
 */
export function winningDiscardIds(hand: Card[], forbiddenId: string | null = null): string[] {
  if (hand.length !== HAND_SIZE + 1) return [];
  return hand
    .filter((card) => card.id !== forbiddenId && isFullHouse(hand.filter((other) => other.id !== card.id)))
    .map((card) => card.id);
}

function dealRound(base: {
  players: Player[];
  dealer: number;
  roundNo: number;
  wins: number[];
}): TresYDosState {
  const seats = base.players.length;
  const cards = shuffle(americanDeck());
  const hands = Array.from({ length: seats }, (_, seat) => cards.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE));
  const rest = cards.slice(seats * HAND_SIZE);
  return {
    game: 'tresydos',
    phase: 'playing',
    players: base.players,
    hands,
    deck: rest.slice(1),
    discardPile: [rest[0]],
    // Empieza el jugador que sigue al repartidor.
    turn: (base.dealer + 1) % seats,
    turnStep: 'draw',
    drawnFrom: null,
    drawnCardId: null,
    dealer: base.dealer,
    roundNo: base.roundNo,
    wins: base.wins,
    winnerSeat: null,
  };
}

export function createTresYDosGame(players: Player[], dealer?: number): TresYDosState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('El 3 y 2 se juega de 2 a 4 jugadores.');
  }
  return dealRound({
    players,
    dealer: dealer ?? randomInt(players.length),
    roundNo: 1,
    wins: players.map(() => 0),
  });
}

/**
 * Si el Monte se acabó, el Pozo (menos su carta de arriba) se baraja y pasa a ser el nuevo Monte.
 * Si no hay nada que reciclar, el estado queda igual.
 */
function recycleDeck(state: TresYDosState): TresYDosState {
  if (state.deck.length > 0 || state.discardPile.length <= 1) return state;
  const top = state.discardPile[state.discardPile.length - 1];
  return { ...state, deck: shuffle(state.discardPile.slice(0, -1)), discardPile: [top] };
}

export function applyTresYDosMove(state: TresYDosState, seat: number, move: TresYDosMove): MoveResult<TresYDosState> {
  if (move.type === 'nextRound') {
    if (state.phase !== 'roundEnd') return { error: 'La ronda todavía no ha terminado.' };
    if (seat !== nextDealerSeat(state)) return { error: 'Solo el repartidor puede iniciar la siguiente ronda.' };
    return {
      state: dealRound({
        players: state.players,
        dealer: nextDealerSeat(state),
        roundNo: state.roundNo + 1,
        wins: state.wins,
      }),
    };
  }

  if (state.phase !== 'playing') return { error: 'La partida no está en curso.' };
  if (seat !== state.turn) return { error: 'No es tu turno.' };
  const hand = state.hands[seat];

  if (move.type === 'drawDeck' || move.type === 'drawDiscard') {
    if (state.turnStep !== 'draw') return { error: 'Ya robaste: ahora toca botar una carta.' };
    const source = move.type === 'drawDeck' ? recycleDeck(state) : state;
    let card: Card;
    let next: TresYDosState;
    if (move.type === 'drawDeck') {
      if (source.deck.length === 0) return { error: 'El Monte está vacío: roba del Pozo.' };
      card = source.deck[0];
      next = { ...source, deck: source.deck.slice(1), drawnFrom: 'deck' };
    } else {
      if (source.discardPile.length === 0) return { error: 'El Pozo está vacío: roba del Monte.' };
      card = source.discardPile[source.discardPile.length - 1];
      next = { ...source, discardPile: source.discardPile.slice(0, -1), drawnFrom: 'discard' };
    }
    return {
      state: {
        ...next,
        hands: next.hands.map((h, s) => (s === seat ? [...h, card] : h)),
        turnStep: 'discard',
        drawnCardId: card.id,
      },
    };
  }

  if (move.type === 'discard') {
    if (state.turnStep !== 'discard') return { error: 'Primero tienes que robar una carta.' };
    const card = hand.find((c) => c.id === move.cardId);
    if (!card) return { error: 'Esa carta no está en tu mano.' };
    if (state.drawnFrom === 'discard' && card.id === state.drawnCardId) {
      return { error: 'No puedes botar la carta que acabas de tomar del Pozo.' };
    }
    const remaining = hand.filter((c) => c.id !== card.id);
    const hands = state.hands.map((h, s) => (s === seat ? remaining : h));
    const discardPile = [...state.discardPile, card];

    if (isFullHouse(remaining)) {
      const wins = state.wins.map((w, s) => (s === seat ? w + 1 : w));
      return {
        state: {
          ...state,
          hands,
          discardPile,
          wins,
          winnerSeat: seat,
          phase: wins[seat] >= TARGET_WINS ? 'gameOver' : 'roundEnd',
          turnStep: 'draw',
          drawnFrom: null,
          drawnCardId: null,
        },
      };
    }

    return {
      state: recycleDeck({
        ...state,
        hands,
        discardPile,
        turn: (state.turn + 1) % state.players.length,
        turnStep: 'draw',
        drawnFrom: null,
        drawnCardId: null,
      }),
    };
  }

  return { error: 'Jugada no válida.' };
}

/* ------------------------------------------------------------------ */
/* Bot                                                                 */
/* ------------------------------------------------------------------ */

/** Cartas que el bot no ha visto: ni en su mano ni en el Pozo. Pueden estar en el Monte o en las manos rivales. */
function unseenCards(hand: Card[], discardPile: Card[]): Card[] {
  const known = new Set([...hand, ...discardPile].map((c) => c.id));
  return americanDeck().filter((c) => !known.has(c.id));
}

/** Las cartas del mismo número valen igual para el 3 y 2: se evalúa una de cada número y se cuenta cuántas hay. */
interface RankGroup {
  card: Card;
  count: number;
}

function groupByRank(cards: Card[]): RankGroup[] {
  const groups = new Map<number, RankGroup>();
  for (const card of cards) {
    const group = groups.get(card.rank);
    if (group) group.count += 1;
    else groups.set(card.rank, { card, count: 1 });
  }
  return [...groups.values()];
}

/** Cuántas cartas desconocidas le darían un 3 y 2 en su próximo turno si se queda con estas 5. */
function outs(hand5: Card[], unseen: RankGroup[]): number {
  let count = 0;
  for (const { card, count: copies } of unseen) {
    if (winningDiscardIds([...hand5, card]).length > 0) count += copies;
  }
  return count;
}

const WIN_VALUE = 1000;

/** Valor de tener 6 cartas: ganar al instante, o las mejores 5 según cuántas cartas la completan después. */
function bestAfterDiscard(hand6: Card[], unseen: RankGroup[], forbiddenId: string | null): number {
  if (winningDiscardIds(hand6, forbiddenId).length > 0) return WIN_VALUE;
  let best = -1;
  for (const card of hand6) {
    if (card.id === forbiddenId) continue;
    best = Math.max(best, outs(hand6.filter((c) => c.id !== card.id), unseen));
  }
  return best;
}

function sameRankCount(hand: Card[], card: Card): number {
  return hand.filter((c) => c.rank === card.rank).length;
}

function chooseDiscardId(state: TresYDosState): string {
  const hand = state.hands[state.turn];
  const forbiddenId = state.drawnFrom === 'discard' ? state.drawnCardId : null;
  const winning = winningDiscardIds(hand, forbiddenId);
  if (winning.length > 0) return winning[0];

  const unseen = groupByRank(unseenCards(hand, state.discardPile));
  const candidates = hand.filter((c) => c.id !== forbiddenId);
  let best = candidates[0];
  let bestOuts = -1;
  let bestShare = Infinity;
  for (const card of candidates) {
    const remaining = hand.filter((c) => c.id !== card.id);
    const value = outs(remaining, unseen);
    // A igualdad de posibilidades, se bota la carta más aislada (la que menos se repite en la mano).
    const share = sameRankCount(hand, card);
    if (value > bestOuts || (value === bestOuts && share < bestShare)) {
      best = card;
      bestOuts = value;
      bestShare = share;
    }
  }
  return best.id;
}

function shouldDrawFromDiscard(state: TresYDosState): boolean {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) return false;
  // Sin Monte que reciclar, el Pozo es la única opción.
  if (state.deck.length === 0 && state.discardPile.length <= 1) return true;

  const hand = state.hands[state.turn];
  if (winningDiscardIds([...hand, top], top.id).length > 0) return true;

  const unseenCardsList = unseenCards(hand, state.discardPile);
  if (unseenCardsList.length === 0) return true;
  const unseen = groupByRank(unseenCardsList);
  const fromDiscard = bestAfterDiscard([...hand, top], unseen, top.id);
  let total = 0;
  for (const { card, count } of unseen) total += count * bestAfterDiscard([...hand, card], unseen, null);
  return fromDiscard > total / unseenCardsList.length;
}

/**
 * Jugada del bot (solo mira su mano y el Pozo, nunca las cartas ocultas).
 * Roba del Pozo si esa carta completa o mejora su camino al 3 y 2; si no, del Monte.
 * Al botar, canta el 3 y 2 si puede; si no, se queda con la mano que más cartas la completan.
 */
export function chooseTresYDosMove(state: TresYDosState): TresYDosMove {
  if (state.turnStep === 'draw') {
    return shouldDrawFromDiscard(state) ? { type: 'drawDiscard' } : { type: 'drawDeck' };
  }
  return { type: 'discard', cardId: chooseDiscardId(state) };
}
