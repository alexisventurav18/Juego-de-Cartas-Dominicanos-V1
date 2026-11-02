import { americanDeck, type Card } from './cards';
import {
  applyCasinoMove,
  CARDS_MAJORITY_POINTS,
  type CasinoMove,
  type CasinoState,
  closingNeeds,
  formationMoves,
  SPADES_MAJORITY_POINTS,
} from './casino';
import { captureOptions, handCanCapture, tableItems } from './casinoCapture';
import { type MoveResult, teamOf } from './shared';

/**
 * Bot de Casino.
 *
 * Por cada jugada legal (llevarse cartas, formar/ampliar combinaciones o dejar una carta) calcula:
 *   ganancia inmediata  +  potencial de las combinaciones propias  −  castigo por dejar una combinación
 *   huérfana  −  pérdida esperada por lo que el rival podría llevarse en su turno.
 *
 * Solo usa información que un jugador humano tiene: su mano, la mesa y las cartas ya capturadas
 * (memoria perfecta). Nunca mira la mano de los demás; las cartas que no ha visto se estiman con
 * probabilidades.
 *
 * Es consciente de la regla de cierre obligatorio (17+ puntos): cuando un equipo está en cierre,
 * los ases, el 10 de diamantes, el 2 de picas "de dueño" y los viraos valen 0 para él y solo
 * pesan la mayoría de cartas y de picas, con más urgencia porque ganan la partida.
 */

const FORMATION_FACTOR = 0.6;
const STRANDED_FACTOR = 0.7;
const PARTNER_TURN_FACTOR = 0.55;
const CLOSING_URGENCY = 1.8;
const MAX_CAPTURE_CANDIDATES = 20;
const MAX_FORMATION_CANDIDATES = 8;
const GAME_WIN_SWING = 100;

interface Weights {
  card: number;
  spade: number;
  ace: number;
  ten: number;
  dueno: number;
  virao: number;
}

function capturedCards(state: CasinoState, team: number): Card[] {
  return state.captured[team].flatMap((group) => group.cards);
}

/** Cuánto vale, en puntos esperados, cada tipo de carta para un equipo en este momento. */
function weightsFor(state: CasinoState, team: number): Weights {
  const needs = closingNeeds(state.scores[team]);
  const urgency = needs ? CLOSING_URGENCY : 1;
  const mine = capturedCards(state, team);
  const theirs = capturedCards(state, 1 - team);
  const mineSpades = mine.filter((c) => c.suit === 'picas').length;
  const theirSpades = theirs.filter((c) => c.suit === 'picas').length;

  let card = 0;
  if (!needs || needs.cards) {
    const need = 27 - mine.length;
    const available = 52 - mine.length - theirs.length;
    if (need > 0 && theirs.length < 26 && available >= need) {
      card = (CARDS_MAJORITY_POINTS / Math.max(need, CARDS_MAJORITY_POINTS)) * urgency;
    }
  }

  let spade = 0;
  if (!needs || needs.spades) {
    const need = 7 - mineSpades;
    const available = 13 - mineSpades - theirSpades;
    if (need > 0 && theirSpades < 7 && available >= need) {
      spade = (SPADES_MAJORITY_POINTS / Math.max(need, 1)) * urgency;
    }
  }

  const normal = needs === null;
  return {
    card,
    spade,
    ace: normal ? 1 : 0,
    ten: normal ? 2 : 0,
    dueno: normal ? 1 : 0,
    virao: normal ? 1 : 0,
  };
}

function cardWorth(card: Card, w: Weights): number {
  let value = w.card;
  if (card.suit === 'picas') value += w.spade;
  if (card.rank === 1) value += w.ace;
  if (card.suit === 'diamantes' && card.rank === 10) value += w.ten;
  if (card.suit === 'picas' && card.rank === 2) value += w.dueno;
  return value;
}

function worthOf(cards: Card[], w: Weights): number {
  return cards.reduce((sum, c) => sum + cardWorth(c, w), 0);
}

