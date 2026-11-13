import { useEffect, useState } from 'react';
import type { Player } from '@/games/shared';
import { PANEL_BUTTON } from './wood/styles';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="wood-panel w-full max-w-md space-y-5 p-5 text-center sm:p-8">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-200/80">Sorteo del repartidor</p>
          <h2 className="text-2xl font-extrabold text-amber-50">
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
                className={`rounded-xl px-4 py-3 text-sm font-bold transition duration-150 ${
                  chosen
                    ? 'btn-gold shadow-md'
                    : active
                      ? 'bg-amber-400/30 text-amber-50 ring-2 ring-amber-300'
                      : 'bg-black/30 text-amber-100/70 ring-1 ring-amber-200/20'
                }`}
              >
                {player.name}
              </li>
            );
          })}
        </ul>
        {landed && (
          <button type="button" onClick={onDone} className={`${PANEL_BUTTON} w-full`}>
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
