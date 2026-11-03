import type { Player } from '@/games/shared';

interface SeatBarProps {
  players: Player[];
  mySeat: number;
  turn: number | null;
  handCounts: number[];
}

export default function SeatBar({ players, mySeat, turn, handCounts }: SeatBarProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
      {players.map((player, seat) => {
        const isMe = seat === mySeat;
        const isTurn = seat === turn;
        const handCount = handCounts[seat] ?? 0;
        const handLabel = `${handCount} ${handCount === 1 ? 'carta' : 'cartas'} en mano`;
        return (
          <div
            key={player.id}
            className={`flex min-w-0 flex-col rounded-xl border px-2 py-2 transition duration-300 sm:min-w-[9rem] sm:flex-none sm:rounded-2xl sm:px-4 sm:py-2.5 ${
              isTurn
                ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300/60'
                : 'border-stone-200 bg-white'
            }`}
          >
            <span className="flex items-center justify-between gap-1 text-xs font-semibold text-stone-900 sm:gap-2 sm:text-sm">
              <span className="min-w-0 truncate">{player.name}</span>
              {isMe && (
                  <span className="shrink-0 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white sm:px-2 sm:text-[10px]">
                  Tú
                </span>
              )}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-stone-500 sm:mt-1 sm:gap-2 sm:text-xs">
              <span className="truncate">Mano</span>
              <span
                className="inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-full bg-stone-100 px-1.5 py-0.5 font-semibold tabular-nums text-stone-700 sm:gap-1 sm:px-2 sm:py-1"
                aria-label={handLabel}
                title={handLabel}
              >
                <span aria-hidden>🂠</span>
                {handCount}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
