import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { americanDeck, type Card } from '../src/games/cards';
import {
  applyCasinoMove,
  CASINO_TARGET,
  type CasinoState,
  closingNeeds,
  createCasinoGame,
  decideWinner,
  scoreRound,
} from '../src/games/casino';
import { casinoBotMove } from '../src/games/casinoBot';
import type { Player } from '../src/games/shared';

const deck = americanDeck();
const byId = (id: string): Card => {
  const card = deck.find((c) => c.id === id);
  if (!card) throw new Error(`carta desconocida ${id}`);
  return card;
};
const spades = deck.filter((c) => c.suit === 'picas');
const nonSpades = deck.filter((c) => c.suit !== 'picas');

/** Pila de un equipo con `total` cartas: primero las picas pedidas, luego cartas sin puntos especiales. */
function pile(spadeCount: number, total: number): Card[] {
  const plain = nonSpades.filter((c) => c.rank !== 1 && !(c.suit === 'diamantes' && c.rank === 10));
  const chosen = [...spades.filter((c) => c.rank !== 1 && c.rank !== 2).slice(0, spadeCount)];
  return [...chosen, ...plain.slice(0, total - chosen.length)];
}

describe('closingNeeds (regla de cierre obligatorio)', () => {
  it('no aplica por debajo de 17 ni al llegar a 21', () => {
    assert.equal(closingNeeds(0), null);
    assert.equal(closingNeeds(16), null);
    assert.equal(closingNeeds(CASINO_TARGET), null);
  });
  it('con 17 hacen falta las dos mayorías', () => {
    assert.deepEqual(closingNeeds(17), { cards: true, spades: true });
  });
  it('con 18 falta la mayoría de cartas (solo había hecho picas)', () => {
    assert.deepEqual(closingNeeds(18), { cards: true, spades: false });
  });
  it('con 19 y 20 falta la mayoría de picas', () => {
    assert.deepEqual(closingNeeds(19), { cards: false, spades: true });
    assert.deepEqual(closingNeeds(20), { cards: false, spades: true });
  });
});

describe('scoreRound con cierre obligatorio', () => {
  it('puntuación normal por debajo de 17: cuentan ases, Gran Casino, Dueño y viraos', () => {
    const mine = [byId('corazones-1'), byId('diamantes-10'), byId('picas-2')];
    const { totals } = scoreRound([mine, []], [2, 0], [10, 10]);
    assert.equal(totals[0], 1 /* as */ + 2 /* gran casino */ + 1 /* dueño */ + 2 /* viraos */);
  });

  it('con 17 los extras no suman y se muestran como "no cuenta"', () => {
    const mine = [byId('corazones-1'), byId('diamantes-10'), byId('picas-2')];
    const { totals, lines } = scoreRound([mine, []], [3, 0], [17, 0]);
    assert.equal(totals[0], 0);
    assert.ok(lines[0].length > 0 && lines[0].every((line) => line.muted && line.points === 0));
  });

  it('con 17, mayoría de cartas y de picas suman 4 y llegan a 21', () => {
    const mine = pile(8, 30);
    const { totals } = scoreRound([mine, []], [0, 0], [17, 5]);
    assert.equal(totals[0], 4);
    assert.equal(17 + totals[0], CASINO_TARGET);
  });

  it('ejemplo del reglamento: 17 + solo mayoría de cartas = 20; luego hacen falta las picas', () => {
    const cardsOnly = pile(3, 30);
    const first = scoreRound([cardsOnly, []], [0, 0], [17, 0]);
    assert.equal(first.totals[0], 3);
    assert.equal(17 + first.totals[0], 20);

    // Ya con 20, otra mayoría de cartas no suma (pasaría de 21); las picas sí.
    const again = scoreRound([cardsOnly, []], [0, 0], [20, 0]);
    assert.equal(again.totals[0], 0);
    const withSpades = scoreRound([pile(8, 30), []], [0, 0], [20, 0]);
    assert.equal(withSpades.totals[0], 1);
    assert.equal(20 + withSpades.totals[0], CASINO_TARGET);
  });

  it('ejemplo inverso: 17 + solo mayoría de picas = 18; luego hacen falta las cartas', () => {
    const spadesOnly = pile(8, 12);
    const first = scoreRound([spadesOnly, []], [0, 0], [17, 0]);
    assert.equal(first.totals[0], 1);
    assert.equal(17 + first.totals[0], 18);

    const again = scoreRound([spadesOnly, []], [0, 0], [18, 0]);
    assert.equal(again.totals[0], 0);
    const withCards = scoreRound([pile(3, 30), []], [0, 0], [18, 0]);
    assert.equal(withCards.totals[0], 3);
    assert.equal(18 + withCards.totals[0], CASINO_TARGET);
  });

  it('cada equipo se evalúa con su propio estado de cierre', () => {
    const a = pile(0, 30);
    const b = [byId('corazones-1'), byId('diamantes-10')];
    const { totals } = scoreRound([a, b], [0, 0], [10, 17]);
    assert.equal(totals[0], 3);
    assert.equal(totals[1], 0); // en cierre: ni as ni 10 de diamantes
  });
});

