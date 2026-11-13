import { type Card } from '@/games/cards';
import { CARD_BACK_URL } from './cagao/CardAssets';
import CagaoCard from './cagao/PlayingCard';

export type CartaUISize = 'mano' | 'mesa';

interface CartaUIProps {
  card: Card;
  size: CartaUISize;
  /** Carta o grupo elegido por el jugador: se eleva y se resalta. */
  isSelected?: boolean;
  /** El jugador puede usar esta carta ahora mismo (se marca con un aro suave). */
  isPlayable?: boolean;
  /** No es el turno del jugador o la acción no está permitida. */
  isDisabled?: boolean;
  onClick?: () => void;
}

/**
 * Altura de cada tamaño, relativa al viewport (sin px fijos). `.cu-mano` y `.cu-mesa` (index.css) definen
 * `--cu-h`; la mano o la mesa pueden bajarla con --mano-h / --mesa-h cuando hay muchas cartas.
 */
export const CARTA_ALTURA: Record<CartaUISize, string> = {
  mano: 'cu-mano h-[var(--cu-h)]',
  mesa: 'cu-mesa h-[var(--cu-h)]',
};

/**
 * Carta del Casino y de Tres y Dos. Dibuja la misma carta que El Cagao (crema, palos vectoriales y
 * figuras con detalles dorados), para que toda la app comparta baraja.
 */
export default function CartaUI({
  card,
  size,
  isSelected = false,
  isPlayable = false,
  isDisabled = false,
  onClick,
}: CartaUIProps) {
  const cara = <CagaoCard card={card} heightVar="--cu-h" plain />;

  const estado = isSelected ? 'card-picked' : isPlayable ? 'card-playable' : '';
  const base = `${size === 'mano' ? 'cu-mano' : 'cu-mesa'} shrink-0 rounded-[calc(var(--cu-h)*0.07)] transition-transform duration-150 ${estado}`;

  if (!onClick) return <div className={base}>{cara}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      className={`${base} touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
        isDisabled ? 'cursor-not-allowed opacity-70' : 'active:scale-95'
      }`}
    >
      {cara}
    </button>
  );
}

/** Dorso de carta (cacao sobre crema) con la misma proporción. `className` define su altura (por defecto, la de la mesa). */
export function DorsoUI({ className = CARTA_ALTURA.mesa }: { className?: string }) {
  return (
    <div
      className={`aspect-[2.5/3.5] shrink-0 rounded-md bg-cover bg-center shadow-[0_2px_5px_rgba(0,0,0,0.45)] ring-1 ring-black/40 ${className}`}
      style={{ backgroundImage: CARD_BACK_URL }}
    />
  );
}
