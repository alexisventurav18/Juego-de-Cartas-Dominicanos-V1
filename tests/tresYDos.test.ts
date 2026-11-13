import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Card } from '../src/games/cards';
import type { Player } from '../src/games/shared';
import { projectState } from '../src/games/view';
import {
  applyTresYDosMove,
  chooseTresYDosMove,
  createTresYDosGame,
  isFullHouse,
  nextDealerSeat,
  rankCounts,
  TARGET_WINS,
  type TresYDosMove,
  type TresYDosState,
  winningDiscardIds,
} from '../src/games/tresYDos';

type Suit = 'corazones' | 'diamantes' | 'treboles' | 'picas';
const c = (rank: number, suit: Suit): Card => ({ id: `${suit}-${rank}`, suit, rank });

const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: i === 0 ? 'humano' : `bot-${i}`, name: `J${i}` }));

function makeState(opts: Partial<TresYDosState> & { hands: Card[][] }): TresYDosState {
  return {
    game: 'tresydos',
    phase: 'playing',
    players: players(opts.hands.length),
    deck: [c(2, 'picas'), c(3, 'picas'), c(4, 'picas')],
    discardPile: [c(9, 'treboles')],
    turn: 0,
    turnStep: 'draw',
    drawnFrom: null,
    drawnCardId: null,
    dealer: opts.hands.length - 1,
    roundNo: 1,
    wins: opts.hands.map(() => 0),
    winnerSeat: null,
    ...opts,
  };
}

function play(state: TresYDosState, seat: number, move: TresYDosMove): TresYDosState {
  const res = applyTresYDosMove(state, seat, move);
  assert.ok('state' in res, 'error' in res ? res.error : '');
  return res.state;
}
const rejected = (state: TresYDosState, seat: number, move: TresYDosMove): string => {
  const res = applyTresYDosMove(state, seat, move);
  assert.ok('error' in res, 'la jugada debía rechazarse');
  return res.error;
};

// K-K-K-8-8 (el 3 y 2) y una carta suelta para el sexto lugar.
const fullHouse = [c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(8, 'picas'), c(8, 'corazones')];

describe('Tres y Dos: preparación', () => {
  for (const n of [2, 3, 4]) {
    it(`${n} jugadores: 5 cartas cada uno, 1 en el Pozo y el resto en el Monte`, () => {
      const state = createTresYDosGame(players(n), 0);
      assert.ok(state.hands.every((h) => h.length === 5));
      assert.equal(state.discardPile.length, 1);
      assert.equal(state.deck.length, 52 - 5 * n - 1);
      const all = [...state.hands.flat(), ...state.deck, ...state.discardPile];
      assert.equal(new Set(all.map((x) => x.id)).size, 52);
      assert.equal(state.turn, 1 % n, 'empieza el que sigue al que reparte');
      assert.equal(state.turnStep, 'draw');
    });
  }
  it('solo admite de 2 a 4 jugadores', () => {
    assert.throws(() => createTresYDosGame(players(1)));
    assert.throws(() => createTresYDosGame(players(5)));
  });
});

