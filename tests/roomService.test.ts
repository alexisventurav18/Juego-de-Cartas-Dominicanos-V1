import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseCasinoMove } from '../src/games/casinoBot';
import { chooseCagaoMove, hasPair } from '../src/games/cagao';
import { chooseTresYDosMove } from '../src/games/tresYDos';
import {
  handleRequest,
  makeRoomCode,
  type RoomPatch,
  type RoomRecord,
  type RoomRequest,
  type RoomResponse,
  type RoomStore,
  type RoomView,
  type StoredRoom,
} from '../src/games/roomService';
import type { GameState } from '../src/games';

class MemoryStore implements RoomStore {
  rooms = new Map<string, StoredRoom>();
  failNextUpdate = false;
  private seq = 0;

  async findById(id: string) {
    return this.rooms.get(id) ?? null;
  }
  async findByCode(code: string) {
    return [...this.rooms.values()].find((r) => r.room.code === code) ?? null;
  }
  async create(room: Pick<RoomRecord, 'game' | 'status' | 'players'>, secret: StoredRoom['secret']) {
    const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`;
    const stored: StoredRoom = { room: { ...room, id, code: makeRoomCode(), version: 0 }, secret };
    this.rooms.set(id, stored);
    return stored;
  }
  async update(roomId: string, expectedVersion: number, patch: RoomPatch) {
    const stored = this.rooms.get(roomId);
    if (this.failNextUpdate) {
      this.failNextUpdate = false;
      return false;
    }
    if (!stored || stored.room.version !== expectedVersion) return false;
    stored.room = { ...stored.room, status: patch.status, players: patch.players, version: expectedVersion + 1 };
    stored.secret = { state: patch.state, keys: patch.keys };
    return true;
  }
  fullState(roomId: string): GameState {
    const state = this.rooms.get(roomId)?.secret.state;
    if (!state) throw new Error('sin estado');
    return state;
  }
}

const KEY_A = 'clave-secreta-de-ana-0123456789';
const KEY_B = 'clave-secreta-de-beto-012345678';
const A = { playerId: 'jugador-ana-0001', key: KEY_A };
const B = { playerId: 'jugador-beto-0002', key: KEY_B };

async function ok(store: RoomStore, req: RoomRequest): Promise<RoomView> {
  const res = await handleRequest(store, req);
  assert.ok(res.ok, res.ok ? '' : res.error);
  return res.room;
}
async function fail(store: RoomStore, req: unknown): Promise<string> {
  const res: RoomResponse = await handleRequest(store, req);
  assert.ok(!res.ok, 'se esperaba un error');
  return res.ok ? '' : res.error;
}

const C = { playerId: 'jugador-carla-0003', key: 'clave-secreta-de-carla-01234567' };

/** Sala con Ana y Beto (y Carla si el juego necesita tres). */
async function twoPlayerRoom(game: 'casino' | 'tresydos' | 'cagao', store: MemoryStore) {
  const created = await ok(store, { action: 'create', game, name: 'Ana', ...A });
  await ok(store, { action: 'join', code: created.code, name: 'Beto', ...B });
  const started = await ok(store, { action: 'start', roomId: created.id, ...A });
  return { id: created.id, code: created.code, started };
}

function cardIds(state: GameState, seat: number): string[] {
  return state.hands[seat].map((c) => c.id);
}

describe('servidor de salas: privacidad', () => {
  for (const game of ['casino', 'tresydos', 'cagao'] as const) {
    it(`${game}: cada jugador ve su mano y solo la cantidad de cartas de los demás`, async () => {
      const store = new MemoryStore();
      const { id } = await twoPlayerRoom(game, store);
      const full = store.fullState(id);
      const viewA = await ok(store, { action: 'view', roomId: id, ...A });
      const viewB = await ok(store, { action: 'view', roomId: id, ...B });
      assert.ok(viewA.state && viewB.state);

      assert.deepEqual(cardIds(viewA.state, 0), cardIds(full, 0));
      assert.deepEqual(cardIds(viewB.state, 1), cardIds(full, 1));
      assert.equal(viewA.state.hands[1].length, full.hands[1].length);

      const jsonA = JSON.stringify(viewA);
      const jsonB = JSON.stringify(viewB);
      for (const real of cardIds(full, 1)) assert.ok(!jsonA.includes(`"${real}"`), `A ve la carta ${real} de B`);
      for (const real of cardIds(full, 0)) assert.ok(!jsonB.includes(`"${real}"`), `B ve la carta ${real} de A`);
      // El orden del mazo es secreto: ninguna carta del mazo aparece en la vista (salvo que esté en tu mano).
      if ('deck' in full) {
        const mine = new Set(cardIds(full, 0));
        for (const c of full.deck) {
          if (!mine.has(c.id)) assert.ok(!jsonA.includes(`"${c.id}"`), `A ve la carta ${c.id} del mazo`);
        }
      }
    });
  }

  it('nunca expone claves ni hashes', async () => {
    const store = new MemoryStore();
    const { id } = await twoPlayerRoom('casino', store);
    const view = JSON.stringify(await ok(store, { action: 'view', roomId: id, ...A }));
    const hashes = Object.values(store.rooms.get(id)!.secret.keys);
    assert.equal(hashes.length, 2);
    for (const h of hashes) assert.ok(!view.includes(h));
    assert.ok(!view.includes(KEY_A) && !view.includes(KEY_B));
  });

  it('el estado guardado en el servidor sí está completo', async () => {
    const store = new MemoryStore();
    const { id } = await twoPlayerRoom('casino', store);
    const full = store.fullState(id);
    assert.ok(full.hands.every((h) => h.every((c) => !c.id.startsWith('hidden-'))));
  });
});

describe('servidor de salas: autenticación', () => {
  it('rechaza una clave equivocada o un jugador ajeno', async () => {
    const store = new MemoryStore();
    const { id } = await twoPlayerRoom('casino', store);
    assert.match(await fail(store, { action: 'view', roomId: id, playerId: A.playerId, key: KEY_B }), /No estás/);
    assert.match(
      await fail(store, { action: 'view', roomId: id, playerId: 'intruso-12345678', key: 'otra-clave-cualquiera-123456' }),
      /No estás/,
    );
  });

  it('no deja entrar a una partida empezada ni suplantar por código', async () => {
    const store = new MemoryStore();
    const { id, code } = await twoPlayerRoom('casino', store);
    const intruder = { playerId: 'intruso-12345678', key: 'otra-clave-cualquiera-123456' };
    assert.match(await fail(store, { action: 'join', code, name: 'Eve', ...intruder }), /ya empezó/);
    // Conocer el id público de Ana no basta sin su clave.
    assert.match(await fail(store, { action: 'join', code, name: 'Eve', playerId: A.playerId, key: intruder.key }), /No estás/);
    assert.match(await fail(store, { action: 'move', roomId: id, move: { type: 'nextRound' }, playerId: A.playerId, key: intruder.key }), /No estás/);
  });

  it('valida entradas', async () => {
    const store = new MemoryStore();
    assert.match(await fail(store, null), /no válida/);
    assert.match(await fail(store, { action: 'create', game: 'poker', name: 'Ana', ...A }), /Juego/);
    assert.match(await fail(store, { action: 'create', game: 'casino', name: '', ...A }), /nombre/);
    assert.match(await fail(store, { action: 'create', game: 'casino', name: 'Ana', playerId: 'bot-1-abcdefgh', key: KEY_A }), /Identificador/);
    assert.match(await fail(store, { action: 'create', game: 'casino', name: 'Ana', playerId: A.playerId, key: 'corta' }), /Clave/);
    assert.match(await fail(store, { action: 'view', roomId: 'no-es-uuid', ...A }), /no existe/);
    assert.match(await fail(store, { action: 'borrar', ...A }), /Acción/);
  });

  it('respeta el aforo y no duplica jugadores', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'casino', name: 'Ana', ...A });
    const again = await ok(store, { action: 'join', code: created.code, name: 'Ana', ...A });
    assert.equal(again.players.length, 1);
    for (let i = 0; i < 3; i++) {
      await ok(store, { action: 'join', code: created.code, name: `J${i}`, playerId: `jugador-extra-${i}000`, key: `${KEY_B}${i}` });
    }
    assert.match(
      await fail(store, { action: 'join', code: created.code, name: 'Sobra', playerId: 'jugador-extra-9000', key: `${KEY_B}9` }),
      /llena/,
    );
  });
});

describe('servidor de salas: jugadas', () => {
  it('solo mueve quien tiene el turno y el otro jugador ve el cambio sin ver la mano', async () => {
    const store = new MemoryStore();
    const { id } = await twoPlayerRoom('casino', store);
    const full = store.fullState(id);
    const turnSeat = full.turn;
    const mover = turnSeat === 0 ? A : B;
    const waiter = turnSeat === 0 ? B : A;
    const card = full.hands[turnSeat][0];

    assert.match(await fail(store, { action: 'move', roomId: id, move: { type: 'play', cardId: card.id, captureIds: [] }, ...waiter }), /turno/i);
    const forced = await handleRequest(store, { action: 'move', roomId: id, move: { type: 'play', cardId: card.id, captureIds: [] }, ...mover });
    // Puede ser válida o forzar captura según el reparto; en ambos casos nunca revela cartas ajenas.
    const json = JSON.stringify(forced);
    const other = full.hands[turnSeat === 0 ? 1 : 0].map((c) => c.id);
    for (const real of other) assert.ok(!json.includes(`"${real}"`));
  });

  it('una jugada mal formada no rompe nada', async () => {
    const store = new MemoryStore();
    const { id } = await twoPlayerRoom('casino', store);
    assert.match(await fail(store, { action: 'move', roomId: id, move: 'hola', ...A }), /no válida/i);
    assert.match(await fail(store, { action: 'move', roomId: id, move: { type: 'play' }, ...A }), /./);
  });

  it('un conflicto de versión se informa en vez de pisar la jugada', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'casino', name: 'Ana', ...A });
    await ok(store, { action: 'join', code: created.code, name: 'Beto', ...B });
    store.failNextUpdate = true;
    assert.match(await fail(store, { action: 'start', roomId: created.id, ...A }), /cambió/);
  });
});

describe('servidor de salas: solo contra bots', () => {
  it('una partida completa de Casino sin que el navegador vea las manos de los bots', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'casino', solo: true, name: 'Ana', ...A });
    assert.equal(created.players.length, 4);
    assert.equal(created.players.filter((player) => player.id.startsWith('bot-')).length, 3);
    assert.equal(new Set(created.players.slice(1).map((player) => player.name)).size, 3);
    let view = await ok(store, { action: 'start', roomId: created.id, dealer: 1, ...A });
    let guard = 0;
    while (view.state && view.state.phase !== 'gameOver') {
      assert.ok(++guard < 3000, 'partida sin fin');
      const state = view.state;
      const full = store.fullState(created.id);
      const json = JSON.stringify(view);
      for (const real of full.hands[1].map((c) => c.id)) assert.ok(!json.includes(`"${real}"`), 'se filtró la mano del bot');

      if (state.game !== 'casino') throw new Error('juego inesperado');
      const humanTurn = state.phase === 'playing' && state.turn === 0;
      const humanDeals = state.phase === 'roundEnd' && (state.dealer + 1) % created.players.length === 0;
      if (humanTurn) {
        // El humano de la prueba juega lo que elegiría el bot, pero pasando por el servidor.
        const move = chooseCasinoMove(full as Parameters<typeof chooseCasinoMove>[0]);
        assert.ok(move);
        view = await ok(store, { action: 'move', roomId: created.id, move, ...A });
      } else if (humanDeals) {
        view = await ok(store, { action: 'move', roomId: created.id, move: { type: 'nextRound' }, ...A });
      } else {
        view = await ok(store, { action: 'tick', roomId: created.id, expectedVersion: view.version, ...A });
      }
    }
    assert.equal(view.state?.phase, 'gameOver');
  });

  it('una partida completa de Tres y Dos con bots, sin ver las manos rivales mientras se juega', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'tresydos', solo: true, name: 'Ana', ...A });
    assert.equal(created.players.length, 3);
    let view = await ok(store, { action: 'start', roomId: created.id, ...A });
    let guard = 0;
    while (view.state && view.state.phase !== 'gameOver') {
      assert.ok(++guard < 6000, 'partida sin fin');
      const full = store.fullState(created.id);
      if (full.game !== 'tresydos') throw new Error('juego inesperado');
      const json = JSON.stringify(view);
      if (full.phase === 'playing') {
        // La carta que un bot tomó del Pozo la vio toda la mesa, así que es pública; las demás son secretas.
        const publicCard = full.drawnFrom === 'discard' ? full.drawnCardId : null;
        for (const seat of [1, 2]) {
          for (const real of full.hands[seat].map((c) => c.id)) {
            if (real !== publicCard) assert.ok(!json.includes(`"${real}"`), 'se filtró la mano del bot');
          }
        }
        for (const c of full.deck) assert.ok(!json.includes(`"${c.id}"`), 'se filtró una carta del Monte');
      }
      const humanDeals = full.phase === 'roundEnd' && (full.dealer + 1) % created.players.length === 0;
      if (full.phase === 'playing' && full.turn === 0) {
        view = await ok(store, { action: 'move', roomId: created.id, move: chooseTresYDosMove(full), ...A });
      } else if (humanDeals) {
        view = await ok(store, { action: 'move', roomId: created.id, move: { type: 'nextRound' }, ...A });
      } else {
        view = await ok(store, { action: 'tick', roomId: created.id, expectedVersion: view.version, ...A });
      }
    }
    assert.equal(view.state?.phase, 'gameOver');
  });

  it('una partida completa de El Cagao con bots, sin ver las manos rivales', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'cagao', solo: true, name: 'Ana', ...A });
    assert.equal(created.players.length, 4);
    let view = await ok(store, { action: 'start', roomId: created.id, ...A });
    let guard = 0;
    while (view.state && view.state.phase !== 'gameOver') {
      assert.ok(++guard < 1000, 'partida sin fin');
      const full = store.fullState(created.id);
      if (full.game !== 'cagao') throw new Error('juego inesperado');
      const json = JSON.stringify(view);
      // Solo es público El Cagao (A♠) cuando alguien lo roba; el resto de cartas ajenas es secreto.
      const publicId = full.lastEvent?.cagao ? full.lastEvent.drawnCardId : null;
      for (const seat of [1, 2, 3]) {
        for (const real of full.hands[seat].map((c) => c.id)) {
          if (real !== publicId) assert.ok(!json.includes(`"${real}"`), 'se filtró la mano de un bot');
        }
      }
      if (full.phase === 'pairing' && hasPair(full.hands[0])) {
        view = await ok(store, { action: 'move', roomId: created.id, move: { type: 'pairAll' }, ...A });
      } else if (full.phase === 'playing' && full.turn === 0) {
        view = await ok(store, { action: 'move', roomId: created.id, move: chooseCagaoMove(full), ...A });
      } else {
        view = await ok(store, { action: 'tick', roomId: created.id, expectedVersion: view.version, ...A });
      }
    }
    assert.equal(view.state?.phase, 'gameOver');
  });

  it('tick con versión vieja no mueve dos veces', async () => {
    const store = new MemoryStore();
    const created = await ok(store, { action: 'create', game: 'tresydos', solo: true, name: 'Ana', ...A });
    let view = await ok(store, { action: 'start', roomId: created.id, ...A });
    // Avanza hasta que le toque a un bot.
    while (view.state && view.state.players[view.state.turn].id === A.playerId) {
      const full = store.fullState(created.id);
      if (full.game !== 'tresydos') throw new Error('juego inesperado');
      view = await ok(store, { action: 'move', roomId: created.id, move: chooseTresYDosMove(full), ...A });
    }
    const stale = view.version - 1;
    const stillSame = await ok(store, { action: 'tick', roomId: created.id, expectedVersion: stale, ...A });
    assert.equal(stillSame.version, view.version);
  });
});
