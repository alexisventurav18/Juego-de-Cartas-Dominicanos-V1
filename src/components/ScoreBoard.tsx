export interface TeamScore {
  name: string;
  score: number;
  goal: number;
  extra: string;
  active: boolean;
}

export default function ScoreBoard({ teams }: { teams: TeamScore[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {teams.map((team) => {
        const progress = Math.min(100, Math.max(0, (team.score / team.goal) * 100));
        return (
          <div
            key={team.name}
            className={`rounded-2xl border p-4 transition duration-300 ${
              team.active ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200 bg-white'
            }`}
          >
            <p className="truncate text-sm font-semibold text-stone-900">{team.name}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums text-stone-900">{team.score}</span>
              <span className="text-sm text-stone-500">/ {team.goal}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">{team.extra}</p>
          </div>
        );
      })}
    </div>
  );
}
