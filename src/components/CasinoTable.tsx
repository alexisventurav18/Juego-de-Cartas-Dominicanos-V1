import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  type CasinoMove,
  type CasinoState,
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
import CartaUI, { CARTA_ALTURA, DorsoUI } from './CartaUI';
import CasinoHud from './CasinoHud';
import ClosingZoneBanner, { type ClosingAlert } from './ClosingZoneBanner';
import DealerReveal from './DealerReveal';
import DealFlight from './DealFlight';
import RoundResultPanel from './RoundResultPanel';
import TableBuild from './TableBuild';
import { useDealIntro } from './useDealIntro';
import VictoryCelebration from './VictoryCelebration';
import DefeatNotice from './DefeatNotice';
import WoodShell from './wood/WoodShell';
import { ACTION_DROP, ACTION_FORM, ACTION_MAIN, CHIP_BUTTON } from './wood/styles';

interface CasinoTableProps {
  state: CasinoState;
  seat: number;
  onMove: (move: CasinoMove) => void;
  /** Botón de salir dentro de la barra superior (la pantalla del Casino ocupa todo el viewport). */
  onLeave?: () => void;
  /** Texto de la sala o partida, visible en la hoja de cartas capturadas. */
  roomLabel?: string;
  connection?: 'connected' | 'connecting' | 'offline';
  /** Aviso de error o información pasajera. */
  notice?: string | null;
  /** Contenido extra del panel de resultados (p. ej. el botón "Jugar otra partida"). */
  resultFooter?: ReactNode;
}