describe('Tres y Dos: el 3 y 2', () => {
  it('gana solo con una tercia y un par; cuatro iguales más una no gana', () => {
    assert.ok(isFullHouse(fullHouse));
    assert.deepEqual(rankCounts(fullHouse), [3, 2]);
    assert.ok(!isFullHouse([c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(13, 'treboles'), c(8, 'picas')]));
    assert.ok(!isFullHouse([c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(8, 'picas'), c(9, 'picas')]));
    assert.ok(!isFullHouse([c(2, 'picas'), c(4, 'picas'), c(6, 'picas'), c(8, 'picas'), c(10, 'picas')]));
    assert.ok(!isFullHouse(fullHouse.slice(0, 4)), 'una mano de 4 cartas no gana');
  });

  it('winningDiscardIds dice qué carta botar y respeta la que no se puede botar', () => {
    const six = [...fullHouse, c(9, 'corazones')];
    assert.deepEqual(winningDiscardIds(six), ['corazones-9']);
    // Si el 9 acaba de venir del Pozo, no se puede botar y no hay forma de ganar este turno.
    assert.deepEqual(winningDiscardIds(six, 'corazones-9'), []);
    // Con un cuarto K, cualquiera de los cuatro puede salir; el prohibido no.
    const four = [...fullHouse, c(13, 'treboles')];
    assert.equal(winningDiscardIds(four).length, 4);
    assert.ok(!winningDiscardIds(four, 'treboles-13').includes('treboles-13'));
    assert.deepEqual(winningDiscardIds(fullHouse), [], 'solo cuenta con 6 cartas');
  });

  it('al botar y quedarse con un 3 y 2 se gana la ronda', () => {
    const state = makeState({
      hands: [[...fullHouse, c(9, 'corazones')], [c(2, 'corazones'), c(4, 'corazones'), c(6, 'corazones'), c(10, 'corazones'), c(12, 'corazones')]],
      turnStep: 'discard',
      drawnFrom: 'deck',
      drawnCardId: 'corazones-9',
    });
    const next = play(state, 0, { type: 'discard', cardId: 'corazones-9' });
    assert.equal(next.phase, 'roundEnd');
    assert.equal(next.winnerSeat, 0);
    assert.deepEqual(next.wins, [1, 0]);
    assert.equal(next.discardPile[next.discardPile.length - 1].id, 'corazones-9');
    assert.deepEqual(next.hands[0].map((x) => x.id).sort(), fullHouse.map((x) => x.id).sort());
  });

  it('botar otra carta no gana y pasa el turno', () => {
    const state = makeState({
      hands: [[...fullHouse, c(9, 'corazones')], [c(2, 'corazones')]],
      turnStep: 'discard',
      drawnFrom: 'deck',
      drawnCardId: 'corazones-9',
    });
    const next = play(state, 0, { type: 'discard', cardId: 'picas-8' });
    assert.equal(next.phase, 'playing');
    assert.equal(next.turn, 1);
    assert.equal(next.turnStep, 'draw');
    assert.equal(next.hands[0].length, 5);
  });

  it('llegar a las rondas necesarias termina la partida', () => {
    const state = makeState({
      hands: [[...fullHouse, c(9, 'corazones')], [c(2, 'corazones')]],
      turnStep: 'discard',
      drawnFrom: 'deck',
      drawnCardId: 'corazones-9',
      wins: [TARGET_WINS - 1, 1],
    });
    const next = play(state, 0, { type: 'discard', cardId: 'corazones-9' });
    assert.equal(next.phase, 'gameOver');
    assert.equal(next.wins[0], TARGET_WINS);
    assert.equal(next.winnerSeat, 0);
  });
});

describe('Tres y Dos: turno de dos pasos', () => {
  const base = () =>
    makeState({
      hands: [[c(2, 'corazones'), c(5, 'corazones'), c(7, 'corazones'), c(10, 'corazones'), c(12, 'corazones')], [c(3, 'diamantes')]],
    });

  it('mientras toca robar está prohibido botar', () => {
    const state = base();
    assert.match(rejected(state, 0, { type: 'discard', cardId: 'corazones-2' }), /robar/i);
  });

  it('robar del Monte da 6 cartas y toca botar; no se puede robar dos veces', () => {
    const next = play(base(), 0, { type: 'drawDeck' });
    assert.equal(next.hands[0].length, 6);
    assert.equal(next.turnStep, 'discard');
    assert.equal(next.drawnFrom, 'deck');
    assert.equal(next.drawnCardId, 'picas-2');
    assert.equal(next.deck.length, 2);
    assert.match(rejected(next, 0, { type: 'drawDeck' }), /botar/i);
    assert.match(rejected(next, 0, { type: 'drawDiscard' }), /botar/i);
  });

  it('robar del Pozo toma su carta de arriba, y esa carta no se puede botar en el mismo turno', () => {
    const drawn = play(base(), 0, { type: 'drawDiscard' });
    assert.equal(drawn.drawnFrom, 'discard');
    assert.equal(drawn.drawnCardId, 'treboles-9');
    assert.equal(drawn.discardPile.length, 0);
    assert.match(rejected(drawn, 0, { type: 'discard', cardId: 'treboles-9' }), /Pozo/);
    const after = play(drawn, 0, { type: 'discard', cardId: 'corazones-2' });
    assert.equal(after.discardPile.length, 1);
    assert.equal(after.turn, 1);
  });

  it('si la carta viene del Monte sí se puede botar cualquiera de las 6, incluso la recién robada', () => {
    const drawn = play(base(), 0, { type: 'drawDeck' });
    const after = play(drawn, 0, { type: 'discard', cardId: 'picas-2' });
    assert.equal(after.discardPile[after.discardPile.length - 1].id, 'picas-2');
  });

  it('solo juega quien tiene el turno', () => {
    assert.match(rejected(base(), 1, { type: 'drawDeck' }), /turno/i);
  });

  it('no se puede robar del Pozo si está vacío', () => {
    const state = { ...base(), discardPile: [] };
    assert.match(rejected(state, 0, { type: 'drawDiscard' }), /vacío/i);
  });
});

