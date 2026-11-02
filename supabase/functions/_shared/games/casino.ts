// GENERADO por scripts/syncFunctions.ts desde src/games. No lo edites a mano: cambia el original y ejecuta `npm run sync:functions`.
import { americanDeck, type Card, randomInt, shuffle } from './cards.ts';
import {
  type Build,
  captureOptions,
  convertValue,
  expansionValue,
  type FormationKind,
  formationValue,
  isValidCapture,
  MAX_CAPTURE_VALUE,
  MAX_TABLE_SUM,
  mixesRivalBuild,
  pairsRankOf,
  raiseValue,
  tableItems,
} from './casinoCapture.ts';
import { type MoveResult, type Player, type ScoreLine, teamOf } from './shared.ts';

export const CASINO_TARGET = 21;
/** Desde esta puntuación (al empezar la ronda) solo cuentan la mayoría de cartas y de picas. */
export const CLOSING_THRESHOLD = 17;
export const CARDS_MAJORITY_POINTS = 3;
export const SPADES_MAJORITY_POINTS = 1;
const DECK_SIZE = 52;
const SPADES_IN_DECK = 13;
const FORMATION_KINDS: FormationKind[] = ['sum', 'pairs'];

/** Objetivos que le faltan a un equipo en cierre obligatorio. */
export interface ClosingNeeds {
  cards: boolean;
  spades: boolean;
}

/**
 * Regla de cierre obligatorio. Con 17 o más puntos (y menos de 21) el equipo solo puede
 * sumar mayoría de cartas (3) y mayoría de picas (1), y únicamente la que le falta para
 * llegar a 21 exactos:
 *  - faltan 4 (17 pts): las dos.
 *  - faltan 3 (18 pts): la mayoría de cartas.
 *  - faltan 2 o 1 (19 o 20 pts): la mayoría de picas (la de cartas pasaría de 21).
 * Devuelve null si el equipo todavía juega con la puntuación normal.
 */
export function closingNeeds(score: number): ClosingNeeds | null {
  if (score < CLOSING_THRESHOLD || score >= CASINO_TARGET) return null;
  const remaining = CASINO_TARGET - score;
  if (remaining >= CARDS_MAJORITY_POINTS + SPADES_MAJORITY_POINTS) return { cards: true, spades: true };
  if (remaining === CARDS_MAJORITY_POINTS) return { cards: true, spades: false };
  return { cards: false, spades: true };
}

export function closingLabel(needs: ClosingNeeds): string {
  if (needs.cards && needs.spades) return 'mayoría de cartas y mayoría de picas';
  return needs.cards ? 'mayoría de cartas' : 'mayoría de picas';
}

export interface RoundSummary {
  lines: [ScoreLine[], ScoreLine[]];
  totals: [number, number];
  /** Cierre obligatorio con el que empezó cada equipo la ronda (null = puntuación normal). */
  needs?: [ClosingNeeds | null, ClosingNeeds | null];
}

export interface CaptureGroup {
  cards: Card[];
  virao: boolean;
  pairsRank: number | null;
}

export interface CasinoState {
  game: 'casino';
  phase: 'playing' | 'roundEnd' | 'gameOver';
  players: Player[];
  deck: Card[];
  hands: Card[][];
  table: Card[];
  builds: Build[];
  buildSeq: number;
  captured: [CaptureGroup[], CaptureGroup[]];
  viraos: [number, number];
  scores: [number, number];
  turn: number;
  dealer: number;
  roundNo: number;
  lastCapturer: number | null;
  summary: RoundSummary | null;
  winnerTeam: number | null;
}

export type CasinoMove =
  | { type: 'play'; cardId: string; captureIds: string[] }
  | { type: 'build'; cardId: string; kind: FormationKind; tableIds: string[]; mergeId?: string }
  | { type: 'raise'; cardId: string; buildId: string }
  | { type: 'convert'; cardId: string; buildId: string }
  | { type: 'expand'; cardId: string; buildId: string; tableIds: string[] }
  | { type: 'nextRound' };

export function createCasinoGame(players: Player[], dealer?: number): CasinoState {
  return dealRound({
    game: 'casino',
    phase: 'roundEnd',
    players,
    deck: [],
    hands: [],
    table: [],
    builds: [],
    buildSeq: 0,
    captured: [[], []],
    viraos: [0, 0],
    scores: [0, 0],
    turn: 0,
    dealer: dealer ?? randomInt(players.length),
    roundNo: 0,
    lastCapturer: null,
    summary: null,
    winnerTeam: null,
  });
}

