import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { botStep, cagaoBotMove, tresYDosBotMove } from '../src/games/bots';
import { americanDeck, americanDoubleDeck, shuffle } from '../src/games/cards';
import { type CagaoState, createCagaoGame } from '../src/games/cagao';
import { applyTresYDosMove, createTresYDosGame, type TresYDosState } from '../src/games/tresYDos';
import type { Player } from '../src/games/shared';

const players = (n: number): Player[] => Array.from({ length: n }, (_, i) => ({ id: `bot-${i}`, name: `B${i}` }));

describe('cartas', () => {
  it('la baraja americana tiene 52 cartas únicas y la doble 108', () => {
    assert.equal(new Set(americanDeck().map((c) => c.id)).size, 52);
    assert.equal(new Set(americanDoubleDeck().map((c) => c.id)).size, 108);
  });
  it('barajar conserva las cartas', () => {
    const shuffled = shuffle(americanDeck());
    assert.deepEqual(shuffled.map((c) => c.id).sort(), americanDeck().map((c) => c.id).sort());
  });
});

describe('Tres y Dos', () => {
  for (const n of [2, 3, 4]) {
    it(`${n} jugadores: el bot termina la partida con jugadas válidas`, () => {
      for (let g = 0; g < 8; g++) {
        let state: TresYDosState = createTresYDosGame(players(n));
        let guard = 0;
        while (state.phase !== 'gameOver') {
          assert.ok(++guard < 6000, 'partida sin fin');
          if (state.phase === 'roundEnd') {
            const res = applyTresYDosMove(state, (state.dealer + 1) % n, { type: 'nextRound' });
            assert.ok('state' in res, 'error' in res ? res.error : '');
            state = res.state;
            continue;
          }
          const res = tresYDosBotMove(state);
          assert.ok('state' in res, 'error' in res ? res.error : '');
          state = res.state;
        }
        assert.ok(state.winnerSeat !== null);
      }
    });
  }
  it('no deja botar antes de robar', () => {
    const state = createTresYDosGame(players(3));
    const seat = state.turn;
    assert.ok('error' in applyTresYDosMove(state, seat, { type: 'discard', cardId: state.hands[seat][0].id }));
  });
});

describe('El Cagao', () => {
  for (const n of [2, 3, 4, 6]) {
    it(`${n} jugadores: el bot termina la partida con jugadas válidas`, () => {
      for (let g = 0; g < 8; g++) {
        let state: CagaoState = createCagaoGame(players(n));
        let guard = 0;
        while (state.phase !== 'gameOver') {
          assert.ok(++guard < 1000, 'partida sin fin');
          // Fase inicial: los bots bajan sus pares solos, uno tras otro.
          const step = state.phase === 'pairing' ? botStep(state) : null;
          if (state.phase === 'pairing') {
            assert.ok(step, 'quedó la fase inicial atascada');
            assert.ok('state' in step.result, 'error' in step.result ? step.result.error : '');
            state = step.result.state as CagaoState;
            continue;
          }
          const res = cagaoBotMove(state);
          assert.ok('state' in res, 'error' in res ? res.error : '');
          state = res.state;
        }
        assert.ok(state.loserSeat !== null);
        assert.equal(state.hands[state.loserSeat!].length, 1);
        assert.equal(state.hands[state.loserSeat!][0].id, 'picas-1');
      }
    });
  }
});

describe('botStep', () => {
  it('no actúa si le toca a un humano', () => {
    const state = createTresYDosGame([{ id: 'humano', name: 'Yo' }, ...players(2)], 2);
    state.turn = 0;
    assert.equal(botStep(state), null);
  });
});
