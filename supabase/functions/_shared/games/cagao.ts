import { americanDeck, type Card, randomInt, shuffle } from './cards.ts';
import type { MoveResult, Player } from './shared.ts';

/**
 * El Cagao (el Old Maid dominicano). Baraja de 49 cartas: la inglesa sin tres de los cuatro Ases.
 * El A♠ no tiene pareja y es "El Cagao". Todas las cartas se reparten, cada jugador baja sus pares
 * con una fase inicial en la que cada uno baja sus pares (los humanos a mano, los bots solos) y
 * después, por turnos, cada uno le roba una carta a ciegas al jugador siguiente. Se salva quien
 * se queda sin cartas; pierde el último que queda, que siempre es quien tiene el A♠.
 *
 * El motor es puro: cada jugada devuelve un estado nuevo y nunca modifica el anterior.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** La carta sin pareja. */
export const CAGAO_CARD_ID = 'picas-1';

export interface CagaoPair {
  /** Quién bajó el par. */
  seat: number;
  cards: [Card, Card];
}

/** Lo que pasó en la última jugada. Es público, salvo `drawnCardId` (ver `projectState`). */
export interface CagaoEvent {
  /** Número de jugada (para animar y no repetir avisos). */
  seq: number;
  /** Quién robó. */
  by: number;
  /** A quién le robó. */
  from: number;
  /** Posición de la carta dentro de la mano oculta del rival. */
  index: number;
  /** El par que se bajó, si la carta robada hizo pareja. */
  pair: [Card, Card] | null;
  /** True si la carta robada fue El Cagao (A♠). */
  cagao: boolean;
  /** Id de la carta robada. Solo la ve quien la robó, salvo que sea El Cagao o haya formado un par. */
  drawnCardId: string | null;
  /** Quiénes se quedaron sin cartas con esta jugada (se salvan). */
  outSeats: number[];
}

export interface CagaoState {
  game: 'cagao';
  /** 'pairing': todos bajan sus pares iniciales (sin turnos). 'playing': se roba por turnos. */
  phase: 'pairing' | 'playing' | 'gameOver';
  players: Player[];
  hands: Card[][];
  /** Todos los pares bajados, en orden. */
  pairs: CagaoPair[];
  /** Quien roba ahora. */
  turn: number;
  dealer: number;
  roundNo: number;
  /** Asientos que ya se salvaron, en el orden en que salieron. */
  finishOrder: number[];
  /** Quien se quedó con El Cagao (cuando la partida termina). */
  loserSeat: number | null;
  lastEvent: CagaoEvent | null;
}

export type CagaoMove =
  | { type: 'draw'; index: number }
  /** Baja un par concreto de tu mano (solo en la fase inicial). */
  | { type: 'pair'; cardIds: [string, string] }
  /** Baja todos los pares de tu mano de una vez (solo en la fase inicial). */
  | { type: 'pairAll' };

/** La baraja de El Cagao: 49 cartas, solo queda el A♠ de los Ases. */
export function cagaoDeck(): Card[] {
  return americanDeck().filter((card) => card.rank !== 1 || card.id === CAGAO_CARD_ID);
}

/** Primer asiento con cartas después de `from` (sin contar `from`), o -1 si no queda ninguno. */
export function nextActiveSeat(hands: Card[][], from: number): number {
  const seats = hands.length;
  for (let i = 1; i <= seats; i++) {
    const seat = (from + i) % seats;
    if (hands[seat].length > 0) return seat;
  }
  return -1;
}

/** A quién le roba el jugador que tiene el turno: el siguiente jugador que todavía tiene cartas. */
export function drawFromSeat(state: CagaoState): number {
  return nextActiveSeat(state.hands, state.turn);
}

export function activeSeats(hands: Card[][]): number[] {
  return hands.flatMap((hand, seat) => (hand.length > 0 ? [seat] : []));
}

/** Separa los pares de una mano. De tres cartas iguales se baja un par y queda una. */
export function takePairs(hand: Card[]): { hand: Card[]; pairs: [Card, Card][] } {
  const byRank = new Map<number, Card[]>();
  for (const card of hand) byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), card]);
  const pairs: [Card, Card][] = [];
  const leftover = new Set<string>();
  for (const cards of byRank.values()) {
    for (let i = 0; i + 1 < cards.length; i += 2) pairs.push([cards[i], cards[i + 1]]);
    if (cards.length % 2 === 1) leftover.add(cards[cards.length - 1].id);
  }
  return { hand: hand.filter((card) => leftover.has(card.id)), pairs };
}

/** Quien va a ser robado baraja su mano: así nadie deduce dónde quedó la carta que acaba de tomar. */
function shuffleNextVictim(state: CagaoState): CagaoState {
  if (state.phase !== 'playing') return state;
  const victim = drawFromSeat(state);
  if (victim < 0) return state;
  return { ...state, hands: state.hands.map((hand, seat) => (seat === victim ? shuffle(hand) : hand)) };
}

export function createCagaoGame(players: Player[], dealer?: number): CagaoState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error('El Cagao se juega de 2 a 6 jugadores.');
  }
  const seats = players.length;
  const dealerSeat = dealer ?? randomInt(seats);

  // Se reparte todo el mazo, una carta a la vez: unos jugadores quedan con una carta más.
  const hands: Card[][] = Array.from({ length: seats }, () => []);
  shuffle(cagaoDeck()).forEach((card, i) => hands[i % seats].push(card));

  // Fase 1: cada uno baja los pares de su mano inicial (a mano o con el botón; los bots, solos).
  return settlePairing({
    game: 'cagao',
    phase: 'pairing',
    players,
    hands,
    pairs: [],
    // Empieza el jugador que sigue al que reparte (entre los que todavía tengan cartas).
    turn: (dealerSeat + 1) % seats,
    dealer: dealerSeat,
    roundNo: 1,
    finishOrder: [],
    loserSeat: null,
    lastEvent: null,
  });
}

