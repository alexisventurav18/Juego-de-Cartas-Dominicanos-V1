import type { ReactNode } from 'react';
import type { Player } from '@/games/shared';

interface SeatBarProps {
  players: Player[];
  mySeat: number;
  turn: number | null;
  details: (seat: number) => ReactNode;
}

export default function SeatBar({ players, mySeat, turn, details }: SeatBarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {players.map((player, seat) => {
        const isMe = seat === mySeat;
        const isTurn = seat === turn;
        return (
          <div
            key={player.id}
            className={`flex min-w-[9rem] flex-col rounded-2xl border px-4 py-2.5 transition duration-300 ${
              isTurn
                ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300/60'
                : 'border-stone-200 bg-white'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <span className="truncate">{player.name}</span>
              {isMe && (
                <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                  Tú
                </span>
              )}
            </span>
            <span className="text-xs text-stone-500">{details(seat)}</span>
          </div>
        );
      })}
    </div>
  );
}