export function nextDealerSeat(state: CasinoState): number {
  return (state.dealer + 1) % state.players.length;
}

function isScoringCard(card: Card): boolean {
  return card.suit === 'picas' || card.rank === 1 || (card.suit === 'diamantes' && card.rank === 10);
}

function deferScoringCards(deck: Card[], dealtCount: number): Card[] {
  const result = [...deck];
  for (let i = 0; i < dealtCount; i++) {
    if (!isScoringCard(result[i]) || randomInt(2) === 0) continue;
    const swap = result.findIndex((c, j) => j >= dealtCount && !isScoringCard(c));
    if (swap === -1) break;
    [result[i], result[swap]] = [result[swap], result[i]];
  }
  return result;
}

function dealRound(state: CasinoState): CasinoState {
  const n = state.players.length;
  const dealer = state.roundNo === 0 ? state.dealer : (state.dealer + 1) % n;
  const deck = deferScoringCards(shuffle(americanDeck()), 4 * n + 4);
  const hands: Card[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < 4; i++) {
    for (let seat = 0; seat < n; seat++) hands[seat].push(...deck.splice(0, 1));
  }
  return {
    ...state,
    phase: 'playing',
    deck,
    hands,
    table: deck.splice(0, 4),
    builds: [],
    captured: [[], []],
    viraos: [0, 0],
    dealer,
    turn: (dealer + 1) % n,
    roundNo: state.roundNo + 1,
    lastCapturer: null,
    summary: null,
  };
}

function dealMoreCards(state: CasinoState): CasinoState {
  const deck = [...state.deck];
  const hands = state.hands.map((hand) => [...hand]);
  for (let seat = 0; seat < hands.length; seat++) {
    hands[seat].push(...deck.splice(0, 4));
  }
  return { ...state, deck, hands };
}

export function scoreRound(
  captured: [Card[], Card[]],
  viraos: [number, number],
  startScores: [number, number],
): RoundSummary {
  const needs: [ClosingNeeds | null, ClosingNeeds | null] = [
    closingNeeds(startScores[0]),
    closingNeeds(startScores[1]),
  ];
  const lines = ([0, 1] as const).map((team): ScoreLine[] => {
    const cards = captured[team];
    const teamNeeds = needs[team];
    const result: ScoreLine[] = [];
    const add = (line: ScoreLine, counts: boolean) => {
      if (counts) result.push(line);
      else result.push({ ...line, points: 0, muted: true, detail: `${line.detail ?? ''} · no cuenta en el cierre`.trim() });
    };
    const normal = teamNeeds === null;
    if (cards.length * 2 > DECK_SIZE) {
      add(
        { label: 'Mayoría de cartas', detail: `${cards.length} de ${DECK_SIZE} cartas`, points: CARDS_MAJORITY_POINTS },
        normal || teamNeeds.cards,
      );
    }
    if (cards.some((c) => c.suit === 'diamantes' && c.rank === 10)) {
      add({ label: 'Gran Casino', detail: '10 de diamantes', points: 2 }, normal);
    }
    if (cards.some((c) => c.suit === 'picas' && c.rank === 2)) {
      add({ label: 'Dueño', detail: '2 de picas', points: 1 }, normal);
    }
    const spades = cards.filter((c) => c.suit === 'picas').length;
    if (spades * 2 > SPADES_IN_DECK) {
      add(
        { label: 'Mayoría de picas', detail: `${spades} de ${SPADES_IN_DECK} picas`, points: SPADES_MAJORITY_POINTS },
        normal || teamNeeds.spades,
      );
    }
    const aces = cards.filter((c) => c.rank === 1).length;
    if (aces > 0) add({ label: 'Ases', detail: `${aces} de 4 · 1 punto cada uno`, points: aces }, normal);
    if (viraos[team] > 0) {
      add(
        {
          label: 'Viraos',
          detail: `${viraos[team]} mesa${viraos[team] === 1 ? '' : 's'} limpia${viraos[team] === 1 ? '' : 's'} · 1 punto cada una`,
          points: viraos[team],
        },
        normal,
      );
    }
    return result;
  }) as [ScoreLine[], ScoreLine[]];

  const totals: [number, number] = [
    lines[0].reduce((sum, line) => sum + line.points, 0),
    lines[1].reduce((sum, line) => sum + line.points, 0),
  ];
  return { lines, totals, needs };
}

