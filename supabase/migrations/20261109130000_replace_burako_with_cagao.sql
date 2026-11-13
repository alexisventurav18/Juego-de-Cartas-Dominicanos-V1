/*
  # Reemplaza Burako por El Cagao

  1. Cambios
    - `rooms.game` pasa a aceptar: casino, tresydos, cagao (antes: casino, tresydos, burako).

  2. Datos existentes
    - Las salas de Burako se eliminan: su estado de partida no es compatible con el nuevo
      juego y ya no existe una pantalla para jugarlas.
    - `room_secrets` se borra en cascada junto con la sala (ON DELETE CASCADE).

  3. Notas
    - Revisa el DELETE antes de aplicar la migración si quieres conservar alguna sala.
*/

DELETE FROM rooms WHERE game = 'burako';

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_game_check;

ALTER TABLE rooms
  ADD CONSTRAINT rooms_game_check CHECK (game IN ('casino', 'tresydos', 'cagao'));
