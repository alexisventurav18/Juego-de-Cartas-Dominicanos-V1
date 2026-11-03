import { useEffect, useRef, useState } from 'react';
import {
  CASINO_TARGET,
  type CasinoMove,
  type CasinoState,
  closingLabel,
  closingNeeds,
  isCaptureForced,
  nextDealerSeat,
} from '@/games/casino';
import {
  canCapture,
  captureValues,
  convertValue,
  expansionToPairsValue,
  expansionValue,
  formationValue,
  isLegalCapture,
  raiseValue,
  tableItems,
} from '@/games/casinoCapture';
import { isBotPlayer, teamName, teamOf } from '@/games/shared';
import CapturedPile from './CapturedPile';
import CaptureFlight from './CaptureFlight';
import ClosingZoneBanner, { type ClosingAlert } from './ClosingZoneBanner';
import DealerReveal from './DealerReveal';
import DealFlight from './DealFlight';
import FaceDownStack from './FaceDownStack';
import PlayingCard, { CardBack } from './PlayingCard';
import RoundResultPanel from './RoundResultPanel';
import ScoreBoard from './ScoreBoard';
import SeatBar from './SeatBar';
import TableBuild from './TableBuild';
import { useDealIntro } from './useDealIntro';
import VictoryCelebration from './VictoryCelebration';
import DefeatNotice from './DefeatNotice';

interface CasinoTableProps {
  state: CasinoState;
  seat: number;
  onMove: (move: CasinoMove) => void;
}

