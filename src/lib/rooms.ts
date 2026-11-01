import { createGameState, createSoloPlayers, GAMES, type GameState } from '@/games';
import type { GameId, Player } from '@/games/shared';
import { supabase } from './supabase';

export type RoomStatus = 'waiting' | 'playing';

export interface RoomRow {
  id: string;
  code: string;
  game: GameId;
  status: RoomStatus;
  players: Player[];
  state: GameState | null;
  version: number;
}

const ROOM_COLUMNS = 'id, code, game, status, players, state, version';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

interface NewRoom {
  game: GameId;
  status: RoomStatus;
  players: Player[];
  state: GameState | null;
}

async function insertRoom(room: NewRoom): Promise<RoomRow> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ code: makeCode(), ...room })
    .select(ROOM_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('No se pudo crear la sala.');
  return data as RoomRow;
}

export function createRoom(game: GameId, player: Player): Promise<RoomRow> {
  return insertRoom({ game, status: 'waiting', players: [player], state: null });
}

export function createSoloRoom(game: GameId, player: Player): Promise<RoomRow> {
  const players = createSoloPlayers(game, player);
  return insertRoom({ game, status: 'playing', players, state: createGameState(game, players) });
}

export async function fetchRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_COLUMNS)
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RoomRow | null;
}

async function findRoomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_COLUMNS)
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RoomRow | null;
}

export async function updateRoom(
  room: RoomRow,
  changes: Partial<Pick<RoomRow, 'players' | 'state' | 'status'>>,
): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .update({ ...changes, version: room.version + 1 })
    .eq('id', room.id)
    .eq('version', room.version)
    .select(ROOM_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as RoomRow | null;
}

export async function joinRoom(code: string, player: Player): Promise<RoomRow> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await findRoomByCode(code);
    if (!room) throw new Error('No encontramos una sala con ese código.');
    if (room.players.some((p) => p.id === player.id)) return room;
    if (room.status !== 'waiting') throw new Error('Esa partida ya empezó.');
    if (room.players.length >= GAMES[room.game].maxPlayers) {
      throw new Error('La sala está llena.');
    }
    const updated = await updateRoom(room, { players: [...room.players, player] });
    if (updated) return updated;
  }
  throw new Error('La sala cambió mientras intentabas entrar. Inténtalo de nuevo.');
}

export function subscribeToRoom(roomId: string, onChange: (room: RoomRow) => void): () => void {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => onChange(payload.new as RoomRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