/** Gana quien llegue a 21; si ambos llegan, el de más puntos, y a igualdad el que más sumó en la ronda. */
export function decideWinner(scores: [number, number], roundTotals: [number, number]): number | null {
  const reached = ([0, 1] as const).filter((team) => scores[team] >= CASINO_TARGET);
  if (reached.length === 0) return null;
  if (reached.length === 1) return reached[0];
  if (scores[0] !== scores[1]) return scores[0] > scores[1] ? 0 : 1;
  if (roundTotals[0] !== roundTotals[1]) return roundTotals[0] > roundTotals[1] ? 0 : 1;
  return null;
}

function finishRound(state: CasinoState): CasinoState {
  const captured: [CaptureGroup[], CaptureGroup[]] = [[...state.captured[0]], [...state.captured[1]]];
  const leftover = [...state.table, ...state.builds.flatMap((build) => build.cards)];
  if (state.lastCapturer !== null && leftover.length > 0) {
    const team = teamOf(state.lastCapturer);
    captured[team] = [...captured[team], { cards: leftover, virao: false, pairsRank: null }];
  }
  const flat: [Card[], Card[]] = [
    captured[0].flatMap((group) => group.cards),
    captured[1].flatMap((group) => group.cards),
  ];
  const summary = scoreRound(flat, state.viraos, state.scores);
  const scores: [number, number] = [
    state.scores[0] + summary.totals[0],
    state.scores[1] + summary.totals[1],
  ];
  const winner = decideWinner(scores, summary.totals);
  return {
    ...state,
    phase: winner !== null ? 'gameOver' : 'roundEnd',
    table: [],
    builds: [],
    captured,
    scores,
    summary,
    winnerTeam: winner,
  };
}

function advanceTurn(state: CasinoState, seat: number): CasinoState {
  let next = state;
  if (next.hands.every((hand) => hand.length === 0)) {
    if (next.deck.length === 0) return finishRound(next);
    next = dealMoreCards(next);
  }
  const n = next.players.length;
  for (let step = 1; step <= n; step++) {
    const candidate = (seat + step) % n;
    if (next.hands[candidate].length > 0) return { ...next, turn: candidate };
  }
  return finishRound(next);
}

function unmarkLastVirao(groups: CaptureGroup[]): CaptureGroup[] {
  const index = groups.map((group) => group.virao).lastIndexOf(true);
  return groups.map((group, i) => (i === index ? { ...group, virao: false } : group));
}

function collectTable(
  state: CasinoState,
  seat: number,
  cards: Card[],
  table: Card[],
  builds: Build[],
  pairsRank: number | null,
): CasinoState {
  const team = teamOf(seat);
  const other = 1 - team;
  const roundOver = state.hands.every((hand) => hand.length === 0) && state.deck.length === 0;
  const virao = table.length === 0 && builds.length === 0 && !roundOver;
  const captured: [CaptureGroup[], CaptureGroup[]] = [[...state.captured[0]], [...state.captured[1]]];
  const viraos: [number, number] = [state.viraos[0], state.viraos[1]];
  let viraoMark = false;
  if (virao) {
    if (viraos[other] > 0) {
      viraos[other] -= 1;
      captured[other] = unmarkLastVirao(captured[other]);
    } else {
      viraos[team] += 1;
      viraoMark = true;
    }
  }
  captured[team] = [...captured[team], { cards, virao: viraoMark, pairsRank }];
  return advanceTurn({ ...state, table, builds, captured, viraos, lastCapturer: seat }, seat);
}

function playCard(
  state: CasinoState,
  seat: number,
  card: Card,
  captureIds: string[],
  forced: boolean,
): MoveResult<CasinoState> {
  const items = tableItems(state.table, state.builds);
  const selected = items.filter((item) => captureIds.includes(item.id));
  if (selected.length !== captureIds.length) {
    return { error: 'Alguna carta elegida ya no está en la mesa.' };
  }
  if (selected.length === 0) {
    if (forced) {
      return { error: 'Tienes una jugada para llevarte cartas: no puedes dejar tu carta en la mesa.' };
    }
    return { state: advanceTurn({ ...state, table: [...state.table, card] }, seat) };
  }
  if (!isValidCapture(card, selected)) {
    return { error: 'Esas cartas no coinciden ni suman el valor de tu carta.' };
  }
  if (mixesRivalBuild(selected, seat)) {
    return { error: 'No puedes llevarte una combinación del rival junto con cartas sueltas.' };
  }
  const table = state.table.filter((c) => !captureIds.includes(c.id));
  const builds = state.builds.filter((build) => !captureIds.includes(build.id));
  const taken = selected.flatMap((item) => item.cards);
  const pairsRank = pairsRankOf(card, selected);
  return { state: collectTable(state, seat, [card, ...taken], table, builds, pairsRank) };
}

