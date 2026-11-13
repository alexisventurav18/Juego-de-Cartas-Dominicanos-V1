import type { Card } from '@/games/cards';
import PlayingCard, { CardBack } from './PlayingCard';

interface CaptureFlightProps {
  playerName: string;
  card: Card;
  capturedCount: number;
  virao: boolean;
}

/** Muestra la carta pública jugada y el resto de la captura como cartas ocultas. */
export default function CaptureFlight({ playerName, card, capturedCount, virao }: CaptureFlightProps) {
  const visibleBacks = Math.min(capturedCount, 5);

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-4 z-20 flex justify-center">
      <div
        className="animate-capture-flight wood-panel flex items-end gap-1.5 !rounded-2xl px-3 py-2 shadow-xl"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-1">
          <PlayingCard card={card} size="sm" />
          <span className="max-w-24 truncate text-[10px] font-medium">{playerName}</span>
        </div>
        {visibleBacks > 0 && (
          <div className="flex -space-x-3 pb-4">
            {Array.from({ length: visibleBacks }, (_, index) => (
              <div key={index} className="animate-card-turn" style={{ animationDelay: `${index * 45}ms` }}>
                <CardBack size="sm" />
              </div>
            ))}
          </div>
        )}
        <span className="pb-1 text-[10px] font-extrabold text-amber-300">
          {virao ? 'Virao' : `${capturedCount} carta${capturedCount === 1 ? '' : 's'}`}
        </span>
      </div>
    </div>
  );
}
