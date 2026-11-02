import { useState } from 'react';
import { CASINO_TARGET, type CasinoMove, type CasinoState, isCaptureForced, nextDealerSeat } from '@/games/casino';
import {
  canCapture,
  convertValue,
  expansionValue,
  formationValue,
  isLegalCapture,
  raiseValue,
  tableItems,
} from '@/games/casinoCapture';
import { isBotPlayer, teamName, teamOf } from '@/games/shared';
import CapturedPile from './CapturedPile';
import DealerReveal from './DealerReveal';
import FaceDownStack from './FaceDownStack';
import PlayingCard, { CardBack } from './PlayingCard';
import RoundResultPanel from './RoundResultPanel';
import ScoreBoard from './ScoreBoard';
import SeatBar from './SeatBar';
import TableBuild from './TableBuild';
import { useDealIntro } from './useDealIntro';
import VictoryCelebration from './VictoryCelebration';

interface CasinoTableProps {
  state: CasinoState;
  seat: number;
  onMove: (move: CasinoMove) => void;
}

export default function CasinoTable({ state, seat, onMove }: CasinoTableProps) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [tableIds, setTableIds] = useState<string[]>([]);
  const deal = useDealIntro(state.roundNo, state.players.length);
  const [dealerOpen, setDealerOpen] = useState(state.roundNo === 1 && !state.players.some(isBotPlayer));
  const [victoryDismissedRound, setVictoryDismissedRound] = useState<number | null>(null);

  const myTurn = state.phase === 'playing' && state.turn === seat && !deal.dealing;
  const card = state.hands[seat].find((c) => c.id === cardId) ?? null;
  const handAfter = card ? state.hands[seat].filter((c) => c.id !== card.id) : [];
  const items = tableItems(state.table, state.builds);
  const selectedItems = items.filter((item) => tableIds.includes(item.id));
  const selectedLoose = state.table.filter((c) => tableIds.includes(c.id));
  const selectedBuilds = state.builds.filter((build) => tableIds.includes(build.id));

  const mustCapture = myTurn && isCaptureForced(state, seat);
  const cardCanCapture = card !== null && canCapture(card, items, seat);
  const captureReady = card !== null && isLegalCapture(card, selectedItems, seat);
  const canDrop = card !== null && selectedItems.length === 0 && !mustCapture;
  const canFormCombination = card !== null;
  const noBuildSelected = canFormCombination && selectedBuilds.length === 0;
  const sumValue = noBuildSelected ? formationValue('sum', card, selectedLoose, handAfter) : null;
  const pairsValue = noBuildSelected ? formationValue('pairs', card, selectedLoose, handAfter) : null;
  const raiseTarget =
    canFormCombination && selectedBuilds.length === 1 && selectedLoose.length === 0
      ? selectedBuilds[0]
      : null;
  const raisedValue = raiseTarget && card ? raiseValue(card, raiseTarget, handAfter) : null;
  const expandTarget =
    canFormCombination && selectedBuilds.length === 1 && selectedLoose.length > 0 ? selectedBuilds[0] : null;
  const expandedValue = expandTarget && card ? expansionValue(card, expandTarget, selectedLoose, handAfter) : null;
  const convertedValue = raiseTarget && card ? convertValue(card, raiseTarget, handAfter) : null;
  const mergeCard =
    sumValue !== null ? (state.table.find((c) => c.rank === sumValue && !tableIds.includes(c.id)) ?? null) : null;
  const nextDealer = nextDealerSeat(state);
  const showVictory =
    state.phase === 'gameOver' && state.winnerTeam === teamOf(seat) && victoryDismissedRound !== state.roundNo;

  const reset = () => {
    setCardId(null);
    setTableIds([]);
  };

  const pickCard = (id: string) => {
    if (!myTurn) return;
    setCardId((prev) => (prev === id ? null : id));
    setTableIds([]);
  };

  const pickTableItem = (id: string) => {
    if (!myTurn || !card) return;
    setTableIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const submit = (move: CasinoMove) => {
    onMove(move);
    reset();
  };

  const capture = () => {
    if (card) submit({ type: 'play', cardId: card.id, captureIds: tableIds });
  };

  const drop = () => {
    if (card) submit({ type: 'play', cardId: card.id, captureIds: [] });
  };

  const buildSum = () => {
    if (card) submit({ type: 'build', cardId: card.id, kind: 'sum', tableIds: selectedLoose.map((c) => c.id) });
  };

  const buildPairs = () => {
    if (card) submit({ type: 'build', cardId: card.id, kind: 'pairs', tableIds: selectedLoose.map((c) => c.id) });
  };

  const raise = () => {
    if (card && raiseTarget) submit({ type: 'raise', cardId: card.id, buildId: raiseTarget.id });
  };

  const expand = () => {
    if (card && expandTarget) {
      submit({
        type: 'expand',
        cardId: card.id,
        buildId: expandTarget.id,
        tableIds: selectedLoose.map((c) => c.id),
      });
    }
  };

  const convert = () => {
    if (card && raiseTarget) submit({ type: 'convert', cardId: card.id, buildId: raiseTarget.id });
  };

  const buildSumAndPairs = () => {
    if (card && mergeCard) {
      submit({
        type: 'build',
        cardId: card.id,
        kind: 'sum',
        tableIds: selectedLoose.map((c) => c.id),
        mergeId: mergeCard.id,
      });
    }
  };

  const hint = (() => {
    if (state.phase !== 'playing') return '';
    if (deal.dealing) {
      if (deal.dealingTo === null) return 'Barajando el mazo...';
      if (deal.dealingTo === 'table') return 'Poniendo cartas en la mesa...';
      return `Repartiendo a ${state.players[deal.dealingTo].name}...`;
    }
    if (!myTurn) return `Turno de ${state.players[state.turn].name}.`;
    if (!card) return mustCapture
      ? 'Tienes una jugada para llevarte cartas: elige una carta que pueda capturar.'
      : 'Elige una carta de tu mano.';
    if (captureReady) return 'Listo: te llevas las cartas seleccionadas.';
    if (expandedValue !== null) return `Puedes ampliar la combinación a ${expandedValue} con tu carta y las cartas sueltas.`;
    if (raisedValue !== null) return `Puedes subir la combinación a ${raisedValue} con tu carta.`;
    if (convertedValue !== null) {
      return raiseTarget?.kind === 'pairs'
        ? `Puedes añadir una carta de ${convertedValue} a tus pares.`
        : `Puedes convertir la sumatoria en pares de ${convertedValue}.`;
    }
    if (sumValue !== null && mergeCard) {
      return `Puedes formar una sumatoria de ${sumValue} y unirla a la carta ${sumValue} de la mesa para hacer pares.`;
    }
    if (sumValue !== null) return `Puedes formar una sumatoria de ${sumValue}.`;
    if (pairsValue !== null) return `Puedes formar pares de ${pairsValue}.`;
    if (selectedItems.length > 0) return 'Esa selección no es válida con tu carta.';
    if (mustCapture) {
      return cardCanCapture
        ? 'Tienes una jugada: elige las cartas de la mesa que te llevas.'
        : 'Con esta carta no puedes llevarte nada: elige otra carta.';
    }
    return 'Deja tu carta en la mesa o une cartas sueltas para formar una combinación.';
  })();

  return (
    <div className="space-y-6">
      {dealerOpen && (
        <DealerReveal players={state.players} dealer={state.dealer} onDone={() => setDealerOpen(false)} />
      )}
      {showVictory && <VictoryCelebration onContinue={() => setVictoryDismissedRound(state.roundNo)} />}
      <ScoreBoard
        teams={[0, 1].map((team) => {
          const capturedCount = state.captured[team].reduce((sum, group) => sum + group.cards.length, 0);
          return {
            name: teamName(state.players, team),
            score: state.scores[team],
            goal: CASINO_TARGET,
            extra: `${capturedCount} cartas · ${state.viraos[team]} virao${state.viraos[team] === 1 ? '' : 's'}`,
            active: teamOf(seat) === team,
          };
        })}
      />

      <SeatBar
        players={state.players}
        mySeat={seat}
        turn={state.phase === 'playing' && !deal.dealing ? state.turn : null}
        details={(s) => `${state.hands[s].length} ${state.hands[s].length === 1 ? 'carta' : 'cartas'} en mano`}
      />

      <section className="relative overflow-hidden rounded-3xl bg-emerald-800 p-5 shadow-inner sm:p-8">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-emerald-200/80">Mesa</p>
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-10">
          <div className="flex flex-col items-center gap-3">
            <FaceDownStack
              count={state.deck.length}
              size="lg"
              shakeFrame={deal.shuffling ? deal.shuffleFrame : undefined}
            />
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-100/80">
              Mazo · {state.deck.length}
            </p>
          </div>
          <div className="flex min-h-36 flex-1 flex-wrap items-center justify-center gap-3 sm:gap-4">
            {state.table.length === 0 && state.builds.length === 0 && !deal.dealing && (
              <p className="text-sm text-emerald-100/70">La mesa está vacía.</p>
            )}
            {state.builds.map((b) => (
              <TableBuild
                key={b.id}
                build={b}
                selected={tableIds.includes(b.id)}
                disabled={!myTurn || !card}
                onSelect={() => pickTableItem(b.id)}
              />
            ))}
            {state.table.map((c, i) =>
              deal.isTableDealt(i) ? (
                <PlayingCard
                  key={c.id}
                  card={c}
                  size="lg"
                  selected={tableIds.includes(c.id)}
                  disabled={!myTurn || !card}
                  onClick={() => pickTableItem(c.id)}
                />
              ) : (
                <CardBack key={c.id} size="lg" />
              ),
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
        {([0, 1] as const).map((team) => (
          <CapturedPile key={team} title={teamName(state.players, team)} groups={state.captured[team]} />
        ))}
      </section>

      {state.summary && state.phase !== 'playing' && (
        <RoundResultPanel
          title={state.phase === 'gameOver' && state.winnerTeam !== null
            ? `Ganó ${teamName(state.players, state.winnerTeam)}`
            : `Resultado de la ronda ${state.roundNo}`}
          lines={state.summary.lines}
          totals={state.summary.totals}
          teamNames={[teamName(state.players, 0), teamName(state.players, 1)]}
          onNextRound={state.phase === 'roundEnd' && seat === nextDealer ? () => onMove({ type: 'nextRound' }) : undefined}
          waitingFor={state.phase === 'roundEnd' ? state.players[nextDealer].name : undefined}
        />
      )}

      {state.phase === 'playing' && (
        <section className="space-y-5">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {state.hands[seat].map((c, i) =>
              deal.isHandDealt(seat, i) ? (
                <PlayingCard
                  key={c.id}
                  card={c}
                  size="xl"
                  selected={c.id === cardId}
                  disabled={!myTurn}
                  onClick={() => pickCard(c.id)}
                />
              ) : (
                <CardBack key={c.id} size="xl" />
              ),
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="min-h-5 text-center text-sm text-stone-600">{hint}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={capture}
                disabled={!captureReady}
                className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
              >
                Llevarme las cartas
              </button>
              <button
                type="button"
                onClick={raise}
                disabled={raisedValue === null}
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-stone-900 shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
              >
                Subir combinación
              </button>
              <button
                type="button"
                onClick={convert}
                disabled={convertedValue === null}
                className="rounded-xl border border-amber-500 bg-white px-5 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              >
                {raiseTarget?.kind === 'pairs' ? 'Ampliar pares' : 'Convertir en pares'}
              </button>
              <button
                type="button"
                onClick={buildSum}
                disabled={sumValue === null}
                className="rounded-xl border border-emerald-600 bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              >
                Formar sumatoria
              </button>
              {mergeCard && (
                <button
                  type="button"
                  onClick={buildSumAndPairs}
                  className="rounded-xl border border-emerald-600 bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                >
                  Sumatoria y pares
                </button>
              )}
              <button
                type="button"
                onClick={buildPairs}
                disabled={pairsValue === null}
                className="rounded-xl border border-emerald-600 bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              >
                Formar pares
              </button>
              <button
                type="button"
                onClick={expand}
                disabled={expandedValue === null}
                className="rounded-xl border border-emerald-600 bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
              >
                Ampliar combinación
              </button>
              <button
                type="button"
                onClick={drop}
                disabled={!canDrop || !card}
                className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dejar en la mesa
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
