import { CardBack, type CardSize, SIZE_CLASS } from './PlayingCard';

interface FaceDownStackProps {
  count: number;
  size: CardSize;
  shakeFrame?: number;
  displayCount?: number;
  pulseKey?: number;
}

const MAX_LAYERS = 6;
const LAYER_OFFSET = 3;

export default function FaceDownStack({ count, size, shakeFrame, displayCount = count, pulseKey }: FaceDownStackProps) {
  if (count === 0) {
    return (
      <div className={`relative border-2 border-dashed border-emerald-300/50 ${SIZE_CLASS[size]}`}>
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-xs font-bold tabular-nums text-white drop-shadow sm:text-sm">
          {displayCount}
        </span>
      </div>
    );
  }

  const layers = Math.min(count, MAX_LAYERS);
  const depth = layers - 1;
  const shake = shakeFrame === undefined ? 0 : ((shakeFrame * 7) % 5 - 2) * 3;

  return (
    <div
      className="relative grid transition-transform duration-75"
      style={{
        marginRight: depth * LAYER_OFFSET,
        marginBottom: depth * LAYER_OFFSET,
        transform: `translateX(${shake}px)`,
      }}
    >
      {Array.from({ length: layers }, (_, i) => (
        <div
          key={i}
          style={{
            gridArea: '1 / 1',
            transform: `translate(${i * LAYER_OFFSET}px, ${i * LAYER_OFFSET}px)`,
            zIndex: i + 1,
          }}
        >
          <CardBack size={size} />
        </div>
      ))}
      <span
        key={pulseKey}
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-xs font-bold tabular-nums text-white drop-shadow sm:text-sm ${
          pulseKey === undefined ? '' : 'animate-deck-count'
        }`}
        style={{ transform: `translate(${depth * LAYER_OFFSET}px, ${depth * LAYER_OFFSET}px)` }}
      >
        {displayCount}
      </span>
    </div>
  );
}
