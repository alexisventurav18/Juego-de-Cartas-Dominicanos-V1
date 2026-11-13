import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Card } from '../src/games/cards';
import type { Player } from '../src/games/shared';
import { projectState } from '../src/games/view';
import {
  applyCagaoMove,
  CAGAO_CARD_ID,
  type CagaoMove,
  type CagaoState,
  cagaoDeck,
  chooseCagaoMove,
  createCagaoGame,
  drawFromSeat,
  hasPair,
  seatsWithPairs,
  takePairs,
} from '../src/games/cagao';

type Suit = 'corazones' | 'diamantes' | 'treboles' | 'picas';
const c = (rank: number, suit: Suit): Card => ({ id: `${suit}-${rank}`, suit, rank });
const ace = c(1, 'picas');

const players = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: i === 0 ? 'humano' : `bot-${i}`, name: `J${i}` }));

function makeState(opts: Partial<CagaoState> & { hands: Card[][] }): CagaoState {
  return {
    game: 'cagao',
    phase: 'playing',
    players: players(opts.hands.length),
    pairs: [],
    turn: 0,
    dealer: opts.hands.length - 1,
    roundNo: 1,
    finishOrder: [],
    loserSeat: null,
    lastEvent: null,
    ...opts,
  };
}

function play(state: CagaoState, seat: number, move: CagaoMove): CagaoState {
  const res = applyCagaoMove(state, seat, move);
  assert.ok('state' in res, 'error' in res ? res.error : '');
  return res.state;
}
const rejected = (state: CagaoState, seat: number, move: CagaoMove): string => {
  const res = applyCagaoMove(state, seat, move);
  assert.ok('error' in res, 'la jugada debía rechazarse');
  return res.error;
};
const ids = (cards: Card[]) => cards.map((x) => x.id).sort();

/** Todos bajan sus pares con el botón "bajar todos": termina la fase inicial. */
function settle(state: CagaoState): CagaoState {
  let next = state;
  for (const seat of seatsWithPairs(state)) next = play(next, seat, { type: 'pairAll' });
  return next;
}

describe('El Cagao: baraja y reparto', () => {
  it('la baraja tiene 49 cartas y el A♠ es el único As', () => {
    const deck = cagaoDeck();
    assert.equal(deck.length, 49);
    assert.equal(new Set(deck.map((x) => x.id)).size, 49);
    assert.deepEqual(deck.filter((x) => x.rank === 1).map((x) => x.id), [CAGAO_CARD_ID]);
  });

  for (const n of [2, 3, 4, 5, 6]) {
    it(`${n} jugadores: se reparte todo el mazo y, al bajar los pares, cada mano queda sin pares`, () => {
      const dealt = createCagaoGame(players(n), 0);
      assert.equal(dealt.hands.flat().length, 49, 'se reparten las 49 cartas');
      assert.equal(dealt.pairs.length, 0, 'los pares se bajan después, no al repartir');
      const sizes = dealt.hands.map((h) => h.length);
      assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, 'unos jugadores solo tienen una carta más');
      assert.equal(dealt.phase, 'pairing');

      const state = settle(dealt);
      const inHands = state.hands.flat();
      const inPairs = state.pairs.flatMap((p) => p.cards);
      assert.equal(inHands.length + inPairs.length, 49, 'no se pierde ninguna carta');
      assert.equal(new Set([...inHands, ...inPairs].map((x) => x.id)).size, 49);
      for (const hand of state.hands) assert.ok(!hasPair(hand), 'quedó un par sin bajar');
      for (const p of state.pairs) assert.equal(p.cards[0].rank, p.cards[1].rank);
      assert.ok(inHands.some((x) => x.id === CAGAO_CARD_ID), 'El Cagao está en alguna mano');
      assert.equal(state.phase === 'playing' || state.phase === 'gameOver', true);
    });
  }

  it('solo admite de 2 a 6 jugadores', () => {
    assert.throws(() => createCagaoGame(players(1)));
    assert.throws(() => createCagaoGame(players(7)));
  });

  it('empieza a robar el jugador que sigue al que reparte', () => {
    const state = settle(createCagaoGame(players(4), 1));
    if (state.phase === 'playing' && state.hands[2].length > 0) assert.equal(state.turn, 2);
  });

  it('de tres cartas iguales se baja un par y queda una; de cuatro, dos pares', () => {
    const three = takePairs([c(7, 'corazones'), c(7, 'picas'), c(7, 'treboles'), c(9, 'picas')]);
    assert.equal(three.pairs.length, 1);
    assert.equal(three.hand.filter((x) => x.rank === 7).length, 1);
    assert.equal(three.hand.length, 2);
    const four = takePairs([c(7, 'corazones'), c(7, 'picas'), c(7, 'treboles'), c(7, 'diamantes'), ace]);
    assert.equal(four.pairs.length, 2);
    assert.deepEqual(four.hand.map((x) => x.id), [CAGAO_CARD_ID], 'el A♠ nunca hace par');
  });
});