describe('Tres y Dos: Monte agotado', () => {
  it('al robar con el Monte vacío se baraja el Pozo (menos la carta de arriba) como nuevo Monte', () => {
    const pile = [c(2, 'picas'), c(3, 'picas'), c(4, 'picas'), c(5, 'picas'), c(6, 'picas')];
    const state = makeState({
      hands: [[c(2, 'corazones'), c(5, 'corazones'), c(7, 'corazones'), c(10, 'corazones'), c(12, 'corazones')], [c(3, 'diamantes')]],
      deck: [],
      discardPile: pile,
    });
    const next = play(state, 0, { type: 'drawDeck' });
    assert.equal(next.hands[0].length, 6);
    assert.deepEqual(next.discardPile.map((x) => x.id), ['picas-6'], 'la carta de arriba se queda visible');
    assert.equal(next.deck.length, 3, 'el Monte nuevo (4 cartas) menos la robada');
    const all = [...next.deck, next.hands[0][5]].map((x) => x.id).sort();
    assert.deepEqual(all, ['picas-2', 'picas-3', 'picas-4', 'picas-5']);
  });

  it('al pasar el turno con el Monte vacío también se recicla', () => {
    const state = makeState({
      hands: [[...fullHouse.slice(0, 4), c(9, 'corazones'), c(10, 'corazones')], [c(2, 'corazones')]],
      deck: [],
      discardPile: [c(2, 'picas'), c(3, 'picas'), c(4, 'picas')],
      turnStep: 'discard',
      drawnFrom: 'deck',
      drawnCardId: 'corazones-10',
    });
    const next = play(state, 0, { type: 'discard', cardId: 'corazones-10' });
    assert.equal(next.deck.length, 3);
    assert.deepEqual(next.discardPile.map((x) => x.id), ['corazones-10']);
  });

  it('con una sola carta en el Pozo y el Monte vacío no hay nada que reciclar y se roba del Pozo', () => {
    const state = makeState({
      hands: [[c(2, 'corazones'), c(5, 'corazones'), c(7, 'corazones'), c(10, 'corazones'), c(12, 'corazones')], [c(3, 'diamantes')]],
      deck: [],
    });
    assert.match(rejected(state, 0, { type: 'drawDeck' }), /vacío/i);
    assert.equal(play(state, 0, { type: 'drawDiscard' }).hands[0].length, 6);
  });
});

describe('Tres y Dos: siguiente ronda', () => {
  const ended = (): TresYDosState =>
    makeState({
      hands: [fullHouse, [c(2, 'corazones')], [c(3, 'corazones')]],
      phase: 'roundEnd',
      winnerSeat: 0,
      wins: [1, 0, 0],
      dealer: 0,
      roundNo: 3,
    });

  it('solo la inicia el siguiente repartidor, rota el reparto y conserva las rondas ganadas', () => {
    const state = ended();
    assert.equal(nextDealerSeat(state), 1);
    assert.match(rejected(state, 0, { type: 'nextRound' }), /repartidor/i);
    const next = play(state, 1, { type: 'nextRound' });
    assert.equal(next.phase, 'playing');
    assert.equal(next.roundNo, 4);
    assert.equal(next.dealer, 1);
    assert.equal(next.turn, 2);
    assert.deepEqual(next.wins, [1, 0, 0]);
    assert.ok(next.hands.every((h) => h.length === 5));
  });

  it('no se puede iniciar mientras la ronda sigue ni jugar con la partida terminada', () => {
    assert.match(rejected(makeState({ hands: [fullHouse, [c(2, 'corazones')]] }), 1, { type: 'nextRound' }), /terminado/i);
    assert.match(rejected({ ...ended(), phase: 'gameOver' }, 1, { type: 'drawDeck' }), /curso/i);
  });
});