export default function CasinoTable({ state, seat, onMove }: CasinoTableProps) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [tableIds, setTableIds] = useState<string[]>([]);
  const deal = useDealIntro(state.roundNo, state.players.length);
  const deckDisplayCount = deal.dealing
    ? state.deck.length + Math.max(0, deal.dealSteps - Math.min(deal.revealed, deal.dealSteps))
    : state.deck.length;
  const [dealerOpen, setDealerOpen] = useState(state.roundNo === 1 && !state.players.some(isBotPlayer));
  const [endNoticeDismissedRound, setEndNoticeDismissedRound] = useState<number | null>(null);
  const [closingDismissedRound, setClosingDismissedRound] = useState<number | null>(null);
  const [pointCardId, setPointCardId] = useState<string | null>(null);
  const [captureFlightKey, setCaptureFlightKey] = useState<string | null>(null);
  const lastAnimatedCaptureKey = useRef<string | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  const myTurn = state.phase === 'playing' && state.turn === seat && !deal.dealing;
  const card = state.hands[seat].find((c) => c.id === cardId) ?? null;
  const handAfter = card ? state.hands[seat].filter((c) => c.id !== card.id) : [];
  const items = tableItems(state.table, state.builds);
  const selectedItems = items.filter((item) => tableIds.includes(item.id));
  const selectedLoose = state.table.filter((c) => tableIds.includes(c.id));
  const selectedBuilds = state.builds.filter((build) => tableIds.includes(build.id));
  const capturedTotal = state.captured.reduce(
    (total, groups) => total + groups.reduce((groupTotal, group) => groupTotal + group.cards.length, 0),
    0,
  );

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
  const expandedPairsValue = expandTarget && card
    ? expansionToPairsValue(card, expandTarget, selectedLoose, handAfter)
    : null;
  const expandedValue = expandTarget && card
    ? expandedPairsValue ?? expansionValue(card, expandTarget, selectedLoose, handAfter)
    : null;
  const convertedValue = raiseTarget && card ? convertValue(card, raiseTarget, handAfter) : null;
  const mergeCard =
    sumValue !== null
      ? (state.table.find((c) => captureValues(c).includes(sumValue) && !tableIds.includes(c.id)) ?? null)
      : null;
  const nextDealer = nextDealerSeat(state);
  const showEndNotice = state.phase === 'gameOver' && endNoticeDismissedRound !== state.roundNo;
  const iWon = state.winnerTeam === teamOf(seat);
  const closingAlerts: ClosingAlert[] = [0, 1].flatMap((team) => {
    const needs = closingNeeds(state.scores[team]);
    if (!needs) return [];
    const entered = state.summary !== null && (state.summary.needs?.[team] ?? null) === null;
    return [{ team: teamName(state.players, team), score: state.scores[team], needs, entered }];
  });
  const showClosingAlert =
    closingAlerts.length > 0 && state.phase !== 'gameOver' && !deal.dealing && closingDismissedRound !== state.roundNo;

  const captureNotice = state.lastCapture;
  const currentCaptureKey = captureNotice
    ? `${state.roundNo}:${captureNotice.seat}:${captureNotice.card.id}:${captureNotice.capturedCount}:${captureNotice.virao ? 'v' : 'n'}`
    : null;

  useEffect(() => {
    if (!currentCaptureKey || currentCaptureKey === lastAnimatedCaptureKey.current) return;
    lastAnimatedCaptureKey.current = currentCaptureKey;
    setCaptureFlightKey(currentCaptureKey);
    const timer = window.setTimeout(() => setCaptureFlightKey(null), 950);
    return () => window.clearTimeout(timer);
  }, [currentCaptureKey]);

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
    if (card) {
      if (isCasinoPointCard(card)) {
        setPointCardId(card.id);
        window.setTimeout(() => setPointCardId(null), 1000);
      }
      submit({ type: 'play', cardId: card.id, captureIds: [] });
    }
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
    <div className="space-y-3 sm:space-y-6">
      {dealerOpen && (
        <DealerReveal players={state.players} dealer={state.dealer} onDone={() => setDealerOpen(false)} />
      )}
      {showEndNotice &&
        (iWon ? (
          <VictoryCelebration onContinue={() => setEndNoticeDismissedRound(state.roundNo)} />
        ) : (
          <DefeatNotice onContinue={() => setEndNoticeDismissedRound(state.roundNo)} />
        ))}
      {showClosingAlert && (
        <ClosingZoneBanner alerts={closingAlerts} onDismiss={() => setClosingDismissedRound(state.roundNo)} />
      )}
      <ScoreBoard
        teams={[0, 1].map((team) => {
          const needs = closingNeeds(state.scores[team]);
          const capturedCount = state.captured[team].reduce((sum, group) => sum + group.cards.length, 0);
          return {
            name: teamName(state.players, team),
            score: state.scores[team],
            goal: CASINO_TARGET,
            extra: `${capturedCount} cartas capturadas`,
            active: teamOf(seat) === team,
            viraoCount: state.viraos[team],
            note: needs
              ? `Cierre obligatorio: solo suma con ${closingLabel(needs)} (faltan ${CASINO_TARGET - state.scores[team]} pts).`
              : undefined,
          };
        })}
      />

      <SeatBar
        players={state.players}
        mySeat={seat}
        turn={state.phase === 'playing' && !deal.dealing ? state.turn : null}
        handCounts={state.hands.map((hand) => hand.length)}
      />

      <section className="relative overflow-hidden rounded-2xl bg-emerald-800 p-2 shadow-inner sm:rounded-3xl sm:p-8">
        <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200/80 sm:mb-4 sm:text-xs sm:tracking-widest">
          Mesa
        </p>
        <div className="grid w-full grid-cols-4 items-end justify-items-center gap-x-1 gap-y-2 md:flex md:items-center md:justify-center md:gap-10">
          <div ref={deckRef} className="col-span-1 flex min-w-0 flex-col items-center justify-start gap-1 md:w-auto md:gap-2">
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-100/80 sm:text-xs sm:tracking-widest">
              Mazo
            </p>
            <FaceDownStack
              count={deckDisplayCount}
              displayCount={deckDisplayCount}
              pulseKey={deal.dealing ? deal.revealed : undefined}
              size="deck"
              shakeFrame={deal.dealing ? deal.revealed : undefined}
            />
          </div>
          {state.table.length === 0 && state.builds.length === 0 && !deal.dealing && (
            <p className="col-span-3 text-center text-sm text-emerald-100/70 md:col-span-1">La mesa está vacía.</p>
          )}
          {state.table.map((c, i) =>
            <div key={c.id} className="flex min-w-0 justify-center">
                  {deal.isTableDealt(i) ? (
                    <DealFlight origin={deckRef} animate={deal.dealing}>
                      <div className={c.id === pointCardId ? 'relative animate-point-drop' : ''}>
                        <PlayingCard
                          card={c}
                          size="table"
                          selected={tableIds.includes(c.id)}
                          disabled={!myTurn || !card}
                          onClick={() => pickTableItem(c.id)}
                        />
                        {c.id === pointCardId && (
                          <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-stone-900 shadow-md">
                            Carta de puntos
                          </span>
                        )}
                      </div>
                    </DealFlight>
                  ) : (
                    <CardBack size="lg" />
                  )}
            </div>,
          )}
          {state.builds.map((b) => (
            <div key={b.id} className="col-span-2 flex min-w-0 justify-center md:contents">
              <TableBuild
                build={b}
                selected={tableIds.includes(b.id)}
                disabled={!myTurn || !card}
                onSelect={() => pickTableItem(b.id)}
              />
            </div>
          ))}
        </div>
        {captureNotice && captureFlightKey === currentCaptureKey && (
          <CaptureFlight
            playerName={state.players[captureNotice.seat]?.name ?? 'Jugador'}
            card={captureNotice.card}
            capturedCount={captureNotice.capturedCount}
            virao={captureNotice.virao}
          />
        )}
      </section>

      <section className="hidden gap-5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:grid sm:grid-cols-2 sm:gap-6 sm:p-6">
        {([0, 1] as const).map((team) => (
          <CapturedPile key={team} title={teamName(state.players, team)} groups={state.captured[team]} />
        ))}
      </section>

      <details className="rounded-2xl border border-stone-200 bg-white shadow-sm sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-stone-700">
          <span>Cartas capturadas</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 tabular-nums text-stone-600">{capturedTotal}</span>
        </summary>
        <div className="grid gap-3 border-t border-stone-100 p-3">
          {([0, 1] as const).map((team) => (
            <CapturedPile key={team} title={teamName(state.players, team)} groups={state.captured[team]} />
          ))}
        </div>
      </details>

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
        <section className="space-y-3 sm:space-y-5">
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-3">
            {state.hands[seat].map((c, i) =>
              deal.isHandDealt(seat, i) ? (
                <DealFlight key={c.id} origin={deckRef} animate={deal.dealing}>
                    <PlayingCard
                    card={c}
                      size="hand"
                    selected={c.id === cardId}
                    disabled={!myTurn}
                    onClick={() => pickCard(c.id)}
                  />
                </DealFlight>
              ) : (
                <CardBack key={c.id} size="xl" />
              ),
            )}
          </div>
          <div className="sticky bottom-2 z-20 flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-stone-100/95 p-2 shadow-lg backdrop-blur sm:static sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <p className="min-h-4 text-center text-xs leading-snug text-stone-600 sm:min-h-5 sm:text-sm">{hint}</p>
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={capture}
                disabled={!captureReady}
                className="min-h-10 rounded-xl bg-emerald-700 px-2 py-2 text-[11px] font-medium leading-tight text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Llevarme las cartas
              </button>
              <button
                type="button"
                onClick={raise}
                disabled={raisedValue === null}
                className="min-h-10 rounded-xl bg-amber-500 px-2 py-2 text-[11px] font-medium leading-tight text-stone-900 shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Subir combinación
              </button>
              <button
                type="button"
                onClick={convert}
                disabled={convertedValue === null}
                className="min-h-10 rounded-xl border border-amber-500 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {raiseTarget?.kind === 'pairs' ? 'Ampliar pares' : 'Convertir en pares'}
              </button>
              <button
                type="button"
                onClick={buildSum}
                disabled={sumValue === null}
                className="min-h-10 rounded-xl border border-emerald-600 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Formar sumatoria
              </button>
              {mergeCard && (
                <button
                  type="button"
                  onClick={buildSumAndPairs}
                  className="min-h-10 rounded-xl border border-emerald-600 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-emerald-800 transition hover:bg-emerald-50 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Sumatoria y pares
                </button>
              )}
              <button
                type="button"
                onClick={buildPairs}
                disabled={pairsValue === null}
                className="min-h-10 rounded-xl border border-emerald-600 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Formar pares
              </button>
              <button
                type="button"
                onClick={expand}
                disabled={expandedValue === null}
                className="min-h-10 rounded-xl border border-emerald-600 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Ampliar combinación
              </button>
              <button
                type="button"
                onClick={drop}
                disabled={!canDrop || !card}
                className="min-h-10 rounded-xl border border-stone-300 bg-white px-2 py-2 text-[11px] font-medium leading-tight text-stone-800 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm"
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

function isCasinoPointCard(card: { rank: number; suit: string }): boolean {
  return card.rank === 1 || (card.suit === 'diamantes' && card.rank === 10) || (card.suit === 'picas' && card.rank === 2);
}