describe('El Cagao: fase inicial de pares', () => {
  const pairing = (hands: Card[][]) => makeState({ hands, phase: 'pairing' });
  const hands = () => [
    [c(7, 'corazones'), c(7, 'picas'), c(9, 'treboles'), c(9, 'picas'), c(9, 'diamantes'), c(2, 'picas')],
    [c(4, 'treboles'), c(5, 'treboles'), ace],
    [c(11, 'picas'), c(11, 'treboles'), c(13, 'picas')],
  ];

  it('se baja un par concreto y los demás pueden seguir bajando en cualquier orden', () => {
    const state = pairing(hands());
    const next = play(state, 0, { type: 'pair', cardIds: ['corazones-7', 'picas-7'] });
    assert.equal(next.phase, 'pairing', 'faltan pares por bajar (los 9 y los J)');
    assert.deepEqual(ids(next.hands[0]), ['diamantes-9', 'picas-2', 'picas-9', 'treboles-9']);
    assert.equal(next.pairs.length, 1);
    assert.equal(next.pairs[0].seat, 0);
    // Los turnos no cuentan en esta fase: el jugador 2 baja su par antes que el 0 termine.
    const later = play(next, 2, { type: 'pair', cardIds: ['picas-11', 'treboles-11'] });
    assert.equal(later.pairs.length, 2);
  });

  it('no deja bajar cartas que no son un par ni cartas que no son tuyas', () => {
    const state = pairing(hands());
    assert.match(rejected(state, 0, { type: 'pair', cardIds: ['corazones-7', 'treboles-9'] }), /mismo número/i);
    assert.match(rejected(state, 0, { type: 'pair', cardIds: ['corazones-7', 'corazones-7'] }), /mano/i);
    assert.match(rejected(state, 0, { type: 'pair', cardIds: ['corazones-7', 'treboles-11'] }), /mano/i);
    assert.match(rejected(state, 1, { type: 'pairAll' }), /no tienes pares/i);
  });

  it('con tres cartas iguales solo baja un par; "bajar todos" baja cada par que haya', () => {
    const next = play(pairing(hands()), 0, { type: 'pairAll' });
    assert.equal(next.hands[0].length, 2);
    assert.equal(next.hands[0].filter((x) => x.rank === 9).length, 1, 'de tres 9 queda uno');
    assert.equal(next.pairs.length, 2);
  });

  it('cuando todos terminan de bajar pares empieza el robo por turnos', () => {
    let state = pairing(hands());
    state = play(state, 0, { type: 'pairAll' });
    state = play(state, 2, { type: 'pairAll' });
    assert.equal(state.phase, 'playing');
    assert.equal(state.turn, 0, 'empieza el que sigue al que reparte (el asiento 2)');
    assert.deepEqual(state.finishOrder, []);
  });

  it('no se roba hasta que todos bajen sus pares, ni se bajan pares a mano ya jugando', () => {
    assert.match(rejected(pairing(hands()), 0, { type: 'draw', index: 0 }), /pares/i);
    const playing = makeState({ hands: [[c(7, 'corazones')], [c(4, 'treboles'), ace]] });
    assert.match(rejected(playing, 0, { type: 'pairAll' }), /solos/i);
  });

  it('quien se queda sin cartas al bajar sus pares sale antes de empezar', () => {
    const state = pairing([
      [c(7, 'corazones'), c(7, 'picas')],
      [c(4, 'treboles'), c(9, 'picas'), ace],
      [c(5, 'picas'), c(6, 'picas'), c(8, 'picas')],
    ]);
    const next = play(state, 0, { type: 'pairAll' });
    assert.equal(next.phase, 'playing');
    assert.deepEqual(next.finishOrder, [0]);
    assert.notEqual(next.turn, 0);
  });

  it('si solo queda un jugador con cartas al terminar la fase, la partida acaba al instante', () => {
    const state = pairing([
      [c(7, 'corazones'), c(7, 'picas')],
      [c(4, 'treboles'), c(4, 'picas'), ace],
    ]);
    let next = play(state, 0, { type: 'pairAll' });
    assert.equal(next.phase, 'pairing');
    next = play(next, 1, { type: 'pairAll' });
    assert.equal(next.phase, 'gameOver');
    assert.equal(next.loserSeat, 1);
  });

  it('el botón "bajar todos" de los bots resuelve la fase sin dejar pares', () => {
    const state = settle(createCagaoGame(players(4), 3));
    for (const hand of state.hands) assert.ok(!hasPair(hand));
  });
});

