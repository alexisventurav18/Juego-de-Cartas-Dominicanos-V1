import { useState } from 'react';

interface VictoryCelebrationProps {
  onContinue: () => void;
}

const COLORS = ['bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-rose-400', 'bg-orange-300'];
const PIECE_COUNT = 70;

function makePieces() {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.6 + Math.random() * 1.8,
    size: 6 + Math.random() * 8,
    color: COLORS[i % COLORS.length],
  }));
}

export default function VictoryCelebration({ onContinue }: VictoryCelebrationProps) {
  const [pieces] = useState(makePieces);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-stone-900/80 p-4 backdrop-blur-sm">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          aria-hidden="true"
          className={`absolute top-0 block rounded-sm ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 0.4,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
          }}
        />
      ))}
      <div className="relative w-full max-w-md space-y-8 text-center">
        <h2
          className="text-6xl font-black tracking-tight text-amber-300 drop-shadow-[0_4px_24px_rgba(252,211,77,0.6)] sm:text-7xl"
          style={{ animation: 'victory-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        >
          ¡GANASTE!
        </h2>
        <p className="text-base text-stone-100">Tu equipo se llevó la partida. Revisa el desglose de puntos.</p>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-stone-900 shadow-lg transition hover:bg-amber-300"
        >
          Ver el desglose
        </button>
      </div>
    </div>
  );
}
