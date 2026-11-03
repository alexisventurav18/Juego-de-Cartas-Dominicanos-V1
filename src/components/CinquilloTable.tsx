import { Trophy } from 'lucide-react';
import {
  type CinquilloMove,
  type CinquilloState,
  isPlayable,
} from '@/games/cinquillo';
import {
  AMERICAN_RANKS,
  AMERICAN_SUITS,
  type AmericanSuit,
  type Card,
  SUIT_LABEL,
  suitSymbol,
} from '@/games/cards';
import PlayingCard from './PlayingCard';
import SeatBar from './SeatBar';

interface CinquilloTableProps {
  state: CinquilloState;
  seat: number;
  onMove: (move: CinquilloMove) => void;
}

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort(
    (a, b) =>
      AMERICAN_SUITS.indexOf(a.suit as AmericanSuit) - AMERICAN_SUITS.indexOf(b.suit as AmericanSuit) ||
      AMERICAN_RANKS.indexOf(a.rank) - AMERICAN_RANKS.indexOf(b.rank),
  );
}

export default function CinquilloTable({ state, seat, onMove }: CinquilloTableProps) {
  const myTurn = state.phase === 'playing' && state.turn === seat;
  const hand = sortHand(state.hands[seat]);
  const playable = hand.filter((c) => isPlayable(c, state.board));
  const finished = state.phase === 'finished';

  const hint = (() => {
    if (finished) return '';
    if (!myTurn) return `Juega ${state.players[state.turn].name}.`;
    if (state.board.length === 0) return 'Empiezas tú con el 5 de diamantes.';
    if (playable.length === 0) return 'No tienes ninguna carta que encaje: pasa el turno.';
    return 'Toca una carta que encaje en la mesa.';
  })();

  return (
    <div className="space-y-5 sm:space-y-6">
      <SeatBar
        players={state.players}
        mySeat={seat}
        turn={finished ? null : state.turn}
        handCounts={state.hands.map((hand) => hand.length)}
      />

      <section className="rounded-3xl bg-emerald-800 p-3 shadow-inner sm:p-6">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-emerald-200/80">Mesa</p>
        <div className="overflow-x-auto pb-2">
          <div className="mx-auto flex min-w-max flex-col gap-2">
            {AMERICAN_SUITS.map((suit) => (
              <div key={suit} className="flex items-center gap-2 sm:gap-3">
                <span className="flex w-16 shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-100/80 sm:w-20">
                  <span aria-hidden>{suitSymbol(suit)}</span>
                  {SUIT_LABEL[suit]}
                </span>
                <div className="flex gap-1.5 sm:gap-2">
                  {AMERICAN_RANKS.map((rank) => {
                    const placed = state.board.find((c) => c.suit === suit && c.rank === rank);
                    if (placed) return <PlayingCard key={rank} card={placed} size="sm" />;
                    return (
                      <div
                        key={rank}
                        className="h-14 w-10 rounded-md border border-dashed border-emerald-500/60 sm:h-16 sm:w-12"
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {finished ? (
        <FinishPanel state={state} />
      ) : (
        <section className="space-y-5">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {hand.map((c) => {
              const canPlay = myTurn && isPlayable(c, state.board);
              return (
                <PlayingCard
                  key={c.id}
                  card={c}
                  highlighted={canPlay}
                  disabled={!canPlay}
                  onClick={() => onMove({ type: 'play', cardId: c.id })}
                />
              );
            })}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="min-h-5 text-center text-sm text-stone-600">{hint}</p>
            <button
              type="button"
              onClick={() => onMove({ type: 'pass' })}
              disabled={!myTurn || playable.length > 0}
              className="min-h-11 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pasar turno
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function FinishPanel({ state }: { state: CinquilloState }) {
  const names = state.winners.map((s) => state.players[s].name).join(' y ');
  const title =
    state.endReason === 'tranque'
      ? `Tranque: gana ${names} con menos cartas`
      : `${names} se quedó sin cartas`;
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-md">
      <Trophy className="h-8 w-8 text-amber-500" />
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="text-sm text-stone-500">Puedes empezar otra partida con los mismos jugadores.</p>
    </section>
  );
}