describe('El Cagao: robar a ciegas', () => {
  it('si la carta robada hace par con una de tu mano, se bajan las dos', () => {
    const state = makeState({
      hands: [[c(7, 'corazones'), c(13, 'picas')], [c(7, 'treboles'), c(2, 'diamantes')], [c(5, 'picas'), ace]],
    });
    assert.equal(drawFromSeat(state), 1);
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.deepEqual(next.hands[0].map((x) => x.id), ['picas-13']);
    assert.deepEqual(next.hands[1].map((x) => x.id), ['diamantes-2']);
    assert.equal(next.pairs.length, 1);
    assert.equal(next.pairs[0].seat, 0);
    assert.deepEqual(ids(next.pairs[0].cards), ['corazones-7', 'treboles-7']);
    assert.deepEqual(ids(next.lastEvent!.pair!), ['corazones-7', 'treboles-7']);
    assert.equal(next.lastEvent!.cagao, false);
    assert.equal(next.turn, 1, 'sigue el que acaba de ser robado');
  });

  it('si no hace par, la carta pasa a tu mano', () => {
    const state = makeState({
      hands: [[c(7, 'corazones'), c(13, 'picas')], [c(4, 'treboles'), c(2, 'diamantes')], [c(5, 'picas'), ace]],
    });
    const next = play(state, 0, { type: 'draw', index: 1 });
    assert.deepEqual(ids(next.hands[0]), ['corazones-7', 'diamantes-2', 'picas-13']);
    assert.deepEqual(next.hands[1].map((x) => x.id), ['treboles-4']);
    assert.equal(next.lastEvent!.pair, null);
    assert.equal(next.lastEvent!.drawnCardId, 'diamantes-2');
  });

  it('robar el A♠ se anuncia y la carta se queda en tu mano', () => {
    const state = makeState({ hands: [[c(7, 'corazones'), c(13, 'picas')], [ace, c(2, 'diamantes')], [c(5, 'picas'), c(5, 'treboles')]] });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.equal(next.lastEvent!.cagao, true);
    assert.ok(next.hands[0].some((x) => x.id === CAGAO_CARD_ID));
  });

  it('solo roba quien tiene el turno, y la carta tiene que existir', () => {
    const state = makeState({ hands: [[c(7, 'corazones')], [c(4, 'treboles'), ace]] });
    assert.match(rejected(state, 1, { type: 'draw', index: 0 }), /turno/i);
    assert.match(rejected(state, 0, { type: 'draw', index: 2 }), /no existe/i);
    assert.match(rejected(state, 0, { type: 'draw', index: -1 }), /no existe/i);
    assert.match(rejected(state, 0, { type: 'draw', index: 0.5 }), /no existe/i);
  });

  it('la mano del siguiente rival se baraja sin perder ni cambiar cartas', () => {
    const hand = [c(2, 'picas'), c(3, 'picas'), c(4, 'picas'), c(5, 'picas'), c(6, 'picas'), c(8, 'picas')];
    const state = makeState({ hands: [[c(7, 'corazones'), c(13, 'picas'), c(9, 'picas')], [c(10, 'treboles'), c(11, 'treboles'), ace], hand] });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.equal(next.turn, 1);
    assert.deepEqual(ids(next.hands[2]), ids(hand));
  });
});

