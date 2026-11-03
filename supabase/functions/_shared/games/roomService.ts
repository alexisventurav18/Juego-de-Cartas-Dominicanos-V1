import { botStep } from './bots.ts';
import { randomInt } from './cards.ts';
import { applyGameMove } from './engine.ts';
import { canStartGame, createGameState, createSoloPlayers, GAMES, type GameState, isGameFinished } from './index.ts';
import { type GameId, isBotPlayer, type Player } from './shared.ts';
import { projectState } from './view.ts';

/*
 * Lógica del servidor de salas. No sabe de Supabase: recibe un `RoomStore`, así se prueba en memoria
 * y la Edge Function solo aporta el almacenamiento real.
 *
 * Modelo de seguridad:
 *  - El estado completo (manos, mazo) vive solo en el servidor (tabla room_secrets).
 *  - Cada jugador se identifica con su id (público) y una clave secreta que solo guarda su navegador;
 *    el servidor guarda únicamente el hash de la clave.
 *  - Los navegadores nunca escriben en la base de datos: piden jugadas y reciben su vista (projectState).
 */

export type RoomStatus = 'waiting' | 'playing';

export interface RoomRecord {
  id: string;
  code: string;
  game: GameId;
  status: RoomStatus;
  players: Player[];
  version: number;
}

export interface SecretRecord {
  state: GameState | null;
  /** id de jugador -> hash SHA-256 de su clave. */
  keys: Record<string, string>;
}

export interface StoredRoom {
  room: RoomRecord;
  secret: SecretRecord;
}

export interface RoomPatch {
  status: RoomStatus;
  players: Player[];
  state: GameState | null;
  keys: Record<string, string>;
}

export interface RoomStore {
  findById(id: string): Promise<StoredRoom | null>;
  findByCode(code: string): Promise<StoredRoom | null>;
  create(room: Pick<RoomRecord, 'game' | 'status' | 'players'>, secret: SecretRecord): Promise<StoredRoom>;
  /** Actualiza solo si la versión guardada sigue siendo `expectedVersion`; devuelve false si cambió. */
  update(roomId: string, expectedVersion: number, patch: RoomPatch): Promise<boolean>;
}

interface Auth {
  playerId: string;
  key: string;
}

export type RoomRequest =
  | ({ action: 'create'; game: GameId; solo?: boolean; name: string } & Auth)
  | ({ action: 'join'; code: string; name: string } & Auth)
  | ({ action: 'view'; roomId: string } & Auth)
  | ({ action: 'start'; roomId: string; dealer?: number } & Auth)
  | ({ action: 'move'; roomId: string; move: unknown } & Auth)
  | ({ action: 'tick'; roomId: string; expectedVersion: number } & Auth);

export interface RoomView {
  id: string;
  code: string;
  game: GameId;
  status: RoomStatus;
  players: Player[];
  version: number;
  state: GameState | null;
}

export type RoomResponse = { ok: true; room: RoomView } | { ok: false; error: string };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_NAME_LENGTH = 24;
const JOIN_ATTEMPTS = 3;
const HOST_SEAT = 0;

const CONFLICT = 'La mesa cambió mientras jugabas. Revisa la jugada y vuelve a intentarlo.';

class RoomError extends Error {}

export function makeRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new RoomError('Solicitud no válida.');
  return raw as Record<string, unknown>;
}

function readAuth(req: Record<string, unknown>): Auth {
  const { playerId, key } = req;
  if (typeof playerId !== 'string' || !ID_PATTERN.test(playerId) || /^bot-/i.test(playerId)) {
    throw new RoomError('Identificador de jugador no válido.');
  }
  if (typeof key !== 'string' || !KEY_PATTERN.test(key)) throw new RoomError('Clave de jugador no válida.');
  return { playerId, key };
}

function readName(req: Record<string, unknown>): string {
  const name = typeof req.name === 'string' ? req.name.trim().replace(/\s+/g, ' ') : '';
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new RoomError(`El nombre debe tener entre 1 y ${MAX_NAME_LENGTH} caracteres.`);
  }
  return name;
}

function readRoomId(req: Record<string, unknown>): string {
  if (typeof req.roomId !== 'string' || !UUID_PATTERN.test(req.roomId)) throw new RoomError('Esta sala ya no existe.');
  return req.roomId;
}

function toView(stored: StoredRoom, seat: number): RoomView {
  const { room, secret } = stored;
  return {
    id: room.id,
    code: room.code,
    game: room.game,
    status: room.status,
    players: room.players,
    version: room.version,
    state: secret.state ? projectState(secret.state, seat) : null,
  };
}

/** Confirma que la clave corresponde al jugador y devuelve su asiento. */
async function authenticate(stored: StoredRoom, auth: Auth): Promise<number> {
  const seat = stored.room.players.findIndex((p) => p.id === auth.playerId);
  const expected = stored.secret.keys[auth.playerId];
  if (seat === -1 || !expected) throw new RoomError('No estás en esta sala.');
  if (!safeEqual(expected, await hashKey(auth.key))) throw new RoomError('No estás en esta sala.');
  return seat;
}

async function loadById(store: RoomStore, roomId: string): Promise<StoredRoom> {
  const stored = await store.findById(roomId);
  if (!stored) throw new RoomError('Esta sala ya no existe.');
  return stored;
}