describe('Tres y Dos: lo que ve cada jugador', () => {
  const live = () =>
    makeState({
      hands: [fullHouse, [c(2, 'corazones'), c(4, 'corazones'), c(6, 'corazones'), c(10, 'corazones'), c(12, 'corazones')], [c(3, 'diamantes')]],
      deck: [c(2, 'picas'), c(3, 'picas')],
      discardPile: [c(9, 'treboles'), c(11, 'treboles')],
    });

  it('mientras se juega solo ves tu mano; el Monte es secreto y el Pozo es público', () => {
    const view = projectState(live(), 0);
    assert.ok(view.game === 'tresydos');
    if (view.game !== 'tresydos') return;
    assert.deepEqual(view.hands[0].map((x) => x.id), fullHouse.map((x) => x.id));
    assert.ok(view.hands[1].every((x) => x.id.startsWith('hidden-')));
    assert.equal(view.hands[1].length, 5);
    assert.ok(view.deck.every((x) => x.id.startsWith('hidden-')));
    assert.deepEqual(view.discardPile.map((x) => x.id), ['treboles-9', 'treboles-11']);
  });

  it('la carta robada del Monte no se le revela a los demás, pero la del Pozo sí', () => {
    const fromDeck = { ...live(), turnStep: 'discard' as const, drawnFrom: 'deck' as const, drawnCardId: 'picas-2' };
    const mine = projectState(fromDeck, 0);
    const other = projectState(fromDeck, 1);
    assert.ok(mine.game === 'tresydos' && other.game === 'tresydos');
    if (mine.game !== 'tresydos' || other.game !== 'tresydos') return;
    assert.equal(mine.drawnCardId, 'picas-2');
    assert.equal(other.drawnCardId, null);
    assert.ok(!JSON.stringify(other).includes('"picas-2"'));

    const fromPile = { ...fromDeck, drawnFrom: 'discard' as const, drawnCardId: 'treboles-9' };
    const seenByOther = projectState(fromPile, 1);
    if (seenByOther.game !== 'tresydos') return;
    assert.equal(seenByOther.drawnCardId, 'treboles-9');
  });

  it('al terminar la ronda se revelan las 5 cartas de todos', () => {
    const view = projectState({ ...live(), phase: 'roundEnd', winnerSeat: 0 }, 1);
    if (view.game !== 'tresydos') throw new Error('juego inesperado');
    assert.ok(view.hands.every((h) => h.every((x) => !x.id.startsWith('hidden-'))));
    assert.deepEqual(view.hands[0].map((x) => x.id), fullHouse.map((x) => x.id));
  });
});

describe('Tres y Dos: el bot', () => {
  it('canta el 3 y 2 en cuanto puede', () => {
    const state = makeState({
      hands: [[...fullHouse, c(9, 'corazones')], [c(2, 'corazones')]],
      turnStep: 'discard',
      drawnFrom: 'deck',
      drawnCardId: 'corazones-9',
    });
    assert.deepEqual(chooseTresYDosMove(state), { type: 'discard', cardId: 'corazones-9' });
  });

  it('roba del Pozo cuando esa carta le da el 3 y 2', () => {
    const state = makeState({
      hands: [[c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(8, 'picas'), c(9, 'picas')], [c(2, 'corazones')]],
      discardPile: [c(8, 'corazones')],
    });
    assert.deepEqual(chooseTresYDosMove(state), { type: 'drawDiscard' });
  });

  it('roba del Monte cuando la carta del Pozo no le sirve de nada', () => {
    const state = makeState({
      hands: [[c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(8, 'picas'), c(9, 'picas')], [c(2, 'corazones')]],
      discardPile: [c(4, 'treboles')],
    });
    assert.deepEqual(chooseTresYDosMove(state), { type: 'drawDeck' });
  });

  it('nunca bota la carta que tomó del Pozo y se queda con la tercia', () => {
    const state = makeState({
      hands: [[c(13, 'picas'), c(13, 'corazones'), c(13, 'diamantes'), c(8, 'picas'), c(9, 'picas'), c(4, 'treboles')], [c(2, 'corazones')]],
      turnStep: 'discard',
      drawnFrom: 'discard',
      drawnCardId: 'treboles-4',
    });
    const move = chooseTresYDosMove(state);
    assert.equal(move.type, 'discard');
    if (move.type !== 'discard') return;
    assert.notEqual(move.cardId, 'treboles-4');
    assert.ok(!['picas-13', 'corazones-13', 'diamantes-13'].includes(move.cardId), 'no rompe la tercia');
    assert.ok('state' in applyTresYDosMove(state, 0, move));
  });
});
