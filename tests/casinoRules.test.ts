import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { americanDeck, type Card } from '../src/games/cards';
import { applyCasinoMove, type CasinoMove, type CasinoState } from '../src/games/casino';
import type { Build } from '../src/games/casinoCapture';
import type { Player } from '../src/games/shared';

const deck = americanDeck();
const byId = (id: string): Card => {
  const card = deck.find((c) => c.id === id);
  if (!card) throw new Error(`carta desconocida ${id}`);
  return card;
};
const cards = (...ids: string[]): Card[] => ids.map(byId);

const players: Player[] = [
  { id: 'p0', name: 'Ana' },
  { id: 'p1', name: 'Luis' },
];

function makeState(opts: {
  hands: [string[], string[]];
  table?: string[];
  builds?: Build[];
  turn?: number;
}): CasinoState {
  const builds = opts.builds ?? [];
  return {
    game: 'casino',
    phase: 'playing',
    players,
    deck: [byId('picas-13')],
    hands: [cards(...opts.hands[0]), cards(...opts.hands[1])],
    table: cards(...(opts.table ?? [])),
    builds,
    buildSeq: builds.length + 1,
    captured: [[], []],
    viraos: [0, 0],
    scores: [0, 0],
    turn: opts.turn ?? 0,
    dealer: 1,
    roundNo: 2,
    lastCapturer: null,
    lastCapture: null,
    summary: null,
    winnerTeam: null,
  };
}

const build = (id: string, kind: 'sum' | 'pairs', value: number, owner: number, ...ids: string[]): Build => ({
  id,
  kind,
  value,
  owner,
  cards: cards(...ids),
});

function play(state: CasinoState, seat: number, move: CasinoMove): CasinoState {
  const result = applyCasinoMove(state, seat, move);
  assert.ok(!('error' in result), 'error' in result ? result.error : '');
  return result.state;
}

function errorOf(state: CasinoState, seat: number, move: CasinoMove): string {
  const result = applyCasinoMove(state, seat, move);
  assert.ok('error' in result, 'la jugada debía ser rechazada');
  return result.error;
}

describe('apilar una suma sobre un par existente', () => {
  it('escenario 1: un par de 5 y un 3 suelto; con un 2 se apilan en un solo par de 5 (queda otro 5 en mano)', () => {
    const state = makeState({
      hands: [['diamantes-2', 'diamantes-5', 'picas-13'], ['corazones-13']],
      table: ['treboles-3', 'treboles-9'],
      builds: [build('b1', 'pairs', 5, 0, 'picas-5', 'corazones-5')],
    });

    const next = play(state, 0, { type: 'expand', cardId: 'diamantes-2', buildId: 'b1', tableIds: ['treboles-3'] });

    assert.equal(next.builds.length, 1);
    assert.equal(next.builds[0].kind, 'pairs');
    assert.equal(next.builds[0].value, 5, 'el valor del par no cambia');
    assert.deepEqual(next.builds[0].cards.map((c) => c.id).sort(), [
      'corazones-5',
      'diamantes-2',
      'picas-5',
      'treboles-3',
    ]);
    assert.deepEqual(next.table.map((c) => c.id), ['treboles-9'], 'solo sale de la mesa el 3 usado');
  });

  it('no permite subir el valor de un par: un 2 sobre un par de 5 sin cartas sueltas es ilegal', () => {
    const state = makeState({
      hands: [['diamantes-2', 'diamantes-5'], ['corazones-13']],
      builds: [build('b1', 'pairs', 5, 0, 'picas-5', 'corazones-5')],
    });
    assert.match(errorOf(state, 0, { type: 'raise', cardId: 'diamantes-2', buildId: 'b1' }), /No puedes subir/);
  });
});

describe('captura de varios grupos a la vez', () => {
  it('escenario 2: otro jugador tira un 5 y se lleva el par de 5 junto con el 3 + 2', () => {
    const state = makeState({
      hands: [['picas-13'], ['diamantes-5', 'corazones-12']],
      table: ['treboles-3', 'diamantes-2', 'treboles-9'],
      builds: [build('b1', 'pairs', 5, 0, 'picas-5', 'corazones-5')], // par armado por el rival (asiento 0)
      turn: 1,
    });

    const next = play(state, 1, {
      type: 'play',
      cardId: 'diamantes-5',
      captureIds: ['b1', 'treboles-3', 'diamantes-2'],
    });

    assert.equal(next.builds.length, 0);
    assert.deepEqual(next.table.map((c) => c.id), ['treboles-9']);
    assert.equal(next.lastCapture?.capturedCount, 4); // 2 del par + 3 + 2
    assert.equal(next.lastCapture?.seat, 1);

    // Un grupo que no completa el valor sigue siendo ilegal.
    const mal = errorOf(state, 1, {
      type: 'play',
      cardId: 'diamantes-5',
      captureIds: ['b1', 'treboles-3', 'treboles-9'],
    });
    assert.match(mal, /no coinciden ni suman/);
  });
});