async function commit(store: RoomStore, stored: StoredRoom, patch: Partial<RoomPatch>, seat: number): Promise<RoomResponse> {
  // Se copia todo antes de guardar: el almacén podría reutilizar el mismo objeto.
  const baseRoom = { ...stored.room };
  const next: RoomPatch = {
    status: patch.status ?? baseRoom.status,
    players: patch.players ?? baseRoom.players,
    state: patch.state === undefined ? stored.secret.state : patch.state,
    keys: patch.keys ?? stored.secret.keys,
  };
  const updated = await store.update(baseRoom.id, baseRoom.version, next);
  if (!updated) return { ok: false, error: CONFLICT };
  const room: RoomRecord = { ...baseRoom, status: next.status, players: next.players, version: baseRoom.version + 1 };
  return { ok: true, room: toView({ room, secret: { state: next.state, keys: next.keys } }, seat) };
}

async function create(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const name = readName(req);
  if (typeof req.game !== 'string' || !(req.game in GAMES)) throw new RoomError('Juego no válido.');
  const game = req.game as GameId;
  const human: Player = { id: auth.playerId, name };
  const players = req.solo === true ? createSoloPlayers(game, human) : [human];
  const stored = await store.create(
    { game, status: 'waiting', players },
    { state: null, keys: { [auth.playerId]: await hashKey(auth.key) } },
  );
  return { ok: true, room: toView(stored, 0) };
}

async function join(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const name = readName(req);
  const code = typeof req.code === 'string' ? req.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{3,12}$/.test(code)) throw new RoomError('No encontramos una sala con ese código.');

  for (let attempt = 0; attempt < JOIN_ATTEMPTS; attempt++) {
    const stored = await store.findByCode(code);
    if (!stored) throw new RoomError('No encontramos una sala con ese código.');
    const { room, secret } = stored;
    if (room.players.some((p) => p.id === auth.playerId)) {
      return { ok: true, room: toView(stored, await authenticate(stored, auth)) };
    }
    if (room.status !== 'waiting') throw new RoomError('Esa partida ya empezó.');
    if (room.players.length >= GAMES[room.game].maxPlayers) throw new RoomError('La sala está llena.');
    const players = [...room.players, { id: auth.playerId, name }];
    const keys = { ...secret.keys, [auth.playerId]: await hashKey(auth.key) };
    const result = await commit(store, stored, { players, keys }, players.length - 1);
    if (result.ok) return result;
  }
  throw new RoomError('La sala cambió mientras intentabas entrar. Inténtalo de nuevo.');
}

async function start(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const stored = await loadById(store, readRoomId(req));
  const seat = await authenticate(stored, auth);
  const { room, secret } = stored;
  if (seat !== HOST_SEAT) throw new RoomError('Solo quien creó la sala puede empezar la partida.');
  if (room.status === 'playing' && secret.state && !isGameFinished(secret.state)) {
    throw new RoomError('La partida ya está en curso.');
  }
  if (!canStartGame(room.game, room.players.length)) {
    throw new RoomError(`Este juego necesita ${GAMES[room.game].playerCountLabel.toLowerCase()}.`);
  }
  // Contra bots el sorteo de quién reparte se hace en la pantalla; entre personas lo decide el servidor.
  const dealer =
    room.game === 'casino' &&
    room.players.some(isBotPlayer) &&
    typeof req.dealer === 'number' &&
    Number.isInteger(req.dealer) &&
    req.dealer >= 0 &&
    req.dealer < room.players.length
      ? req.dealer
      : undefined;
  const state = createGameState(room.game, room.players, dealer);
  return commit(store, stored, { status: 'playing', state }, seat);
}

async function move(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const stored = await loadById(store, readRoomId(req));
  const seat = await authenticate(stored, auth);
  const state = stored.secret.state;
  if (stored.room.status !== 'playing' || !state) throw new RoomError('La partida todavía no empieza.');
  const result = applyGameMove(state, seat, req.move);
  if ('error' in result) throw new RoomError(result.error);
  return commit(store, stored, { state: result.state }, seat);
}

async function tick(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const stored = await loadById(store, readRoomId(req));
  const seat = await authenticate(stored, auth);
  const state = stored.secret.state;
  const unchanged: RoomResponse = { ok: true, room: toView(stored, seat) };
  if (!state || stored.room.status !== 'playing' || !stored.room.players.some(isBotPlayer)) return unchanged;
  // Si otro ya movió (la versión cambió), no se duplica el turno del bot.
  if (req.expectedVersion !== stored.room.version) return unchanged;
  const step = botStep(state);
  if (!step) return unchanged;
  if ('error' in step.result) throw new RoomError(step.result.error);
  return commit(store, stored, { state: step.result.state }, seat);
}

async function view(store: RoomStore, req: Record<string, unknown>): Promise<RoomResponse> {
  const auth = readAuth(req);
  const stored = await loadById(store, readRoomId(req));
  return { ok: true, room: toView(stored, await authenticate(stored, auth)) };
}

export async function handleRequest(store: RoomStore, raw: unknown): Promise<RoomResponse> {
  try {
    const req = asRecord(raw);
    switch (req.action) {
      case 'create':
        return await create(store, req);
      case 'join':
        return await join(store, req);
      case 'view':
        return await view(store, req);
      case 'start':
        return await start(store, req);
      case 'move':
        return await move(store, req);
      case 'tick':
        return await tick(store, req);
      default:
        throw new RoomError('Acción no válida.');
    }
  } catch (err) {
    if (err instanceof RoomError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: 'Error interno del servidor. Inténtalo de nuevo.' };
  }
}