export default function CasinoTable({ state, seat, onMove, onLeave, roomLabel, connection, notice, resultFooter }: CasinoTableProps) {
  const [cardId, setCardId] = useState<string | null>(null);
  const [capturedOpen, setCapturedOpen] = useState(false);
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
    if (expandedValue !== null) {
      return expandTarget?.kind === 'pairs'
        ? `Puedes apilar tu carta y las cartas sueltas sobre el par de ${expandedValue}.`
        : `Puedes ampliar la combinación a ${expandedValue} con tu carta y las cartas sueltas.`;
    }
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

  // En móvil el jugador activo ya se ve resaltado en su tarjeta: la pista no repite su nombre.
  const hintMobile = (() => {
    if (state.phase !== 'playing') return '';
    if (deal.dealing) return typeof deal.dealingTo === 'number' ? 'Repartiendo cartas...' : hint;
    if (!myTurn) return 'Esperando jugada...';
    return hint;
  })();

  // Con muchos grupos en la mesa las cartas se achican solas para que nada quede fuera de pantalla.
  const mesaWeight = state.table.length + state.builds.length * 2.2;
  const mesaVars: CSSProperties | undefined =
    mesaWeight > 16
      ? ({ '--mesa-h': '7.5dvh', '--mesa-h-sm': '10dvh' } as CSSProperties)
      : mesaWeight > 10
        ? ({ '--mesa-h': '9.5dvh', '--mesa-h-sm': '12.5dvh' } as CSSProperties)
        : undefined;
  const statusText =
    state.phase === 'gameOver' ? 'Fin' : state.phase === 'roundEnd' ? 'Fin de ronda' : deal.dealing ? 'Reparto' : '';
  const hand = state.hands[seat];
  const handGap = hand.length >= 4 ? '-ml-3 first:ml-0 sm:ml-1 sm:first:ml-0' : 'ml-1.5 first:ml-0 sm:ml-2 sm:first:ml-0';
  const showRaise = raiseTarget !== null;
  const showExpand = expandTarget !== null;
  const showFormation = !showRaise && !showExpand;
  const actionMain = ACTION_MAIN;
  const actionForm = ACTION_FORM;
  const actionDrop = ACTION_DROP;

  return (
    <WoodShell>
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

      {/* 1. HUD: marcador, turno, mazo y manos de los rivales */}
      <div className="h-[17dvh] shrink-0">
        <CasinoHud
          state={state}
          seat={seat}
          turn={state.phase === 'playing' && !deal.dealing ? state.turn : null}
          statusText={statusText}
          deckCount={deckDisplayCount}
          deckRef={deckRef}
          capturedTotal={capturedTotal}
          onOpenCaptured={() => setCapturedOpen(true)}
          onLeave={onLeave}
        />
      </div>

      {/* 2. Mesa: los grupos se reacomodan solos sin desbordarse */}
      <main className="relative flex min-h-0 flex-1 items-stretch justify-center overflow-hidden py-1">
        <div className="relative flex w-full max-w-5xl items-center justify-center [perspective:1100px]">
          {/* Tablero de madera inclinado: solo el fondo se inclina, las cartas quedan planas para tocarlas bien. */}
          <div
            aria-hidden
            className="wood-board-flat absolute inset-x-[1%] inset-y-0 rounded-[3%] [transform-origin:50%_100%] [transform:rotateX(6deg)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[min(70%,26dvh)] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-200/25"
          />
        <div
          style={mesaVars}
          className="relative z-10 flex max-h-full w-full max-w-5xl flex-wrap items-center justify-center gap-2 px-3 py-2 sm:gap-4"
        >
          {state.table.length === 0 && state.builds.length === 0 && !deal.dealing && (
            <p className="rounded-full bg-black/45 px-3 py-1 text-center text-sm text-amber-100/90">La mesa está vacía.</p>
          )}
          {state.table.map((c, i) =>
            deal.isTableDealt(i) ? (
              <DealFlight key={c.id} origin={deckRef} animate={deal.dealing}>
                <div className={c.id === pointCardId ? 'relative animate-point-drop' : 'relative'}>
                  <CartaUI
                    card={c}
                    size="mesa"
                    isSelected={tableIds.includes(c.id)}
                    isDisabled={!myTurn}
                    onClick={() => pickTableItem(c.id)}
                  />
                  {c.id === pointCardId && (
                    <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap btn-gold rounded-full px-2 py-1 text-[10px] font-extrabold shadow-md">
                      Carta de puntos
                    </span>
                  )}
                </div>
              </DealFlight>
            ) : (
              <DorsoUI key={c.id} />
            ),
          )}
          {state.builds.map((b) => (
            <TableBuild
              key={b.id}
              build={b}
              selected={tableIds.includes(b.id)}
              disabled={!myTurn}
              onSelect={() => pickTableItem(b.id)}
            />
          ))}
        </div>
        </div>
        {captureNotice && captureFlightKey === currentCaptureKey && (
          <CaptureFlight
            playerName={state.players[captureNotice.seat]?.name ?? 'Jugador'}
            card={captureNotice.card}
            capturedCount={captureNotice.capturedCount}
            virao={captureNotice.virao}
          />
        )}
      </main>

      {/* 3. Zona del jugador: acciones arriba y mano abajo */}
      <section className="relative z-20 mx-auto flex h-[28dvh] w-full max-w-5xl shrink-0 flex-col justify-end pb-2 sm:h-[30dvh] [@media(max-height:480px)]:h-[34dvh]">
        {state.phase === 'playing' && (
          <>
            <p className="mx-auto mb-1 max-w-[96%] rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-medium leading-tight text-amber-50 ring-1 ring-white/10 sm:text-sm [@media(max-height:480px)]:hidden">
              <span className="sm:hidden">{hintMobile}</span>
              <span className="hidden sm:inline">{hint}</span>
            </p>
            <div className="flex w-full items-stretch gap-1 px-2 pb-1.5 sm:justify-center sm:gap-3">
              <button type="button" onClick={capture} disabled={!captureReady} className={actionMain}>
                Capturar
              </button>
              {showRaise && (
                <>
                  <button type="button" onClick={raise} disabled={raisedValue === null} className={actionForm}>
                    Subir
                  </button>
                  <button type="button" onClick={convert} disabled={convertedValue === null} className={actionForm}>
                    {raiseTarget?.kind === 'pairs' ? 'Pares' : 'Convertir'}
                  </button>
                </>
              )}
              {showExpand && (
                <button type="button" onClick={expand} disabled={expandedValue === null} className={actionForm}>
                  Ampliar
                </button>
              )}
              {showFormation && (
                <>
                  <button type="button" onClick={buildSum} disabled={sumValue === null} className={actionForm}>
                    Sumar
                  </button>
                  {mergeCard && (
                    <button type="button" onClick={buildSumAndPairs} title="Sumar y unir a la carta de la mesa" className={actionForm}>
                      Suma+Par
                    </button>
                  )}
                  <button type="button" onClick={buildPairs} disabled={pairsValue === null} className={actionForm}>
                    Hacer Par
                  </button>
                </>
              )}
              <button type="button" onClick={drop} disabled={!canDrop || !card} className={actionDrop}>
                Tirar
              </button>
            </div>
            <div className="flex items-end justify-center px-2 pt-3">
              {hand.map((c, i) => (
                <div key={c.id} className={handGap}>
                  {deal.isHandDealt(seat, i) ? (
                    <DealFlight origin={deckRef} animate={deal.dealing}>
                      <CartaUI
                        card={c}
                        size="mano"
                        isSelected={c.id === cardId}
                        isPlayable={myTurn && canCapture(c, items, seat)}
                        isDisabled={!myTurn}
                        onClick={() => pickCard(c.id)}
                      />
                    </DealFlight>
                  ) : (
                    <DorsoUI className={CARTA_ALTURA.mano} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {capturedOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 sm:items-center"
          onClick={() => setCapturedOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Cartas capturadas"
            className="wood-panel max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-b-none p-4 sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold">Cartas capturadas</h2>
                {roomLabel && <p className="text-xs text-amber-200/70">{roomLabel}</p>}
              </div>
              <button
                type="button"
                onClick={() => setCapturedOpen(false)}
                aria-label="Cerrar"
                className={CHIP_BUTTON}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([0, 1] as const).map((team) => (
                <CapturedPile key={team} title={teamName(state.players, team)} groups={state.captured[team]} />
              ))}
            </div>
          </div>
        </div>
      )}

      {state.summary && state.phase !== 'playing' && !showEndNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/65 p-3">
          <div className="max-h-full w-full max-w-2xl space-y-3 overflow-y-auto">
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
            {resultFooter && <div className="flex justify-center">{resultFooter}</div>}
            {onLeave && state.phase === 'gameOver' && (
              <div className="flex justify-center">
                <button type="button" onClick={onLeave} className="btn-wood min-h-[44px] rounded-lg px-5 py-2 text-sm font-bold active:scale-95">
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(connection === 'offline' || connection === 'connecting') && (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.25rem)] z-50 mx-auto max-w-sm rounded-full bg-amber-500 px-3 py-1 text-center text-[11px] font-semibold text-stone-900 shadow-lg"
        >
          {connection === 'offline' ? 'Sin conexión. Reintentando...' : 'Conectando al servidor...'}
        </p>
      )}
      {notice && (
        <p
          role="alert"
          className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+2rem)] z-50 mx-auto max-w-md rounded-xl bg-rose-600 px-3 py-2 text-center text-xs font-medium text-white shadow-lg"
        >
          {notice}
        </p>
      )}
    </WoodShell>
  );
}

function isCasinoPointCard(card: { rank: number; suit: string }): boolean {
  return card.rank === 1 || (card.suit === 'diamantes' && card.rank === 10) || (card.suit === 'picas' && card.rank === 2);
}
