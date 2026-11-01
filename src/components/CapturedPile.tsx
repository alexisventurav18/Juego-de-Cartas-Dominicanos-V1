import type { Card } from '@/games/cards';
import type { CaptureGroup } from '@/games/casino';
import FaceDownStack from './FaceDownStack';
import PlayingCard from './PlayingCard';

interface CapturedPileProps {
  title: string;
  groups: CaptureGroup[];
}

const STEP_X = 6;
const STEP_Y = 4;

export default function CapturedPile({ title, groups }: CapturedPileProps) {
  const cardCount = groups.reduce((sum, group) => sum + group.cards.length, 0);
  const hiddenCount = groups
    .filter((group) => !group.virao)
    .reduce((sum, group) => sum + group.cards.length, 0);
  const viraos = groups.filter((group) => group.virao);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
        {title} · {cardCount} {cardCount === 1 ? 'carta' : 'cartas'}
      </p>
      {cardCount === 0 ? (
        <p className="text-sm text-stone-400">Todavía no hay cartas capturadas.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          {hiddenCount > 0 && (
            <div className="space-y-2">
              <FaceDownStack count={hiddenCount} size="sm" />
              <p className="text-xs text-stone-500">{hiddenCount} boca abajo</p>
            </div>
          )}
          {viraos.map((group, i) => (
            <div key={i} className="space-y-2">
              <CaptureStack cards={group.cards} />
              <p className="text-xs font-medium text-amber-700">Virao</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaptureStack({ cards }: { cards: Card[] }) {
  const depth = cards.length - 1;
  const layered = [...cards].reverse();

  return (
    <div
      className="grid"
      style={{ marginRight: depth * STEP_X, marginBottom: depth * STEP_Y }}
      title="Carta jugada encima de las cartas que se llevó"
    >
      {layered.map((card, i) => (
        <div
          key={card.id}
          className="transition duration-200 hover:-translate-y-0.5"
          style={{
            gridArea: '1 / 1',
            transform: `translate(${i * STEP_X}px, ${i * STEP_Y}px)`,
            zIndex: i + 1,
          }}
        >
          <PlayingCard card={card} size="sm" />
        </div>
      ))}
    </div>
  );
}
