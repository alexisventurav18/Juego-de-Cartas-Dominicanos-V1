import { type Card } from '@/games/cards';
import { CARD_BACK_URL } from './cagao/CardAssets';
import CagaoCard from './cagao/PlayingCard';

export type CardSize = 'sm' | 'hand' | 'table' | 'deck' | 'md' | 'lg' | 'xl';

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/** Alto de cada tamaño como variable CSS (`--pc-h`): la carta de El Cagao escala todo a partir de ahí. */
const HEIGHT_VAR: Record<CardSize, string> = {
  sm: '[--pc-h:4rem] sm:[--pc-h:5rem]',
  hand: '[--pc-h:6rem] sm:[--pc-h:9rem]',
  table: '[--pc-h:min(11dvh,8rem)] sm:[--pc-h:min(14dvh,8rem)]',
  deck: '[--pc-h:4rem] sm:[--pc-h:13rem]',
  md: '[--pc-h:8rem] sm:[--pc-h:10rem]',
  lg: '[--pc-h:8rem] sm:[--pc-h:13rem]',
  xl: '[--pc-h:9rem] sm:[--pc-h:15rem]',
};

/** Tamaño de caja de cada carta (alto y proporción), para reservar espacio, apilar o dibujar huecos. */
export const SIZE_CLASS: Record<CardSize, string> = Object.fromEntries(
  (Object.keys(HEIGHT_VAR) as CardSize[]).map((size) => [
    size,
    `${HEIGHT_VAR[size]} h-[var(--pc-h)] aspect-[2.5/3.5] rounded-md`,
  ]),
) as Record<CardSize, string>;

export default function PlayingCard({
  card,
  size = 'md',
  selected = false,
  highlighted = false,
  disabled = false,
  onClick,
}: PlayingCardProps) {
  const face = <CagaoCard card={card} heightVar="--pc-h" plain />;
  const radius = 'rounded-[calc(var(--pc-h)*0.07)]';
  const stateClass = selected ? 'card-picked' : highlighted ? 'card-playable sm:hover:-translate-y-1' : '';

  if (!onClick) {
    return <div className={`${HEIGHT_VAR[size]} ${radius} shrink-0 transition ${stateClass}`}>{face}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${HEIGHT_VAR[size]} ${radius} min-h-11 shrink-0 touch-manipulation transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        disabled ? '' : 'active:scale-95 sm:hover:-translate-y-1'
      } ${stateClass}`}
    >
      {face}
    </button>
  );
}

export function CardBack({ size = 'sm' }: { size?: CardSize }) {
  return (
    <div
      className={`${SIZE_CLASS[size]} shrink-0 bg-cover bg-center shadow-[0_2px_5px_rgba(0,0,0,0.45)] ring-1 ring-black/40`}
      style={{ backgroundImage: CARD_BACK_URL }}
    />
  );
}
