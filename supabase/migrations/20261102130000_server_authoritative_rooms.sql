/*
# Partidas validadas en el servidor (las manos dejan de ser públicas)

1. Problema
- `rooms.state` guardaba las manos de todos y cualquiera podía leerlo y escribirlo.

2. Cambios
- Nueva tabla `room_secrets` (estado completo de la partida y hashes de las claves de los jugadores).
  Tiene RLS activado y ningún permiso para `anon`/`authenticated`: solo la Edge Function `rooms`
  (con la service role) puede leerla o escribirla.
- Se elimina `rooms.state`. `rooms` conserva solo datos públicos (código, juego, estado de la sala,
  jugadores y versión) y sigue emitiendo cambios por Realtime para avisar a los navegadores.
- Se quitan a `anon`/`authenticated` los permisos y políticas de INSERT y UPDATE sobre `rooms`:
  los navegadores ya no escriben en la base de datos, piden jugadas a la Edge Function.
- `apply_room_update(...)`: actualiza `rooms` y `room_secrets` en una sola transacción y solo si la
  versión sigue siendo la esperada (bloqueo optimista). Solo la puede ejecutar la service role.

3. Notas
- Las partidas en curso guardadas con el esquema anterior se pierden (el estado ya no existe).
*/

CREATE TABLE IF NOT EXISTS room_secrets (
  room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  state jsonb,
  keys jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE room_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON room_secrets FROM PUBLIC, anon, authenticated;

ALTER TABLE rooms DROP COLUMN IF EXISTS state;

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
REVOKE INSERT, UPDATE, DELETE ON rooms FROM anon, authenticated;

CREATE OR REPLACE FUNCTION apply_room_update(
  p_room_id uuid,
  p_expected_version integer,
  p_status text,
  p_players jsonb,
  p_state jsonb,
  p_keys jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated integer;
BEGIN
  UPDATE rooms
     SET status = p_status,
         players = p_players,
         version = p_expected_version + 1
   WHERE id = p_room_id
     AND version = p_expected_version;
  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE room_secrets
     SET state = p_state,
         keys = p_keys
   WHERE room_id = p_room_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION apply_room_update(uuid, integer, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_room_update(uuid, integer, text, jsonb, jsonb, jsonb) TO service_role;
