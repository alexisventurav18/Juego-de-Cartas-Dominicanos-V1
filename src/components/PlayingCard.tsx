import {
  type Card,
  isAmericanSuit,
  isRedSuit,
  rankLabel,
  suitSymbol,
} from '@/games/cards';

export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

interface PlayingCardProps {
  card: Card;
  size?: CardSize;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const SIZE_CLASS: Record<CardSize, string> = {
  sm: 'h-16 w-12 rounded-md sm:h-20 sm:w-14',
  md: 'h-32 w-24 rounded-xl sm:h-40 sm:w-28',
  lg: 'h-40 w-28 rounded-xl sm:h-52 sm:w-36',
  xl: 'h-44 w-32 rounded-xl sm:h-60 sm:w-40',
};

const RANK_CLASS: Record<CardSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const SUIT_CLASS: Record<CardSize, string> = {
  sm: 'text-xl leading-none',
  md: 'text-3xl leading-none',
  lg: 'text-5xl leading-none',
  xl: 'text-6xl leading-none',
};

const JOKER_CLASS: Record<CardSize, string> = {
  sm: 'text-[9px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

export default function PlayingCard({
  card,
  size = 'md',
  selected = false,
  highlighted = false,
  disabled = false,
  onClick,
}: PlayingCardProps) {
  const isJoker = card.suit === 'comodin';
  const red = isAmericanSuit(card.suit) && isRedSuit(card.suit);

  const face = (
    <div
      className={`relative flex flex-col justify-between border bg-white p-1 text-left shadow-sm sm:p-1.5 ${SIZE_CLASS[size]} ${
        isJoker
          ? 'border-amber-300 bg-gradient-to-br from-amber-100 to-white'
          : 'border-stone-200'
      } ${red ? 'text-rose-600' : 'text-stone-800'}`}
    >
      <span className={`font-semibold leading-none ${RANK_CLASS[size]}`}>
        {isJoker ? 'J' : rankLabel(card)}
      </span>
      <div className="flex flex-1 items-center justify-center">
        {isJoker ? (
          <span className={`font-bold tracking-widest text-amber-600 ${JOKER_CLASS[size]}`}>JOKER</span>
        ) : (
          isAmericanSuit(card.suit) && <span className={SUIT_CLASS[size]}>{suitSymbol(card.suit)}</span>
        )}
      </div>
      {!isJoker && (
        <span className={`self-end rotate-180 font-semibold leading-none ${RANK_CLASS[size]}`}>
          {rankLabel(card)}
        </span>
      )}
    </div>
  );

  const stateClass = selected
    ? '-translate-y-3 ring-2 ring-amber-400 shadow-lg'
    : highlighted
      ? 'ring-2 ring-emerald-400 hover:-translate-y-1'
      : '';

  if (!onClick) {
    return <div className={`shrink-0 transition ${stateClass}`}>{face}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
        disabled ? '' : 'hover:-translate-y-1'
      } ${stateClass}`}
    >
      {face}
    </button>
  );
}

export function CardBack({ size = 'sm' }: { size?: CardSize }) {
  return (
    <div
      className={`shrink-0 border-2 border-emerald-200/60 bg-emerald-700 shadow-sm ${SIZE_CLASS[size]}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 4px, transparent 4px 10px)',
      }}
    />
  );
}