function buildCombination(
  state: CasinoState,
  seat: number,
  card: Card,
  kind: FormationKind,
  tableIds: string[],
  mergeId?: string,
): MoveResult<CasinoState> {
  const loose = state.table.filter((c) => tableIds.includes(c.id));
  if (loose.length === 0 || loose.length !== tableIds.length) {
    return { error: 'Elige cartas sueltas de la mesa para formar la combinación.' };
  }
  const value = formationValue(kind, card, loose, state.hands[seat]);
  if (value === null) {
    return {
      error: `Esa combinación no es válida: revisa las cartas elegidas y que te quede en mano una carta de su valor (no puede pasar de ${MAX_CAPTURE_VALUE}).`,
    };
  }
  const merge = mergeId === undefined ? null : (state.table.find((c) => c.id === mergeId) ?? null);
  if (mergeId !== undefined && (kind !== 'sum' || merge === null || merge.rank !== value || tableIds.includes(mergeId))) {
    return { error: 'Esa carta de la mesa no puede unirse a esta sumatoria.' };
  }
  const merged = merge ? [merge] : [];
  const removedIds = [...tableIds, ...merged.map((c) => c.id)];
  const build: Build = {
    id: `build-${state.buildSeq}`,
    kind: merged.length > 0 ? 'pairs' : kind,
    value,
    cards: [card, ...loose, ...merged],
    owner: seat,
  };
  return {
    state: advanceTurn(
      {
        ...state,
        table: state.table.filter((c) => !removedIds.includes(c.id)),
        builds: [...state.builds, build],
        buildSeq: state.buildSeq + 1,
      },
      seat,
    ),
  };
}

function raiseCombination(
  state: CasinoState,
  seat: number,
  card: Card,
  buildId: string,
): MoveResult<CasinoState> {
  const build = state.builds.find((b) => b.id === buildId);
  if (!build) return { error: 'Esa combinación ya no está en la mesa.' };
  const value = raiseValue(card, build, state.hands[seat]);
  if (value === null) {
    return {
      error: `No puedes subir esta combinación: debe quedarte en mano una carta de su nuevo valor y no puede pasar de ${MAX_CAPTURE_VALUE}.`,
    };
  }
  const builds = state.builds.map((b) =>
    b.id === buildId ? { ...b, kind: 'sum' as const, value, cards: [...b.cards, card] } : b,
  );
  return { state: advanceTurn({ ...state, builds }, seat) };
}

function convertCombination(
  state: CasinoState,
  seat: number,
  card: Card,
  buildId: string,
): MoveResult<CasinoState> {
  const build = state.builds.find((b) => b.id === buildId);
  if (!build) return { error: 'Esa combinación ya no está en la mesa.' };
  if (convertValue(card, build, state.hands[seat]) === null) {
    return {
      error: 'No puedes sumar esta carta al par: necesitas una carta de su mismo valor y que te quede en mano otra de ese valor.',
    };
  }
  const builds = state.builds.map((b) =>
    b.id === buildId ? { ...b, kind: 'pairs' as const, cards: [...b.cards, card] } : b,
  );
  return { state: advanceTurn({ ...state, builds }, seat) };
}

