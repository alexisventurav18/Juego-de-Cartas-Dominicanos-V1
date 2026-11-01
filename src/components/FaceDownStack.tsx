import { CardBack, type CardSize, SIZE_CLASS } from './PlayingCard';

interface FaceDownStackProps {
  count: number;
  size: CardSize;
  shakeFrame?: number;
}

const MAX_LAYERS = 6;
const LAYER_OFFSET = 3;

export default function FaceDownStack({ count, size, shakeFrame }: FaceDownStackProps) {
  if (count === 0) {
    return <div className={`border-2 border-dashed border-emerald-300/50 ${SIZE_CLASS[size]}`} />;
  }

  const layers = Math.min(count, MAX_LAYERS);
  const depth = layers - 1;
  const shake = shakeFrame === undefined ? 0 : ((shakeFrame * 7) % 5 - 2) * 3;

  return (
    <div
      className="grid transition-transform duration-75"
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
    </div>
  );
}
