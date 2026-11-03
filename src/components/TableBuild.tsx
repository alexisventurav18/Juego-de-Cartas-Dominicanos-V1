import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Build } from '@/games/casinoCapture';
import PlayingCard from './PlayingCard';

interface TableBuildProps {
  build: Build;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

const STEP_X = 12;
const STEP_Y = 8;

export default function TableBuild({ build, selected, disabled, onSelect }: TableBuildProps) {
  const depth = build.cards.length - 1;
  const previousSize = useRef(build.cards.length);
  const previousKind = useRef(build.kind);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const becameLargePairs =
      build.kind === 'pairs' &&
      build.cards.length >= 6 &&
      (previousSize.current < 6 || previousKind.current !== 'pairs');
    if (becameLargePairs) {
      setCelebrating(true);
    }
    previousSize.current = build.cards.length;
    previousKind.current = build.kind;
  }, [build.cards.length, build.kind]);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1100);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

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
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={onKeyDown}
      className={`relative flex shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl p-2 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
        selected ? 'bg-amber-300/25 ring-2 ring-amber-400' : disabled ? '' : 'hover:-translate-y-1'
      } ${disabled ? 'cursor-not-allowed opacity-80' : ''} ${celebrating ? 'animate-pairs-combo' : ''}`}
    >
      <span className="rounded-full bg-amber-400 px-3 py-0.5 text-sm font-bold text-stone-900">
        {build.kind === 'pairs' ? 'Pares de' : 'Sumatoria de'} {build.value}
      </span>
      {celebrating && (
        <span className="absolute -top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          ¡Pares!
        </span>
      )}
      <div className="grid" style={{ marginRight: depth * STEP_X, marginBottom: depth * STEP_Y }}>
        {build.cards.map((card, i) => (
          <div
            key={card.id}
            style={{
              gridArea: '1 / 1',
              transform: `translate(${i * STEP_X}px, ${i * STEP_Y}px)`,
              zIndex: i + 1,
            }}
          >
            <PlayingCard card={card} size="table" />
          </div>
        ))}
      </div>
    </div>
  );
}
