/*
# Endurecer la tabla rooms

1. Problema
- Las políticas permitían a cualquiera actualizar cualquier columna de cualquier sala:
  cambiar el juego, reescribir la lista de jugadores a mitad de partida (robar un asiento)
  o pisar movimientos con un `version` arbitrario.

2. Cambios
- Trigger `rooms_guard` (BEFORE UPDATE) que garantiza:
  - `id`, `code`, `game` y `created_at` nunca cambian.
  - `version` solo puede avanzar de uno en uno (bloqueo optimista también en la base de datos).
  - `status` no puede volver de `playing` a `waiting`.
  - `players` no se puede modificar cuando la partida ya empezó.
  - `players` solo puede crecer (sin quitar ni reordenar) mientras la sala está en espera.
- Índice por fecha para poder limpiar salas viejas.
- Función `purge_stale_rooms(days)` para borrar salas abandonadas (ejecútala a mano o con pg_cron).

3. Nota
- Las manos dejan de ser públicas en la migración siguiente (20261102130000_server_authoritative_rooms).
*/

CREATE OR REPLACE FUNCTION rooms_guard() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.game IS DISTINCT FROM OLD.game
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'rooms: id, code, game y created_at no se pueden modificar';
  END IF;

  IF NEW.version IS DISTINCT FROM OLD.version + 1 THEN
    RAISE EXCEPTION 'rooms: version debe avanzar exactamente en uno';
  END IF;

  IF OLD.status = 'playing' AND NEW.status = 'waiting' THEN
    RAISE EXCEPTION 'rooms: una partida en curso no puede volver a la sala de espera';
  END IF;

  IF NEW.players IS DISTINCT FROM OLD.players THEN
    IF OLD.status = 'playing' THEN
      RAISE EXCEPTION 'rooms: no se puede cambiar la lista de jugadores durante la partida';
    END IF;
    IF jsonb_array_length(NEW.players) < jsonb_array_length(OLD.players)
       OR (SELECT jsonb_agg(t.p->'id' ORDER BY t.i)
           FROM jsonb_array_elements(NEW.players) WITH ORDINALITY AS t(p, i)
           WHERE t.i <= jsonb_array_length(OLD.players))
          IS DISTINCT FROM
          (SELECT jsonb_agg(t.p->'id' ORDER BY t.i)
           FROM jsonb_array_elements(OLD.players) WITH ORDINALITY AS t(p, i)) THEN
      RAISE EXCEPTION 'rooms: solo se pueden añadir jugadores al final de la lista';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_guard_trigger ON rooms;
CREATE TRIGGER rooms_guard_trigger
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION rooms_guard();

CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON rooms (created_at);

CREATE OR REPLACE FUNCTION purge_stale_rooms(days integer DEFAULT 7) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM rooms WHERE created_at < now() - make_interval(days => days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION purge_stale_rooms(integer) FROM PUBLIC, anon, authenticated;
