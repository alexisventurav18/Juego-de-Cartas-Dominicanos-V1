const PLAYER_ID_KEY = 'cartas.playerId';
const PLAYER_NAME_KEY = 'cartas.playerName';
const ROOM_ID_KEY = 'cartas.roomId';

export function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function getPlayerId(): string {
  const existing = localStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const id = randomId();
  localStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

export function getStoredName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? '';
}

export function storeName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function getStoredRoomId(): string | null {
  return localStorage.getItem(ROOM_ID_KEY);
}

export function storeRoomId(roomId: string | null): void {
  if (roomId === null) localStorage.removeItem(ROOM_ID_KEY);
  else localStorage.setItem(ROOM_ID_KEY, roomId);
}
