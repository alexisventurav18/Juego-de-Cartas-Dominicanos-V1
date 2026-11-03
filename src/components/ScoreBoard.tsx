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
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      {teams.map((team) => {
        const progress = Math.min(100, Math.max(0, (team.score / team.goal) * 100));
        return (
          <div
            key={team.name}
            className={`rounded-xl border p-2.5 transition duration-300 sm:rounded-2xl sm:p-4 ${
              team.active ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200 bg-white'
            }`}
          >
            <p className="truncate text-xs font-semibold text-stone-900 sm:text-sm">{team.name}</p>
            <p className="mt-0.5 flex items-baseline gap-1 sm:mt-1 sm:gap-1.5">
              <span className="text-xl font-semibold tabular-nums text-stone-900 sm:text-3xl">{team.score}</span>
              <span className="text-[11px] text-stone-500 sm:text-sm">/ {team.goal}</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-200 sm:mt-3 sm:h-1.5">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 truncate text-[10px] text-stone-500 sm:mt-2 sm:text-xs">{team.extra}</p>
            {team.viraoCount !== undefined && (
              <div className="mt-1 flex min-h-6 items-center sm:mt-2 sm:min-h-7">
                <span
                  className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 sm:px-2.5 sm:py-1 sm:text-xs ${
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
              <p className="mt-1 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-medium leading-snug text-amber-900 sm:mt-2 sm:px-2.5 sm:py-1.5 sm:text-xs">
                {team.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