interface Unseen {
  byRank: number[];
  total: number;
}

/** Cartas que el bot no ha visto: ni en su mano, ni en la mesa, ni capturadas. */
function unseenCards(state: CasinoState, seat: number): Unseen {
  const seen = new Set<string>();
  for (const c of state.hands[seat]) seen.add(c.id);
  for (const c of state.table) seen.add(c.id);
  for (const build of state.builds) for (const c of build.cards) seen.add(c.id);
  for (const team of [0, 1]) for (const c of capturedCards(state, team)) seen.add(c.id);
  const byRank = new Array<number>(14).fill(0);
  let total = 0;
  for (const c of americanDeck()) {
    if (seen.has(c.id)) continue;
    byRank[c.rank] += 1;
    total += 1;
  }
  return { byRank, total };
}

/** Probabilidad de que, en `handSize` cartas sacadas de las no vistas, haya al menos una del rango. */
function holdProbability(unseen: Unseen, rank: number, handSize: number): number {
  const copies = unseen.byRank[rank];
  if (copies === 0 || handSize === 0) return 0;
  let none = 1;
  for (let i = 0; i < handSize; i++) {
    const rest = unseen.total - copies - i;
    if (rest <= 0) return 1;
    none *= rest / (unseen.total - i);
  }
  return 1 - none;
}

interface Context {
  seat: number;
  team: number;
  mine: Weights;
  rival: Weights;
  unseen: Unseen;
}

/** Pérdida esperada: lo mejor que el rival podría llevarse de la mesa que dejamos. */
function expectedLoss(next: CasinoState, ctx: Context): number {
  if (next.phase !== 'playing') return 0;
  const items = tableItems(next.table, next.builds);
  if (items.length === 0) return 0;
  const rivalSeats = next.hands
    .map((hand, s) => ({ s, size: hand.length }))
    .filter(({ s }) => teamOf(s) !== ctx.team);
  const handSize = rivalSeats.reduce((sum, r) => sum + r.size, 0);
  const probeSeat = (rivalSeats.find((r) => r.size > 0) ?? rivalSeats[0])?.s;
  if (probeSeat === undefined || handSize === 0) return 0;

  const outcomes: { p: number; loss: number }[] = [];
  for (let rank = 1; rank <= 13; rank++) {
    const p = holdProbability(ctx.unseen, rank, handSize);
    if (p === 0) continue;
    const probe: Card = { id: '__probe', suit: 'treboles', rank };
    let best = 0;
    for (const taken of captureOptions(probe, items, probeSeat)) {
      let loss = worthOf(
        taken.flatMap((item) => item.cards),
        ctx.rival,
      );
      loss += cardWorth(probe, ctx.rival);
      if (taken.length === items.length) loss += ctx.rival.virao;
      if (loss > best) best = loss;
    }
    if (best > 0) outcomes.push({ p, loss: best });
  }
  outcomes.sort((a, b) => b.loss - a.loss);
  let remaining = 1;
  let expected = 0;
  for (const { p, loss } of outcomes) {
    expected += remaining * p * loss;
    remaining *= 1 - p;
  }
  return teamOf(next.turn) === ctx.team ? expected * PARTNER_TURN_FACTOR : expected;
}

function immediateGain(state: CasinoState, next: CasinoState, ctx: Context): number {
  const opp = 1 - ctx.team;
  const taken = next.captured[ctx.team].slice(state.captured[ctx.team].length);
  let gain = worthOf(
    taken.flatMap((group) => group.cards),
    ctx.mine,
  );
  const viraoGain = next.viraos[ctx.team] - state.viraos[ctx.team];
  if (viraoGain > 0) gain += viraoGain * ctx.mine.virao;
  const viraoStolen = state.viraos[opp] - next.viraos[opp];
  if (viraoStolen > 0) gain += viraoStolen * ctx.rival.virao;
  if (next.phase === 'gameOver') {
    if (next.winnerTeam === ctx.team) gain += GAME_WIN_SWING;
    else if (next.winnerTeam === opp) gain -= GAME_WIN_SWING;
  }
  return gain;
}