describe('el As como 14', () => {
  it('escenario 3a: se arma K + As = 14 y otro As lo captura valiendo 14', () => {
    const state = makeState({
      hands: [['picas-13', 'corazones-1', 'treboles-2'], ['diamantes-1', 'corazones-12']],
      table: ['treboles-1'],
    });

    // K (13) + As suelto (1) = 14; queda el As de corazones en la mano para cerrarlo.
    const armed = play(state, 0, { type: 'build', cardId: 'picas-13', kind: 'sum', tableIds: ['treboles-1'] });
    assert.equal(armed.builds[0].value, 14);

    // El rival se lleva el 14 con su As (valiendo 14).
    const next = play(armed, 1, { type: 'play', cardId: 'diamantes-1', captureIds: [armed.builds[0].id] });
    assert.equal(next.builds.length, 0);
    assert.equal(next.lastCapture?.capturedCount, 2);
  });

  it('escenario 3b: un As captura Q + 2 (12 + 2 = 14) y además otro As suelto valiendo 14', () => {
    const state = makeState({
      hands: [['picas-1', 'picas-13'], ['corazones-13']],
      table: ['diamantes-12', 'treboles-2', 'treboles-1', 'treboles-9'],
    });

    const next = play(state, 0, {
      type: 'play',
      cardId: 'picas-1',
      captureIds: ['diamantes-12', 'treboles-2', 'treboles-1'],
    });
    assert.deepEqual(next.table.map((c) => c.id), ['treboles-9']);
    assert.equal(next.lastCapture?.capturedCount, 3);

    // Un As tampoco captura lo que no suma 1 ni 14.
    const mal = errorOf(state, 0, { type: 'play', cardId: 'picas-1', captureIds: ['diamantes-12', 'treboles-9'] });
    assert.match(mal, /no coinciden ni suman/);
  });
});

describe('condición de cierre y compromiso', () => {
  it('escenario 4: armar una suma o apilar sobre un par sin la carta de cierre en mano es ilegal', () => {
    // Armar 3 + 4 = 7 sin tener un 7 en la mano.
    const armar = makeState({ hands: [['treboles-3', 'diamantes-9'], ['corazones-13']], table: ['picas-4'] });
    assert.match(
      errorOf(armar, 0, { type: 'build', cardId: 'treboles-3', kind: 'sum', tableIds: ['picas-4'] }),
      /no es válida/,
    );

    // Apilar 2 + 3 sobre un par de 5 sin otro 5 en la mano.
    const apilar = makeState({
      hands: [['diamantes-2', 'picas-13'], ['corazones-13']],
      table: ['treboles-3'],
      builds: [build('b1', 'pairs', 5, 0, 'picas-5', 'corazones-5')],
    });
    assert.match(
      errorOf(apilar, 0, { type: 'expand', cardId: 'diamantes-2', buildId: 'b1', tableIds: ['treboles-3'] }),
      /No puedes ampliar/,
    );
  });

  it('no deja tirar la última carta que cierra tu propia combinación, pero sí llevártela o tirar otra', () => {
    const state = makeState({
      hands: [['diamantes-9', 'treboles-2', 'corazones-6'], ['corazones-13']],
      table: ['picas-4'],
      builds: [build('b1', 'sum', 9, 0, 'treboles-4', 'treboles-5')],
    });

    assert.match(errorOf(state, 0, { type: 'play', cardId: 'diamantes-9', captureIds: [] }), /última carta para cerrarla/);
    assert.match(
      errorOf(state, 0, { type: 'build', cardId: 'diamantes-9', kind: 'pairs', tableIds: ['picas-4'] }),
      /última carta para cerrarla|no es válida/,
    );

    play(state, 0, { type: 'play', cardId: 'treboles-2', captureIds: [] }); // conserva el 9
    play(state, 0, { type: 'play', cardId: 'diamantes-9', captureIds: ['b1'] }); // se la lleva
  });

  it('no bloquea al jugador que ya no tenía la carta de cierre (evita quedarse sin jugadas)', () => {
    const state = makeState({
      hands: [['treboles-2', 'corazones-6'], ['corazones-13']],
      table: ['picas-4'],
      builds: [build('b1', 'sum', 9, 0, 'treboles-4', 'treboles-5')],
    });
    play(state, 0, { type: 'play', cardId: 'treboles-2', captureIds: [] });
  });
});
