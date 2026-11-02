# Juego de Cartas Dominicanos

React + TypeScript + Vite + Tailwind, con Supabase para salas y multijugador. Juegos: Casino, Cinquillo y Burako.

## Comandos

```bash
npm install
npm run dev        # desarrollo
npm run typecheck  # tipos
npm test           # pruebas de reglas y bots (tsx + node:test)
npm run simulate -- casino 600   # bot nuevo vs bot original (casino | cinquillo | burako)
```

## Casino: regla de cierre obligatorio (17 puntos)

Se implementa en `src/games/casino.ts` (`closingNeeds`, `scoreRound`).

Un equipo que **empieza una ronda con 17 a 20 puntos** solo puntúa mayoría de cartas (3) y mayoría de picas (1), y solo la que le falta para llegar a 21 exactos. Ases, Gran Casino, Dueño y viraos se muestran tachados ("no cuenta") y suman 0.

| Puntos al empezar | Le falta | Cuenta |
|---|---|---|
| 17 | 4 | mayoría de cartas **y** de picas |
| 18 | 3 | mayoría de cartas |
| 19 | 2 | mayoría de picas |
| 20 | 1 | mayoría de picas |

Ejemplos del reglamento: 17 + cartas = 20 (falta picas); 17 + picas = 18 (faltan cartas).

Decisiones donde el reglamento no decía nada:
- **19 puntos** (solo se llega por puntuación normal): cuenta la mayoría de picas, porque la de cartas pasaría de 21. Queda en 20 y necesita picas otra vez.
- La restricción aplica según los puntos **al empezar** la ronda. Si un equipo cruza 17 en una ronda normal, esa ronda cuenta completa (y gana si pasa de 21).
- Si ambos equipos llegan a 21 en la misma ronda, gana el de más puntos y, a igualdad, el que más sumó en esa ronda.
- Los viraos siguen funcionando (quitan un virao al rival); solo dejan de puntuar para el equipo en cierre.

## Bots

- **Casino** (`src/games/casinoBot.ts`): evalúa cada jugada legal por ganancia inmediata, potencial de combinaciones propias y pérdida esperada por lo que el rival podría llevarse (probabilidades con las cartas no vistas). Conoce la regla de cierre. Solo usa información pública: nunca mira la mano de los demás.
- **Cinquillo y Burako** (`src/games/bots.ts`): heurísticas más simples.

## Arquitectura de las partidas (servidor autoritativo)

Los navegadores **no leen ni escriben** las partidas directamente. Todo pasa por la Edge Function `rooms`:

- `rooms` (tabla pública): código, juego, estado de la sala, jugadores y versión. Sin cartas. Sigue emitiendo cambios por Realtime solo para avisar "hay novedades".
- `room_secrets` (tabla privada, sin permisos para `anon`): estado completo de la partida y hash de la clave de cada jugador. Solo la función la toca.
- Cada jugador tiene un id (público) y una **clave secreta** guardada en su navegador. El servidor guarda solo el hash. Conocer el id de otro jugador no sirve para suplantarlo.
- Cada petición devuelve la **vista del jugador**: su mano completa y, de los demás, solo cuántas cartas tienen (`src/games/view.ts`). El orden del mazo y los muertos de Burako tampoco salen del servidor.
- Los bots los calcula el servidor: el navegador del primer humano solo pide "avanza un turno" (`tick`).
- Las actualizaciones usan `apply_room_update`, que cambia `rooms` y `room_secrets` en una sola transacción y solo si la versión coincide.

Código: `src/games/roomService.ts` (lógica, probada con un almacén en memoria) y `supabase/functions/rooms/index.ts` (almacenamiento real).

### Despliegue

```bash
npm run sync:functions            # copia src/games a supabase/functions/_shared/games (formato Deno)
supabase functions deploy rooms
```

`npm test` falla si la copia está desactualizada. Las migraciones están en `supabase/migrations` y se aplican en orden.

### Límites conocidos

- Un jugador sigue pudiendo ver lo que ya es público en la mesa (cartas capturadas, pozo, combinaciones); eso es como en la mesa real.
- Quien tenga el código de una sala y esté en ella puede pedir `tick` repetidamente; el servidor ignora los que llegan con versión vieja, pero no limita la frecuencia.
- No hay limpieza automática de salas viejas: ejecuta `select purge_stale_rooms(7);` de vez en cuando o prográmalo con pg_cron.
