import { Trophy } from 'lucide-react';
import type { ScoreLine } from '@/games/shared';

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
    <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-md">
      <div className="flex items-center gap-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([0, 1] as const).map((team) => (
          <div key={team} className="rounded-xl bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-900">{teamNames[team]}</span>
              <span className="text-sm font-semibold text-emerald-700">
                {totals[team] >= 0 ? `+${totals[team]}` : totals[team]}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
              {lines[team].length === 0 && <li>Sin puntos esta ronda</li>}
              {lines[team].map((line) => (
                <li key={line.label} className="flex justify-between gap-3">
                  <span>
                    <span className={`block ${line.muted ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                      {line.label}
                    </span>
                    {line.detail && (
                      <span className={`block text-xs ${line.muted ? 'text-amber-700' : 'text-stone-500'}`}>
                        {line.detail}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 font-semibold ${line.muted ? 'text-stone-400' : 'text-stone-800'}`}>
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
          <button
            type="button"
            onClick={onNextRound}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            Repartir cartas y continuar
          </button>
        </div>
      )}
      {!onNextRound && waitingFor && (
        <p className="text-center text-sm text-stone-500">Esperando a {waitingFor} para repartir la siguiente ronda.</p>
      )}
    </section>
  );
}
