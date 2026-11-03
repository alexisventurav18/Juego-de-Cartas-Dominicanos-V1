import { useEffect, useRef, useState } from 'react';

export interface TeamScore {
  name: string;
  score: number;
  goal: number;
  extra: string;
  active: boolean;
  /** Aviso destacado bajo el marcador (p. ej. cierre obligatorio). */
  note?: string;
  /** Cantidad de viraos del equipo. Si se informa, se muestra con animación. */
  viraoCount?: number;
}

export default function ScoreBoard({ teams }: { teams: TeamScore[] }) {
  const previousViraos = useRef<Record<string, number>>({});
  const teamsRef = useRef(teams);
  const [viraoAnimations, setViraoAnimations] = useState<Record<string, 'gain' | 'loss' | null>>({});
  teamsRef.current = teams;
  const viraoData = teams
    .filter((team) => team.viraoCount !== undefined)
    .map((team) => ({ name: team.name, count: team.viraoCount as number }));
  const viraoSignature = viraoData.map((team) => `${team.name}:${team.count}`).join('|');

  useEffect(() => {
    const nextAnimations: Record<string, 'gain' | 'loss' | null> = {};
    const timers: number[] = [];

    teamsRef.current
      .filter((team) => team.viraoCount !== undefined)
      .forEach((team) => {
        const count = team.viraoCount as number;
      const previous = previousViraos.current[team.name];
      if (previous !== undefined && previous !== count) {
        const animation = count > previous ? 'gain' : 'loss';
        nextAnimations[team.name] = animation;
        timers.push(
          window.setTimeout(() => {
            setViraoAnimations((current) => ({ ...current, [team.name]: null }));
          }, 850),
        );
      }
        previousViraos.current[team.name] = count;
      });

    if (Object.keys(nextAnimations).length > 0) {
      setViraoAnimations((current) => ({ ...current, ...nextAnimations }));
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [viraoSignature]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {teams.map((team) => {
        const progress = Math.min(100, Math.max(0, (team.score / team.goal) * 100));
        return (
          <div
            key={team.name}
            className={`rounded-2xl border p-3 transition duration-300 sm:p-4 ${
              team.active ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200 bg-white'
            }`}
          >
            <p className="truncate text-sm font-semibold text-stone-900">{team.name}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-stone-900 sm:text-3xl">{team.score}</span>
              <span className="text-sm text-stone-500">/ {team.goal}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">{team.extra}</p>
            {team.viraoCount !== undefined && (
              <div className="mt-2 flex min-h-7 items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ${
                    viraoAnimations[team.name] === 'gain'
                      ? 'animate-virao-gain'
                      : viraoAnimations[team.name] === 'loss'
                        ? 'animate-virao-loss'
                        : ''
                  }`}
                  aria-live="polite"
                >
                  <span aria-hidden>✨</span>
                  {team.viraoCount} virao{team.viraoCount === 1 ? '' : 's'}
                  {viraoAnimations[team.name] === 'gain' && <span className="ml-1 text-emerald-700">+1</span>}
                  {viraoAnimations[team.name] === 'loss' && <span className="ml-1 text-rose-700">−1</span>}
                </span>
              </div>
            )}
            {team.note && (
              <p className="mt-2 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium leading-snug text-amber-900">
                {team.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
