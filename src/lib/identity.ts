const PLAYER_ID_KEY = 'cartas.playerId';
const PLAYER_SECRET_KEY = 'cartas.playerKey';
const PLAYER_NAME_KEY = 'cartas.playerName';
const ROOM_ID_KEY = 'cartas.roomId';

// Algunos navegadores (modo privado, cookies bloqueadas) lanzan errores al usar localStorage.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: la sesión sigue funcionando, solo no se recuerda al recargar.
  }
}

export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let sessionPlayerId: string | null = null;

export function getPlayerId(): string {
  const existing = readStorage(PLAYER_ID_KEY) ?? sessionPlayerId;
  if (existing) return existing;
  const id = randomId();
  sessionPlayerId = id;
  writeStorage(PLAYER_ID_KEY, id);
  return id;
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let sessionPlayerKey: string | null = null;

/**
 * Clave secreta del jugador: demuestra ante el servidor que eres tú (el id es público).
 * Nunca se muestra ni se comparte; el servidor solo guarda su hash.
 */
export function getPlayerKey(): string {
  const existing = readStorage(PLAYER_SECRET_KEY) ?? sessionPlayerKey;
  if (existing) return existing;
  const key = randomSecret();
  sessionPlayerKey = key;
  writeStorage(PLAYER_SECRET_KEY, key);
  return key;
}

export function getStoredName(): string {
  return readStorage(PLAYER_NAME_KEY) ?? '';
}

export function storeName(name: string): void {
  writeStorage(PLAYER_NAME_KEY, name);
}

export function getStoredRoomId(): string | null {
  return readStorage(ROOM_ID_KEY);
}

export function storeRoomId(roomId: string | null): void {
  writeStorage(ROOM_ID_KEY, roomId);
}