describe('decideWinner', () => {
  it('nadie llega a 21', () => assert.equal(decideWinner([20, 5], [3, 0]), null));
  it('gana quien llega a 21', () => assert.equal(decideWinner([21, 19], [4, 1]), 0));
  it('si ambos llegan, gana el de más puntos', () => assert.equal(decideWinner([21, 23], [4, 6]), 1));
  it('a igualdad total, gana quien más sumó en la ronda', () => assert.equal(decideWinner([21, 21], [1, 3]), 1));
});

function players(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({ id: `bot-${i}`, name: `B${i}` }));
}

function playFullGame(seats: number): CasinoState[] {
  const ps = players(seats);
  let state = createCasinoGame(ps, 0);
  const rounds: CasinoState[] = [];
  let guard = 0;
  while (state.phase !== 'gameOver') {
    if (++guard > 5000) throw new Error('partida sin fin');
    if (state.phase === 'roundEnd') {
      const dealer = (state.dealer + 1) % seats;
      const res = applyCasinoMove(state, dealer, { type: 'nextRound' });
      assert.ok('state' in res, 'nextRound debe ser válido');
      state = res.state;
      continue;
    }
    const res = casinoBotMove(state);
    assert.ok('state' in res, `el bot jugó una jugada inválida: ${'error' in res ? res.error : ''}`);
    const before = state;
    state = res.state;
    if (state.phase !== 'playing') rounds.push(before, state);
  }
  return rounds;
}

describe('partidas completas con el bot', () => {
  for (const seats of [2, 4]) {
    it(`${seats} jugadores: siempre termina con jugadas válidas y respeta el cierre`, () => {
      for (let g = 0; g < (seats === 2 ? 40 : 10); g++) {
        let prevScores: [number, number] = [0, 0];
        const ps = players(seats);
        let state = createCasinoGame(ps, 0);
        let guard = 0;
        while (state.phase !== 'gameOver') {
          if (++guard > 5000) throw new Error('partida sin fin');
          if (state.phase === 'roundEnd') {
            const res = applyCasinoMove(state, (state.dealer + 1) % seats, { type: 'nextRound' });
            assert.ok('state' in res);
            state = res.state;
            continue;
          }
          const res = casinoBotMove(state);
          assert.ok('state' in res, 'error' in res ? res.error : '');
          const next = res.state;
          if (next.phase !== 'playing') {
            for (const team of [0, 1] as const) {
              const needs = closingNeeds(prevScores[team]);
              if (needs) {
                // En cierre solo se puede sumar lo que falta, nunca pasarse de 21 con extras.
                assert.ok(next.scores[team] <= CASINO_TARGET, `equipo ${team} pasó de 21 en cierre`);
                assert.ok(next.summary?.totals[team] === next.scores[team] - prevScores[team]);
              }
            }
            prevScores = next.scores;
          }
          state = next;
        }
        assert.ok(state.winnerTeam === 0 || state.winnerTeam === 1);
        assert.ok(state.scores[state.winnerTeam as number] >= CASINO_TARGET);
      }
    });
  }

  it('las simulaciones llegan a rondas con cierre obligatorio activo', () => {
    let closingSeen = 0;
    for (let g = 0; g < 80; g++) {
      const rounds = playFullGame(2);
      for (const s of rounds) if (s.summary?.needs?.some((n) => n !== null)) closingSeen++;
    }
    assert.ok(closingSeen > 0, 'ninguna simulación llegó al cierre obligatorio');
  });
});