describe('El Cagao: salir y perder', () => {
  it('quien se queda sin cartas se salva y ya no roba ni le roban', () => {
    const state = makeState({
      hands: [[c(7, 'corazones')], [c(7, 'treboles'), c(2, 'diamantes')], [c(5, 'picas'), ace]],
    });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.equal(next.hands[0].length, 0);
    assert.deepEqual(next.finishOrder, [0]);
    assert.deepEqual(next.lastEvent!.outSeats, [0]);
    assert.equal(next.phase, 'playing');
    assert.equal(next.turn, 1);
    // El jugador 2 le roba al 1; el 0 ya no cuenta, y al revés: el 1 roba al 2 (salta al 0).
    assert.equal(drawFromSeat(next), 2);
    const after = play(next, 1, { type: 'draw', index: 0 });
    assert.equal(after.turn, 2);
    assert.equal(drawFromSeat(after), 1);
  });

  it('también se salva a quien le roban su última carta', () => {
    const state = makeState({
      hands: [[c(7, 'corazones'), c(9, 'picas')], [c(4, 'treboles')], [c(5, 'picas'), ace]],
    });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.deepEqual(next.hands[1], []);
    assert.deepEqual(next.finishOrder, [1]);
    assert.equal(next.turn, 2, 'se salta al que acaba de salir');
  });

  it('dos jugadores pueden salvarse en la misma jugada', () => {
    const state = makeState({
      hands: [[c(7, 'corazones')], [c(7, 'treboles')], [c(5, 'picas'), ace]],
    });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.deepEqual(next.finishOrder, [0, 1]);
    assert.equal(next.phase, 'gameOver', 'solo queda uno con cartas');
    assert.equal(next.loserSeat, 2);
  });

  it('cuando solo queda un jugador con cartas, tiene el A♠ y pierde', () => {
    const state = makeState({ hands: [[c(7, 'corazones')], [c(7, 'treboles'), ace]] });
    const next = play(state, 0, { type: 'draw', index: 0 });
    assert.equal(next.phase, 'gameOver');
    assert.equal(next.loserSeat, 1);
    assert.deepEqual(next.hands[1].map((x) => x.id), [CAGAO_CARD_ID]);
    assert.deepEqual(next.finishOrder, [0]);
    assert.match(rejected(next, 1, { type: 'draw', index: 0 }), /terminó/i);
  });

  it('no modifica el estado original (motor puro)', () => {
    const state = makeState({ hands: [[c(7, 'corazones')], [c(7, 'treboles'), ace]] });
    const snapshot = JSON.stringify(state);
    play(state, 0, { type: 'draw', index: 0 });
    assert.equal(JSON.stringify(state), snapshot);
  });
});

