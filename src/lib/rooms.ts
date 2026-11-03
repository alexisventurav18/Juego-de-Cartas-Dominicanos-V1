import type { GameState } from '@/games';
import type { GameId, Player } from '@/games/shared';
import { getPlayerId, getPlayerKey } from './identity';
import { supabase } from './supabase';

export type RoomStatus = 'waiting' | 'playing';

/** Sala tal como la ve este jugador: `state` trae su mano y, de los demás, solo cuántas cartas tienen. */
export interface RoomRow {
  id: string;
  code: string;
  game: GameId;
  status: RoomStatus;
  players: Player[];
  state: GameState | null;
  version: number;
}

export type RoomConnectionStatus = 'connecting' | 'connected' | 'offline';

const FUNCTION_NAME = 'rooms';
const SERVER_UNREACHABLE =
  'No se pudo contactar con el servidor de partidas. Revisa tu conexión e inténtalo de nuevo.';

interface ServerResponse {
  ok: boolean;
  room?: RoomRow;
  error?: string;
}

/** Todas las operaciones pasan por la Edge Function: el navegador no lee ni escribe las partidas directamente. */
async function call(body: Record<string, unknown>): Promise<RoomRow> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { ...body, playerId: getPlayerId(), key: getPlayerKey() },
  });
  if (error) throw new Error(SERVER_UNREACHABLE);
  const response = data as ServerResponse | null;
  if (!response?.ok || !response.room) throw new Error(response?.error ?? 'Respuesta inesperada del servidor.');
  return response.room;
}

export function createRoom(game: GameId, player: Player): Promise<RoomRow> {
  return call({ action: 'create', game, name: player.name });
}

export function createSoloRoom(game: GameId, player: Player): Promise<RoomRow> {
  return call({ action: 'create', game, solo: true, name: player.name });
}

export function joinRoom(code: string, player: Player): Promise<RoomRow> {
  return call({ action: 'join', code, name: player.name });
}

export function fetchRoom(roomId: string): Promise<RoomRow> {
  return call({ action: 'view', roomId });
}

/** Empieza (o repite) la partida. `dealer` solo se usa en Casino contra bots, tras el sorteo en pantalla. */
export function requestStart(roomId: string, dealer?: number): Promise<RoomRow> {
  return call({ action: 'start', roomId, dealer });
}

export function sendMove(roomId: string, move: unknown): Promise<RoomRow> {
  return call({ action: 'move', roomId, move });
}

/** Pide al servidor una jugada automática de los bots (solo si la versión sigue siendo la que ve el cliente). */
export function botTick(roomId: string, expectedVersion: number): Promise<RoomRow> {
  return call({ action: 'tick', roomId, expectedVersion });
}

/**
 * Avisa cuando la sala cambia. La sala pública no contiene cartas, así que el aviso solo trae la versión;
 * quien lo recibe pide su vista actualizada al servidor.
 */
export function subscribeToRoom(
  roomId: string,
  onVersion: (version: number) => void,
  onStatus?: (status: RoomConnectionStatus) => void,
): () => void {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onVersion((payload.new as { version: number }).version),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onStatus?.('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus?.('offline');
      else onStatus?.('connecting');
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