function buildStake(state: CasinoState, ctx: Context): number {
  return state.builds
    .filter((build) => build.owner === ctx.seat)
    .reduce((sum, build) => sum + worthOf(build.cards, ctx.mine), 0);
}

/** Combinaciones propias que se quedan sin carta en mano para llevárselas. */
function strandedPenalty(next: CasinoState, ctx: Context): number {
  if (next.phase !== 'playing') return 0;
  const hand = next.hands[ctx.seat];
  return next.builds
    .filter((build) => build.owner === ctx.seat && !handCanCapture(hand, build.value))
    .reduce((sum, build) => sum + STRANDED_FACTOR * worthOf(build.cards, ctx.mine), 0);
}

interface Candidate {
  move: CasinoMove;
  next: CasinoState;
  base: number;
  total: number;
}

export function casinoBotMove(state: CasinoState): MoveResult<CasinoState> {
  return chooseCasino(state).result;
}

/** Jugada que elegiría el bot (útil para pruebas y para sugerencias). */
export function chooseCasinoMove(state: CasinoState): CasinoMove | null {
  return chooseCasino(state).move;
}

function chooseCasino(state: CasinoState): { move: CasinoMove | null; result: MoveResult<CasinoState> } {
  const seat = state.turn;
  const team = teamOf(seat);
  const hand = state.hands[seat];
  const ctx: Context = {
    seat,
    team,
    mine: weightsFor(state, team),
    rival: weightsFor(state, 1 - team),
    unseen: unseenCards(state, seat),
  };
  const items = tableItems(state.table, state.builds);
  const stakeBefore = buildStake(state, ctx);

  const captures: Candidate[] = [];
  const drops: Candidate[] = [];
  const formations: Candidate[] = [];

  const consider = (move: CasinoMove, bucket: Candidate[], isFormation: boolean) => {
    const result = applyCasinoMove(state, seat, move);
    if ('error' in result) return;
    const next = result.state;
    let base = immediateGain(state, next, ctx) - strandedPenalty(next, ctx);
    if (isFormation) base += FORMATION_FACTOR * Math.max(0, buildStake(next, ctx) - stakeBefore);
    bucket.push({ move, next, base, total: base });
  };

  for (const card of hand) {
    for (const taken of captureOptions(card, items, seat)) {
      consider({ type: 'play', cardId: card.id, captureIds: taken.map((item) => item.id) }, captures, false);
    }
    consider({ type: 'play', cardId: card.id, captureIds: [] }, drops, false);
  }
  for (const move of formationMoves(state, seat)) consider(move, formations, true);

  const top = (list: Candidate[], limit: number) => [...list].sort((a, b) => b.base - a.base).slice(0, limit);
  const pool = [...top(captures, MAX_CAPTURE_CANDIDATES), ...drops, ...top(formations, MAX_FORMATION_CANDIDATES)];
  if (pool.length === 0) {
    const fallback = fallbackMove(state);
    return { move: fallback.move, result: fallback.result };
  }

  let best: Candidate | null = null;
  for (const candidate of pool) {
    candidate.total = candidate.base - expectedLoss(candidate.next, ctx);
    if (!best || candidate.total > best.total) best = candidate;
  }
  const chosen = best as Candidate;
  return { move: chosen.move, result: { state: chosen.next } };
}

function fallbackMove(state: CasinoState): { move: CasinoMove; result: MoveResult<CasinoState> } {
  const seat = state.turn;
  const items = tableItems(state.table, state.builds);
  let move: CasinoMove = { type: 'play', cardId: state.hands[seat][0].id, captureIds: [] };
  for (const card of state.hands[seat]) {
    const options = captureOptions(card, items, seat);
    if (options.length > 0) {
      move = { type: 'play', cardId: card.id, captureIds: options[0].map((item) => item.id) };
      break;
    }
  }
  return { move, result: applyCasinoMove(state, seat, move) };
}
