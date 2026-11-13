import { useRef, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { GAMES } from '@/games';
import type { Card } from '@/games/cards';
import type { GameId } from '@/games/shared';
import PlayingCard from './cagao/PlayingCard';

interface GameCarouselProps {
  games: GameId[];
  selected: GameId;
  onSelect: (id: GameId) => void;
}

const card = (id: string, suit: Card['suit'], rank: number): Card => ({ id, suit, rank });

/** Tres cartas de muestra por juego: las que mejor lo resumen. */
const PREVIEW: Record<GameId, { cards: Card[]; plain: boolean; hidden?: boolean }> = {
  // Las tres cartas que más puntos dan en el Casino: el As, el 10 de diamantes y el 2 de picas.
  casino: { cards: [card('p-c1', 'corazones', 1), card('p-c2', 'diamantes', 10), card('p-c3', 'picas', 2)], plain: true },
  // Una tercia y un par es el 3 y 2: aquí, dos reyes y un 8.
  tresydos: { cards: [card('p-t1', 'picas', 13), card('p-t2', 'corazones', 13), card('p-t3', 'treboles', 8)], plain: true },
  // El A♠ es El Cagao, junto a dos cartas que ya tienen pareja en juego.
  cagao: { cards: [card('p-g1', 'corazones', 7), card('picas-1', 'picas', 1), card('p-g3', 'treboles', 7)], plain: false },
};

const FAN_TILT = [-9, 0, 9];

/**
 * Menú de juegos en horizontal: una fila deslizable (con imán al centro) de tarjetas de madera.
 * Se desliza con el dedo, la rueda o las flechas, y se elige tocando la tarjeta.
 */
export default function GameCarousel({ games, selected, onSelect }: GameCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.7, 240), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="listbox"
        aria-label="Juegos"
        aria-orientation="horizontal"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-4 pt-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:justify-center lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {games.map((id) => {
          const info = GAMES[id];
          const active = id === selected;
          const preview = PREVIEW[id];
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={(event) => {
                onSelect(id);
                event.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
              className={`wood-block relative flex w-[74vw] max-w-[300px] shrink-0 snap-center flex-col gap-3 rounded-2xl p-4 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 lg:w-[280px] ${
                active ? '-translate-y-1 ring-2 ring-amber-300' : 'opacity-90 hover:-translate-y-0.5 hover:opacity-100'
              }`}
            >
              {active && <span aria-hidden className="turn-glow pointer-events-none absolute -inset-1 rounded-[1.25rem]" />}
              <span
                aria-hidden
                className="relative flex h-[7.5rem] items-end justify-center rounded-xl bg-black/30 pb-3 ring-1 ring-amber-200/20"
                style={{ '--lobby-card-h': '5.25rem' } as CSSProperties}
              >
                {preview.cards.map((c, i) => (
                  <span
                    key={c.id}
                    className={`block ${i === 0 ? '' : '-ml-6'}`}
                    style={{ transform: `rotate(${FAN_TILT[i]}deg) translateY(${i === 1 ? -6 : 0}px)`, zIndex: i === 1 ? 2 : 1 }}
                  >
                    <PlayingCard card={c} heightVar="--lobby-card-h" plain={preview.plain} />
                  </span>
                ))}
              </span>
              <span className="relative text-xl font-extrabold text-amber-50">{info.name}</span>
              <span className="relative min-h-[3.75rem] text-sm leading-relaxed text-amber-100/85">{info.tagline}</span>
              <span className="relative inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Users className="h-3.5 w-3.5" />
                {info.playerCountLabel}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Juegos anteriores"
        className="wood-chip absolute left-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full active:scale-95 md:max-lg:grid"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Juegos siguientes"
        className="wood-chip absolute right-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full active:scale-95 md:max-lg:grid"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
