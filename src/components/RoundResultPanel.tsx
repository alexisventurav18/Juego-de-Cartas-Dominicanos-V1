import { Trophy } from 'lucide-react';
import type { ScoreLine } from '@/games/shared';
import { PANEL_BUTTON } from './wood/styles';

interface RoundResultPanelProps {
  title: string;
  lines: [ScoreLine[], ScoreLine[]];
  totals: [number, number];
  teamNames: [string, string];
  onNextRound?: () => void;
  waitingFor?: string;
}

export default function RoundResultPanel({ title, lines, totals, teamNames, onNextRound, waitingFor }: RoundResultPanelProps) {
  return (
    <section className="wood-panel space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-5 w-5 text-amber-300" />
        <h2 className="text-lg font-extrabold text-amber-50">{title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([0, 1] as const).map((team) => (
          <div key={team} className="rounded-xl bg-black/30 p-3 ring-1 ring-amber-200/20 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-amber-50">{teamNames[team]}</span>
              <span className="text-sm font-extrabold text-amber-300">
                {totals[team] >= 0 ? `+${totals[team]}` : totals[team]}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-amber-100/80">
              {lines[team].length === 0 && <li>Sin puntos esta ronda</li>}
              {lines[team].map((line) => (
                <li key={line.label} className="flex justify-between gap-3">
                  <span>
                    <span className={`block ${line.muted ? 'text-amber-100/40 line-through' : 'text-amber-50'}`}>
                      {line.label}
                    </span>
                    {line.detail && (
                      <span className={`block text-xs ${line.muted ? 'text-amber-300' : 'text-amber-100/60'}`}>
                        {line.detail}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 font-bold ${line.muted ? 'text-amber-100/40' : 'text-amber-50'}`}>
                    {line.muted ? '0' : line.points >= 0 ? `+${line.points}` : line.points}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {onNextRound && (
        <div className="flex justify-center">
          <button type="button" onClick={onNextRound} className={PANEL_BUTTON}>
            Repartir cartas y continuar
          </button>
        </div>
      )}
      {!onNextRound && waitingFor && (
        <p className="text-center text-sm text-amber-100/70">Esperando a {waitingFor} para repartir la siguiente ronda.</p>
      )}
    </section>
  );
}
