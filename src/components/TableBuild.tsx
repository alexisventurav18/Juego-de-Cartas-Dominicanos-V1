import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Build } from '@/games/casinoCapture';
import CartaUI from './CartaUI';

interface TableBuildProps {
  build: Build;
  /** Grupo elegido por el jugador. */
  selected: boolean;
  /** No es el turno del jugador o aún no eligió una carta. */
  disabled: boolean;
  onSelect: () => void;
}

/**
 * Grupo de la mesa (suma o par apilado) en formato compacto: las cartas se solapan en una sola fila
 * y una insignia flotante indica el tipo y el valor ("Par 5", "Suma 14"). El solape es proporcional
 * al alto de la carta (dvh), así se ve igual en móvil vertical, horizontal y escritorio.
 */
export default function TableBuild({ build, selected, disabled, onSelect }: TableBuildProps) {
  const previousSize = useRef(build.cards.length);
  const previousKind = useRef(build.kind);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const becameLargePairs =
      build.kind === 'pairs' &&
      build.cards.length >= 6 &&
      (previousSize.current < 6 || previousKind.current !== 'pairs');
    if (becameLargePairs) setCelebrating(true);
    previousSize.current = build.cards.length;
    previousKind.current = build.kind;
  }, [build.cards.length, build.kind]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1100);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  const etiqueta = `${build.kind === 'pairs' ? 'Par' : 'Suma'} ${build.value}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={etiqueta}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={onKeyDown}
      className={`relative flex shrink-0 touch-manipulation items-center rounded-xl p-0.5 transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
        selected ? '-translate-y-3 ring-2 ring-yellow-400 shadow-lg' : ''
      } ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${celebrating ? 'animate-pairs-combo' : ''}`}
    >
      <span
        key={etiqueta}
        aria-hidden
        className="animate-combo-label absolute -top-2 -right-2 z-10 whitespace-nowrap rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-black shadow sm:text-xs"
      >
        {etiqueta}
      </span>
      {build.cards.map((card, i) => (
        <div
          key={card.id}
          className={
            i === 0
              ? ''
              : '-ml-[calc(var(--mesa-h,12dvh)*0.285)] sm:-ml-[calc(var(--mesa-h-sm,15dvh)*0.293)]'
          }
          style={{ zIndex: i + 1 }}
        >
          <CartaUI card={card} size="mesa" />
        </div>
      ))}
      {celebrating && (
        <span className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-stone-900 shadow-md">
          ¡Pares!
        </span>
      )}
    </div>
  );
}