function expandCombination(
  state: CasinoState,
  seat: number,
  card: Card,
  buildId: string,
  tableIds: string[],
): MoveResult<CasinoState> {
  const build = state.builds.find((b) => b.id === buildId);
  if (!build) return { error: 'Esa combinación ya no está en la mesa.' };
  const loose = state.table.filter((c) => tableIds.includes(c.id));
  if (loose.length === 0 || loose.length !== tableIds.length) {
    return { error: 'Elige cartas sueltas de la mesa para ampliar la combinación.' };
  }
  const value = expansionValue(card, build, loose, state.hands[seat]);
  if (value === null) {
    return {
      error: `No puedes ampliar esta combinación: revisa los valores y que te quede en mano una carta de su nuevo valor (no puede pasar de ${MAX_CAPTURE_VALUE}).`,
    };
  }
  const builds = state.builds.map((b) =>
    b.id === buildId ? { ...b, value, cards: [...b.cards, card, ...loose] } : b,
  );
  return {
    state: advanceTurn(
      { ...state, table: state.table.filter((c) => !tableIds.includes(c.id)), builds },
      seat,
    ),
  };
}

function looseSubsets(table: Card[]): Card[][] {
  const out: Card[][] = [];
  const walk = (start: number, chosen: Card[], total: number) => {
    if (chosen.length > 0) out.push(chosen);
    for (let i = start; i < table.length; i++) {
      const next = total + table[i].rank;
      if (next <= MAX_TABLE_SUM) walk(i + 1, [...chosen, table[i]], next);
    }
  };
  walk(0, [], 0);
  return out;
}

export function formationMoves(state: CasinoState, seat: number): CasinoMove[] {
  const hand = state.hands[seat];
  const subsets = looseSubsets(state.table);
  const moves: CasinoMove[] = [];
  for (const card of hand) {
    const rest = hand.filter((c) => c.id !== card.id);
    for (const loose of subsets) {
      const tableIds = loose.map((c) => c.id);
      for (const kind of FORMATION_KINDS) {
        if (formationValue(kind, card, loose, rest) !== null) {
          moves.push({ type: 'build', cardId: card.id, kind, tableIds });
        }
      }
      const sum = formationValue('sum', card, loose, rest);
      if (sum !== null) {
        for (const merge of state.table) {
          if (merge.rank === sum && !tableIds.includes(merge.id)) {
            moves.push({ type: 'build', cardId: card.id, kind: 'sum', tableIds, mergeId: merge.id });
          }
        }
      }
      for (const build of state.builds) {
        if (expansionValue(card, build, loose, rest) !== null) {
          moves.push({ type: 'expand', cardId: card.id, buildId: build.id, tableIds });
        }
      }
    }
    for (const build of state.builds) {
      if (raiseValue(card, build, rest) !== null) {
        moves.push({ type: 'raise', cardId: card.id, buildId: build.id });
      }
      if (convertValue(card, build, rest) !== null) {
        moves.push({ type: 'convert', cardId: card.id, buildId: build.id });
      }
    }
  }
  return moves;
}

export function isCaptureForced(state: CasinoState, seat: number): boolean {
  if (!state.builds.some((build) => build.owner === seat)) return false;
  const items = tableItems(state.table, state.builds);
  const options = state.hands[seat].flatMap((card) => captureOptions(card, items, seat));
  if (options.length === 0) return false;
  const takesOthers = options.some((taken) => taken.some((item) => item.owner !== seat));
  return takesOthers || formationMoves(state, seat).length === 0;
}

export function applyCasinoMove(
  state: CasinoState,
  seat: number,
  move: CasinoMove,
): MoveResult<CasinoState> {
  if (move.type === 'nextRound') {
    if (state.phase !== 'roundEnd') return { error: 'La ronda todavía no ha terminado.' };
    if (seat !== nextDealerSeat(state)) return { error: 'Solo el repartidor puede iniciar la siguiente ronda.' };
    return { state: dealRound(state) };
  }

  if (state.phase !== 'playing') return { error: 'La partida no está en curso.' };
  if (seat !== state.turn) return { error: 'No es tu turno.' };

  const card = state.hands[seat].find((c) => c.id === move.cardId);
  if (!card) return { error: 'Esa carta no está en tu mano.' };

  const forced = isCaptureForced(state, seat);
  const hands = state.hands.map((hand, i) => (i === seat ? hand.filter((c) => c.id !== card.id) : hand));
  const next: CasinoState = { ...state, hands };

  if (move.type === 'play') return playCard(next, seat, card, move.captureIds, forced);
  if (move.type === 'build') return buildCombination(next, seat, card, move.kind, move.tableIds, move.mergeId);
  if (move.type === 'raise') return raiseCombination(next, seat, card, move.buildId);
  if (move.type === 'convert') return convertCombination(next, seat, card, move.buildId);
  return expandCombination(next, seat, card, move.buildId, move.tableIds);
}
