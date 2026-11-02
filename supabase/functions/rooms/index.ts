// Servidor de salas. Guarda las partidas completas (manos incluidas) y a cada jugador solo le entrega su vista.
// Despliegue:  npm run sync:functions && supabase functions deploy rooms
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleRequest,
  makeRoomCode,
  type RoomPatch,
  type RoomRecord,
  type RoomStore,
  type SecretRecord,
  type StoredRoom,
} from '../_shared/games/roomService.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UNIQUE_VIOLATION = '23505';
const MAX_CODE_ATTEMPTS = 6;
const MAX_BODY_BYTES = 16_384;
const ROOM_COLUMNS = 'id, code, game, status, players, version';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

async function load(column: 'id' | 'code', value: string): Promise<StoredRoom | null> {
  const { data: room, error } = await db.from('rooms').select(ROOM_COLUMNS).eq(column, value).maybeSingle();
  if (error) throw new Error(error.message);
  if (!room) return null;
  const { data: secret, error: secretError } = await db
    .from('room_secrets')
    .select('state, keys')
    .eq('room_id', room.id)
    .maybeSingle();
  if (secretError) throw new Error(secretError.message);
  return {
    room: room as RoomRecord,
    secret: { state: secret?.state ?? null, keys: secret?.keys ?? {} },
  };
}

const store: RoomStore = {
  findById: (id) => load('id', id),
  findByCode: (code) => load('code', code),

  async create(room, secret: SecretRecord) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const { data, error } = await db
        .from('rooms')
        .insert({ code: makeRoomCode(), ...room })
        .select(ROOM_COLUMNS)
        .maybeSingle();
      if (error?.code === UNIQUE_VIOLATION) continue;
      if (error || !data) throw new Error(error?.message ?? 'No se pudo crear la sala.');
      const { error: secretError } = await db
        .from('room_secrets')
        .insert({ room_id: data.id, state: secret.state, keys: secret.keys });
      if (secretError) {
        await db.from('rooms').delete().eq('id', data.id);
        throw new Error(secretError.message);
      }
      return { room: data as RoomRecord, secret };
    }
    throw new Error('No se pudo generar un código de sala libre.');
  },

  async update(roomId: string, expectedVersion: number, patch: RoomPatch) {
    const { data, error } = await db.rpc('apply_room_update', {
      p_room_id: roomId,
      p_expected_version: expectedVersion,
      p_status: patch.status,
      p_players: patch.players,
      p_state: patch.state,
      p_keys: patch.keys,
    });
    if (error) throw new Error(error.message);
    return data === true;
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Solicitud demasiado grande.' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'Solicitud no válida.' }, 400);
  }
  // Los errores de juego van con código 200 y { ok: false }; así el navegador siempre puede leer el mensaje.
  return json(await handleRequest(store, body));
});