describe('El Cagao: lo que ve cada jugador', () => {
  const live = () =>
    makeState({
      hands: [[c(7, 'corazones'), c(13, 'picas')], [c(4, 'treboles'), c(2, 'diamantes')], [c(5, 'picas'), ace]],
    });

  it('solo ves tu mano; la de los demás son cartas ocultas', () => {
    const view = projectState(live(), 0);
    if (view.game !== 'cagao') throw new Error('juego inesperado');
    assert.deepEqual(view.hands[0].map((x) => x.id), ['corazones-7', 'picas-13']);
    assert.ok(view.hands[1].every((x) => x.id.startsWith('hidden-')));
    assert.equal(view.hands[1].length, 2);
    assert.ok(!JSON.stringify(view).includes('"picas-1"'), 'el A♠ del rival no se ve');
  });

  it('la carta que robas solo la ves tú, salvo que sea El Cagao o forme un par', () => {
    const next = play(live(), 0, { type: 'draw', index: 1 });
    const mine = projectState(next, 0);
    const other = projectState(next, 2);
    if (mine.game !== 'cagao' || other.game !== 'cagao') throw new Error('juego inesperado');
    assert.equal(mine.lastEvent!.drawnCardId, 'diamantes-2');
    assert.equal(other.lastEvent!.drawnCardId, null);
    assert.ok(!JSON.stringify(other).includes('"diamantes-2"'));

    const stolen = play(
      makeState({ hands: [[c(7, 'corazones'), c(13, 'picas')], [ace, c(2, 'diamantes')], [c(5, 'picas'), c(5, 'treboles')]] }),
      0,
      { type: 'draw', index: 0 },
    );
    const seenByOther = projectState(stolen, 2);
    if (seenByOther.game !== 'cagao') throw new Error('juego inesperado');
    assert.equal(seenByOther.lastEvent!.drawnCardId, CAGAO_CARD_ID);
  });

  it('el par que se baja es público', () => {
    const next = play(
      makeState({ hands: [[c(7, 'corazones'), c(13, 'picas')], [c(7, 'treboles'), ace], [c(5, 'picas'), c(5, 'treboles')]] }),
      0,
      { type: 'draw', index: 0 },
    );
    const view = projectState(next, 2);
    if (view.game !== 'cagao') throw new Error('juego inesperado');
    assert.deepEqual(ids(view.lastEvent!.pair!), ['corazones-7', 'treboles-7']);
    assert.equal(view.pairs.length, 1);
  });

  it('al terminar se ve la mano de quien quedó con El Cagao', () => {
    const ended = play(makeState({ hands: [[c(7, 'corazones')], [c(7, 'treboles'), ace]] }), 0, { type: 'draw', index: 0 });
    const view = projectState(ended, 0);
    if (view.game !== 'cagao') throw new Error('juego inesperado');
    assert.deepEqual(view.hands[1].map((x) => x.id), [CAGAO_CARD_ID]);
  });
});

describe('El Cagao: el bot', () => {
  it('elige una carta que existe en la mano oculta del rival', () => {
    const state = makeState({ hands: [[c(7, 'corazones')], [c(4, 'treboles'), c(2, 'diamantes'), ace]] });
    for (let i = 0; i < 40; i++) {
      const move = chooseCagaoMove(state);
      assert.equal(move.type, 'draw');
      assert.ok(move.index >= 0 && move.index < 3);
      assert.ok('state' in applyCagaoMove(state, 0, move));
    }
  });

  it('en una partida completa conserva las 49 cartas y siempre termina con el A♠ en la última mano', () => {
    for (let g = 0; g < 10; g++) {
      let state = settle(createCagaoGame(players(2 + (g % 5))));
      let guard = 0;
      while (state.phase === 'playing') {
        assert.ok(++guard < 1000);
        const res = applyCagaoMove(state, state.turn, chooseCagaoMove(state));
        assert.ok('state' in res, 'error' in res ? res.error : '');
        state = res.state;
        assert.equal(state.hands.flat().length + state.pairs.length * 2, 49);
      }
      assert.equal(state.hands.flat().length, 1);
      assert.equal(state.hands.flat()[0].id, CAGAO_CARD_ID);
      assert.equal(state.finishOrder.length, state.players.length - 1);
    }
  });
});
