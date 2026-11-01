/*
# Create rooms table for card game lobbies

1. New Tables
- `rooms`: one row per game room shared by friends.
  - `id` (uuid, primary key)
  - `code` (text, unique): short code players type to join
  - `game` (text): one of casino, cinquillo, burako
  - `status` (text): waiting (lobby) or playing
  - `players` (jsonb): list of { id, name } in seat order
  - `state` (jsonb, nullable): full game state once the match starts
  - `version` (integer): incremented on every change, used to avoid overwriting concurrent moves
  - `created_at` (timestamp)

2. Security
- Enable RLS on `rooms`.
- Grant SELECT, INSERT, UPDATE to `anon` and `authenticated` (no sign-in is required; rooms are shared by code).
- Policies allow anon and authenticated to read, create and update rooms. No delete is granted.

3. Realtime
- Adds `rooms` to the realtime publication so open browsers receive moves instantly.

4. Notes
- Shared, public-by-code data is intentional for this casual multiplayer app.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  game text NOT NULL CHECK (game IN ('casino', 'cinquillo', 'burako')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing')),
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  state jsonb,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON rooms TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_rooms" ON rooms;
CREATE POLICY "anon_select_rooms" ON rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rooms" ON rooms;
CREATE POLICY "anon_insert_rooms" ON rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
CREATE POLICY "anon_update_rooms" ON rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
  END IF;
END $$;
