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

## Seguridad: qué está resuelto y qué no

Resuelto: códigos de sala y de jugador con `crypto`, reintento si el código ya existe, y la migración `supabase/migrations/20261102120000_harden_rooms.sql` (el trigger impide cambiar juego/código, saltar versiones, robar asientos a mitad de partida o volver a la sala de espera).

**Pendiente:** el estado de la partida, con las manos de todos, se guarda en `rooms.state` y lo descarga cada navegador, así que un jugador técnico puede ver las cartas de los demás. Arreglarlo de verdad requiere validar jugadas y entregar a cada jugador solo su vista desde una Supabase Edge Function.
