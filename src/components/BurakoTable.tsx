import { useState } from 'react';
import { type BurakoMove, type BurakoState, BURAKO_TARGET, CANASTA_SIZE, isWild, type Meld } from '@/games/burako';
import { teamName, teamOf } from '@/games/shared';
import PlayingCard, { CardBack } from './PlayingCard';
import RoundResultPanel from './RoundResultPanel';
import ScoreBoard from './ScoreBoard';
import SeatBar from './SeatBar';

interface BurakoTableProps {
  state: BurakoState;
  seat: number;
  onMove: (move: BurakoMove) => void;
}

export default function BurakoTable({ state, seat, onMove }: BurakoTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [meldId, setMeldId] = useState<string | null>(null);

  const team = teamOf(seat);
  const myTurn = state.phase === 'playing' && state.turn === seat;
  const hand = state.hands[seat];
  const topOfPile = state.pile[state.pile.length - 1];

  const clear = () => {
    setSelectedIds([]);
    setMeldId(null);
  };

  const send = (move: BurakoMove) => {
    onMove(move);
    clear();
  };

  const toggleCard = (id: string) => {
    if (!myTurn) return;
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const toggleMeld = (id: string) => {
    if (!myTurn) return;
    setMeldId((current) => (current === id ? null : id));
  };

  const canDraw = myTurn && !state.drawn;
  const canTakePile = canDraw && state.pile.length > 0 && selectedIds.length >= 2;
  const canMeld = myTurn && state.drawn && selectedIds.length >= 3;
  const canDiscard = myTurn && state.drawn && selectedIds.length === 1;

  const hint = (() => {
    if (state.phase !== 'playing') return '';
    if (!myTurn) return `Juega ${state.players[state.turn].name}.`;
    if (!state.drawn) {
      return 'Roba una carta del mazo, o elige dos o más cartas que formen juego con la del pozo.';
    }
    if (meldId) return 'Las cartas elegidas se sumarán al juego que marcaste.';
    return 'Baja juegos si puedes y termina descartando una carta.';
  })();

  return (
    <div className="space-y-5 sm:space-y-6">
      <ScoreBoard
        teams={[0, 1].map((t) => ({
          name: teamName(state.players, t),
          score: state.scores[t],
          goal: BURAKO_TARGET,
          extra: `${state.melds[t].length} juegos en mesa · muerto ${state.muertos[t] ? 'sin tomar' : 'tomado'}`,
          active: t === team,
        }))}
      />

      <SeatBar
        players={state.players}
        mySeat={seat}
        turn={state.phase === 'playing' ? state.turn : null}
        handCounts={state.hands.map((hand) => hand.length)}
      />

      <section className="space-y-5 rounded-3xl bg-emerald-800 p-4 shadow-inner sm:space-y-6 sm:p-6">
        <div className="flex flex-wrap items-end justify-center gap-5 sm:gap-8">
          <div className="flex flex-col items-center gap-2">
            <CardBack size="md" />
            <span className="text-xs font-medium text-emerald-100/80">Mazo ({state.deck.length})</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            {topOfPile ? (
              <PlayingCard card={topOfPile} size="md" />
            ) : (
              <div className="h-24 w-16 rounded-xl border border-dashed border-emerald-500/60 sm:h-28 sm:w-20" />
            )}
            <span className="text-xs font-medium text-emerald-100/80">Pozo ({state.pile.length})</span>
          </div>
        </div>

        <MeldGroup
          title="Juegos de tu pareja"
          melds={state.melds[team]}
          selectedId={meldId}
          onPick={myTurn ? toggleMeld : undefined}
        />
        <MeldGroup title="Juegos del otro equipo" melds={state.melds[1 - team]} />
      </section>

      {state.summary && state.phase !== 'playing' && (
        <RoundResultPanel
          title={state.phase === 'gameOver' && state.winnerTeam !== null
            ? `Ganó ${teamName(state.players, state.winnerTeam)}`
            : state.summary.closedByTeam !== null
              ? `${teamName(state.players, state.summary.closedByTeam)} cerró la ronda ${state.roundNo}`
              : `Resultado de la ronda ${state.roundNo}`}
          lines={state.summary.lines}
          totals={state.summary.totals}
          teamNames={[teamName(state.players, 0), teamName(state.players, 1)]}
          onNextRound={state.phase === 'roundEnd' ? () => send({ type: 'nextRound' }) : undefined}
        />
      )}

      {state.phase === 'playing' && (
        <section className="space-y-5">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {hand.map((c) => (
              <PlayingCard
                key={c.id}
                card={c}
                selected={selectedIds.includes(c.id)}
                disabled={!myTurn}
                onClick={() => toggleCard(c.id)}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="min-h-5 text-center text-sm text-stone-600">{hint}</p>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3">
              <ActionButton
                disabled={!canDraw}
                onClick={() => send({ type: 'draw' })}
                primary
              >
                Robar carta
              </ActionButton>
              <ActionButton
                disabled={!canTakePile}
                onClick={() => send({ type: 'takePile', handIds: selectedIds, meldId: meldId ?? undefined })}
              >
                Levantar pozo
              </ActionButton>
              <ActionButton
                disabled={!canMeld}
                onClick={() => send({ type: 'meld', handIds: selectedIds, meldId: meldId ?? undefined })}
              >
                Bajar juego
              </ActionButton>
              <ActionButton
                disabled={!canDiscard}
                onClick={() => send({ type: 'discard', cardId: selectedIds[0] })}
              >
                Descartar
              </ActionButton>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  const style = primary
    ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'
    : 'border border-stone-300 bg-white text-stone-800 hover:border-stone-400';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl px-3 py-2.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:text-sm ${style}`}
    >
      {children}
    </button>
  );
}

function MeldGroup({
  title,
  melds,
  selectedId,
  onPick,
}: {
  title: string;
  melds: Meld[];
  selectedId?: string | null;
  onPick?: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">{title}</p>
      {melds.length === 0 ? (
        <p className="text-sm text-emerald-100/60">Todavía no hay juegos bajados.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {melds.map((meld) => {
            const canasta = meld.cards.length >= CANASTA_SIZE;
            const clean = meld.cards.every((c) => !isWild(c));
            const selected = selectedId === meld.id;
            const content = (
              <>
                <div className="flex gap-1">
                  {meld.cards.map((c) => (
                    <PlayingCard key={c.id} card={c} size="sm" />
                  ))}
                </div>
                {canasta && (
                  <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                    {clean ? 'Canasta limpia' : 'Canasta sucia'}
                  </span>
                )}
              </>
            );
            if (!onPick) {
              return (
                <div key={meld.id} className="flex flex-col items-start rounded-xl bg-emerald-900/40 p-2">
                  {content}
                </div>
              );
            }
            return (
              <button
                key={meld.id}
                type="button"
                onClick={() => onPick(meld.id)}
                className={`flex flex-col items-start rounded-xl p-2 transition duration-200 hover:bg-emerald-900/60 ${
                  selected ? 'bg-emerald-900/70 ring-2 ring-amber-400' : 'bg-emerald-900/40'
                }`}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
