import GameTable, { type GameTableProps } from './cagao/GameTable';

/**
 * Pantalla de El Cagao. Mantiene la misma firma de props que las mesas de los otros juegos
 * (state, seat, onMove, onLeave, roomLabel, connection, notice, resultFooter) y delega todo el
 * dibujo en `cagao/GameTable`, que es la mesa artesanal en perspectiva 2.5D.
 */
export default function CagaoTable(props: GameTableProps) {
  return <GameTable {...props} />;
}
