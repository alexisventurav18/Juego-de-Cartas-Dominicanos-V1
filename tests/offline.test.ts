import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { botStep, botTickDelay } from '../src/games/bots';
import { applyGameMove } from '../src/games/engine';
import { createGameState, createSoloPlayers, GAMES, type GameState } from '../src/games';
import { chooseCagaoMove, seatsWithPairs } from '../src/games/cagao';
import { casinoBotMove } from '../src/games/casinoBot';
import { nextDealerSeat as casinoDealer } from '../src/games/casino';
import { chooseTresYDosMove, nextDealerSeat as tresYDosDealer } from '../src/games/tresYDos';
import { projectState } from '../src/games/view';
import type { GameId } from '../src/games/shared';

const HUMAN = 0;

/** Jugada del humano (asiento 0) con la misma política que usaría un bot; solo sirve para probar el flujo. */
function humanMove(state: GameState): unknown {
  if (state.game === 'tresydos') {
    return state.phase === 'roundEnd' ? { type: 'nextRound' } : chooseTresYDosMove(state);
  }
  if (state.game === 'cagao') return state.phase === 'pairing' ? { type: 'pairAll' } : chooseCagaoMove(state);
  if (state.phase === 'roundEnd') return { type: 'nextRound' };
  const result = casinoBotMove(state);
  assert.ok('state' in result, 'error' in result ? result.error : '');
  return null;
}

/** Repite lo que hace OfflineBotGame: los bots juegan solos y el humano mueve cuando le toca. */
function playOffline(game: GameId, playerCount: number): GameState {
  const players = createSoloPlayers(game, { id: 'local-human', name: 'Yo' }, playerCount);
  let state = createGameState(game, players);
  let guard = 0;
  while (state.phase !== 'gameOver') {
    assert.ok(++guard < 20000, `${game}: partida sin fin`);

    // La vista del humano nunca revela las cartas de los demás.
    const view = projectState(state, HUMAN);
    view.hands.forEach((hand, seat) => {
      if (seat !== HUMAN && state.phase !== 'gameOver' && state.phase !== 'roundEnd') {
        assert.ok(hand.every((card) => card.suit === 'comodin'), `${game}: la mano del asiento ${seat} se filtró`);
      }
    });

    if (botTickDelay(state) !== null) {
      const step = botStep(state);
      assert.ok(step && 'state' in step.result, step && 'error' in step.result ? step.result.error : 'sin jugada');
      state = step.result.state;
      continue;
    }

    // Le toca al humano (o a alguien que espera su acción).
    if (game === 'casino') {
      if (state.phase === 'roundEnd') {
        assert.equal(casinoDealer(state), HUMAN, 'el humano debía repartir');
        const res = applyGameMove(state, HUMAN, { type: 'nextRound' });
        assert.ok('state' in res);
        state = res.state;
      } else {
        assert.equal(state.turn, HUMAN);
        const res = casinoBotMove(state);
        assert.ok('state' in res, 'error' in res ? res.error : '');
        state = res.state;
      }
      continue;
    }
    const move = humanMove(state);
    const seat = state.phase === 'roundEnd' && state.game === 'tresydos' ? tresYDosDealer(state) : HUMAN;
    const res = applyGameMove(state, seat, move);
    assert.ok('state' in res, 'error' in res ? res.error : '');
    state = res.state;
  }
  return state;
}

describe('partida sin conexión contra bots', () => {
  for (const n of GAMES.tresydos.playerCounts) {
    it(`Tres y Dos con ${n - 1} bot(s) llega a un ganador`, () => {
      for (let i = 0; i < 4; i++) {
        const end = playOffline('tresydos', n);
        assert.equal(end.game, 'tresydos');
        if (end.game === 'tresydos') assert.ok(end.winnerSeat !== null);
      }
    });
  }

  for (const n of GAMES.cagao.playerCounts) {
    it(`El Cagao con ${n - 1} bot(s) termina con un perdedor`, () => {
      for (let i = 0; i < 4; i++) {
        const end = playOffline('cagao', n);
        if (end.game === 'cagao') {
          assert.ok(end.loserSeat !== null);
          assert.equal(end.hands[end.loserSeat].some((card) => card.id === 'picas-1'), true, 'pierde quien tiene el A♠');
        }
      }
    });
  }

  for (const n of [2, 4]) {
    it(`Casino con ${n} jugadores termina con un equipo ganador`, () => {
      const end = playOffline('casino', n);
      if (end.game === 'casino') assert.ok(end.winnerTeam !== null);
    });
  }

  it('El Cagao: los bots bajan sus pares iniciales sin que el humano haga nada', () => {
    const players = createSoloPlayers('cagao', { id: 'local-human', name: 'Yo' }, 4);
    let state = createGameState('cagao', players);
    let guard = 0;
    while (state.phase === 'pairing' && state.game === 'cagao') {
      const botsWithPairs = seatsWithPairs(state).filter((seat) => seat !== HUMAN);
      if (botsWithPairs.length === 0) break;
      assert.ok(++guard < 50);
      const step = botStep(state);
      assert.ok(step && 'state' in step.result);
      state = step.result.state;
    }
    if (state.game === 'cagao') {
      assert.deepEqual(seatsWithPairs(state).filter((seat) => seat !== HUMAN), []);
    }
  });
});
