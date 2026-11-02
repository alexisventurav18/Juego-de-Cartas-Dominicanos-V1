import { useEffect, useState } from 'react';
import type { Player } from '@/games/shared';

interface DealerRevealProps {
  players: Player[];
  dealer: number;
  onDone: () => void;
}

export default function DealerReveal({ players, dealer, onDone }: DealerRevealProps) {
  const [highlight, setHighlight] = useState(-1);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const finalStep = 3 * players.length + dealer;
    let step = 0;
    let timer: number;
    const advance = () => {
      step += 1;
      setHighlight(step % players.length);
      if (step >= finalStep) {
        setLanded(true);
        return;
      }
      timer = window.setTimeout(advance, 60 + step * 12);
    };
    timer = window.setTimeout(advance, 300);
    return () => window.clearTimeout(timer);
  }, [dealer, players.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 text-center shadow-xl sm:p-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-500">Sorteo del repartidor</p>
          <h2 className="text-2xl font-semibold text-stone-900">
            {landed ? `${players[dealer].name} reparte` : 'Eligiendo quién reparte...'}
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {players.map((player, i) => {
            const active = i === highlight;
            const chosen = landed && i === dealer;
            return (
              <li
                key={player.id}
                className={`rounded-2xl border px-4 py-3 text-sm font-medium transition duration-150 ${
                  chosen
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : active
                      ? 'border-amber-400 bg-amber-100 text-stone-900'
                      : 'border-stone-200 bg-stone-50 text-stone-600'
                }`}
              >
                {player.name}
              </li>
            );
          })}
        </ul>
        {landed && (
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