/** True si la mano tiene al menos dos cartas del mismo número. */
export function hasPair(hand: Card[]): boolean {
  return takePairs(hand).pairs.length > 0;
}

/** Asientos que todavía tienen pares por bajar (solo tiene sentido en la fase inicial). */
export function seatsWithPairs(state: CagaoState): number[] {
  return state.hands.flatMap((hand, seat) => (hasPair(hand) ? [seat] : []));
}

/**
 * Cuando nadie tiene pares por bajar, la fase inicial termina: se anota quién ya quedó sin cartas
 * y empieza el robo por turnos. Si no hay pares pendientes en todo el reparto, sigue de largo.
 */
function settlePairing(state: CagaoState): CagaoState {
  if (state.phase !== 'pairing' || seatsWithPairs(state).length > 0) return state;
  const out = state.hands.flatMap((hand, seat) => (hand.length === 0 ? [seat] : []));
  const active = activeSeats(state.hands);
  const next: CagaoState = {
    ...state,
    phase: active.length <= 1 ? 'gameOver' : 'playing',
    finishOrder: out,
    loserSeat: active.length === 1 ? active[0] : null,
    turn: nextActiveSeat(state.hands, state.dealer),
  };
  return shuffleNextVictim(next);
}

function dropPairs(state: CagaoState, seat: number, bundles: [Card, Card][]): CagaoState {
  const used = new Set(bundles.flatMap((cards) => cards.map((card) => card.id)));
  return settlePairing({
    ...state,
    hands: state.hands.map((hand, s) => (s === seat ? hand.filter((card) => !used.has(card.id)) : hand)),
    pairs: [...state.pairs, ...bundles.map((cards) => ({ seat, cards }))],
  });
}

export function applyCagaoMove(state: CagaoState, seat: number, move: CagaoMove): MoveResult<CagaoState> {
  if (state.phase === 'gameOver') return { error: 'La partida ya terminó.' };

  if (move.type === 'pair' || move.type === 'pairAll') {
    if (state.phase !== 'pairing') return { error: 'Ya no se bajan pares a mano: al robar, los pares se bajan solos.' };
    const hand = state.hands[seat];
    if (!hand) return { error: 'Jugador desconocido.' };
    if (move.type === 'pairAll') {
      const { pairs } = takePairs(hand);
      if (pairs.length === 0) return { error: 'No tienes pares que bajar.' };
      return { state: dropPairs(state, seat, pairs) };
    }
    const [idA, idB] = move.cardIds;
    const a = hand.find((card) => card.id === idA);
    const b = hand.find((card) => card.id === idB);
    if (idA === idB || !a || !b) return { error: 'Esas cartas no están en tu mano.' };
    if (a.rank !== b.rank) return { error: 'Un par son dos cartas del mismo número.' };
    return { state: dropPairs(state, seat, [[a, b]]) };
  }

  if (state.phase !== 'playing') return { error: 'Primero todos tienen que bajar sus pares.' };
  if (seat !== state.turn) return { error: 'No es tu turno.' };

  const victim = drawFromSeat(state);
  if (victim < 0 || victim === seat) return { error: 'No hay a quién robarle.' };
  const victimHand = state.hands[victim];
  if (!Number.isInteger(move.index) || move.index < 0 || move.index >= victimHand.length) {
    return { error: 'Esa carta no existe.' };
  }

  const drawn = victimHand[move.index];
  const nextVictimHand = victimHand.filter((_, i) => i !== move.index);
  const myHand = state.hands[seat];
  const matchIndex = myHand.findIndex((card) => card.rank === drawn.rank);

  let nextMyHand: Card[];
  let pair: [Card, Card] | null = null;
  if (matchIndex >= 0) {
    // La carta robada hace pareja con una de las mías: se bajan las dos.
    pair = [myHand[matchIndex], drawn];
    nextMyHand = myHand.filter((_, i) => i !== matchIndex);
  } else {
    nextMyHand = [...myHand, drawn];
  }

  const hands = state.hands.map((hand, s) => (s === seat ? nextMyHand : s === victim ? nextVictimHand : hand));
  const outSeats = [seat, victim].filter((s) => hands[s].length === 0);
  const finishOrder = [...state.finishOrder, ...outSeats];
  const cagao = drawn.id === CAGAO_CARD_ID;
  const event: CagaoEvent = {
    seq: (state.lastEvent?.seq ?? 0) + 1,
    by: seat,
    from: victim,
    index: move.index,
    pair,
    cagao,
    drawnCardId: drawn.id,
    outSeats,
  };

  const active = activeSeats(hands);
  const next: CagaoState = {
    ...state,
    hands,
    pairs: pair ? [...state.pairs, { seat, cards: pair }] : state.pairs,
    finishOrder,
    lastEvent: event,
  };

  // Cuando solo queda un jugador con cartas, esa persona tiene El Cagao y pierde.
  if (active.length <= 1) {
    return { state: { ...next, phase: 'gameOver', loserSeat: active[0] ?? null } };
  }
  return { state: shuffleNextVictim({ ...next, turn: nextActiveSeat(hands, seat) }) };
}

/** Jugada del bot: una carta cualquiera de la mano oculta del rival. */
export function chooseCagaoMove(state: CagaoState): CagaoMove {
  const victim = drawFromSeat(state);
  return { type: 'draw', index: randomInt(Math.max(state.hands[victim]?.length ?? 1, 1)) };
}
