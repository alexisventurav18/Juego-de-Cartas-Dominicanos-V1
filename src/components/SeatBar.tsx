import type { ReactNode } from 'react';
import type { Player } from '@/games/shared';

interface SeatBarProps {
  players: Player[];
  mySeat: number;
  turn: number | null;
  handCounts: number[];
  details: (seat: number) => ReactNode;
}

export default function SeatBar({ players, mySeat, turn, handCounts, details }: SeatBarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {players.map((player, seat) => {
        const isMe = seat === mySeat;
        const isTurn = seat === turn;
        return (
          <div
            key={player.id}
            className={`flex min-w-[8rem] flex-1 flex-col rounded-2xl border px-3 py-2.5 transition duration-300 sm:min-w-[9rem] sm:flex-none sm:px-4 ${
              isTurn
                ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300/60'
                : 'border-stone-200 bg-white'
            }`}
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold text-stone-900">
              <span className="min-w-0 truncate">{player.name}</span>
              {isMe && (
                <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                  Tú
                </span>
              )}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-stone-500">
              <span className="truncate">{details(seat)}</span>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-1 font-semibold tabular-nums text-stone-700"
                aria-label={`${handCounts[seat] ?? 0} cartas en mano`}
                title={`${handCounts[seat] ?? 0} cartas en mano`}
              >
                <span aria-hidden>🂠</span>
                {handCounts[seat] ?? 0}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
