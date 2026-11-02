import { useEffect, useState } from 'react';

type Side = 'cara' | 'cruz';

interface CoinTossProps {
  onDone: (humanWonToss: boolean) => void;
}

const FLIP_MS = 1600;
const SIDE_LABEL: Record<Side, string> = { cara: 'Cara', cruz: 'Cruz' };

export default function CoinToss({ onDone }: CoinTossProps) {
  const [choice, setChoice] = useState<Side | null>(null);
  const [result, setResult] = useState<Side | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (result === null) return;
    const timer = window.setTimeout(() => setSettled(true), FLIP_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  const flip = (side: Side) => {
    setChoice(side);
    setResult(Math.random() < 0.5 ? 'cara' : 'cruz');
  };

  const humanWon = result !== null && choice === result;
  const turns = result === 'cruz' ? 1980 : 1800;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-6 text-center shadow-xl sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-500">Volado inicial</p>
          <h2 className="text-2xl font-semibold text-stone-900">
            {result === null ? 'Cara o cruz' : settled ? (humanWon ? 'Ganaste el volado' : 'Perdiste el volado') : 'Lanzando...'}
          </h2>
          <p className="text-sm text-stone-600">
            {result === null
              ? 'Elige un lado. Si pierdes el volado, repartes tú esta ronda.'
              : settled
                ? humanWon
                  ? 'El bot reparte y tú empiezas jugando.'
                  : 'Tú repartes y juegas al final de la ronda.'
                : 'La moneda está en el aire.'}
          </p>
        </div>

        <div className="flex justify-center py-2" style={{ perspective: '800px' }}>
          <div
            className="relative h-32 w-32"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${turns}deg)`,
              transition: result === null ? 'none' : `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
            }}
          >
            <CoinFace label="Cara" />
            <CoinFace label="Cruz" back />
          </div>
        </div>

        {result === null ? (
          <div className="grid grid-cols-2 gap-3">
            {(['cara', 'cruz'] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => flip(side)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 transition hover:border-emerald-600 hover:bg-emerald-50"
              >
                {SIDE_LABEL[side]}
              </button>
            ))}
          </div>
        ) : (
          settled && (
            <button
              type="button"
              onClick={() => onDone(humanWon)}
              className="w-full rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
            >
              Empezar partida
            </button>
          )
        )}
      </div>
    </div>
  );
}

function CoinFace({ label, back = false }: { label: string; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-600 bg-amber-400 text-xl font-bold text-stone-900 shadow-inner"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
      }}
    >
      {label}
    </div>
  );
}
