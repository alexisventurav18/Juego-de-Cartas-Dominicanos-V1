import type { CagaoState } from '@/games/cagao';
import type { Card } from '@/games/cards';

export type { Card };
export type { Player } from '@/games/shared';
export type { CagaoEvent, CagaoMove, CagaoState as GameState } from '@/games/cagao';

export type Suit = Card['suit'];
export type Rank = Card['rank'];
/** Fase de la partida: bajar pares iniciales, robar por turnos o terminada. */
export type TurnPhase = CagaoState['phase'];

/** Lado de la mesa donde se sienta cada jugador (tú siempre abajo). */
export type SeatSide = 'bottom' | 'left' | 'top' | 'right';

/** Reparto de los rivales alrededor de la mesa. */
export interface SeatLayout {
  left: number | null;
  /** Varios rivales pueden compartir el lado de arriba (partidas de 5 y 6). */
  top: number[];
  right: number | null;
}

export interface Point {
  x: number;
  y: number;
}

/** Cosas que el jugador puede hacer con las cartas (táctil o ratón). */
export type InteractionEvent =
  | { type: 'draw'; fromSeat: number; index: number }
  | { type: 'pair'; cardIds: [string, string] }
  | { type: 'pairAll' }
  | { type: 'shuffle' };
