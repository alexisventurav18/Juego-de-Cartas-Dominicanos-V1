import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Check, Layers, Shuffle, Skull, Volume2, VolumeX, X } from 'lucide-react';
import { rankLabel } from '@/games/cards';
import type { CagaoMove, CagaoState } from '@/games/cagao';
import { isBotPlayer } from '@/games/shared';
import { useElCagaoGame } from '@/hooks/useElCagaoGame';
import DealerReveal from '../DealerReveal';
import DefeatNotice from '../DefeatNotice';
import VictoryCelebration from '../VictoryCelebration';
import { WoodFrame } from './CardAssets';
import FlightLayer, { type Flight } from './FlightLayer';
import { HandFan } from './Fans';
import OrientationGuard from './OrientationGuard';
import PlayerSeat, { SeatPlaque } from './PlayerSeat';
import PlayingCard from './PlayingCard';
import type { Card, Point } from './types';

export interface GameTableProps {
  state: CagaoState;
  seat: number;
  onMove: (move: CagaoMove) => void;
  /** Botón de salir dentro de la mesa (ocupa todo el viewport). */
  onLeave?: () => void;
  /** Texto de la sala o partida, visible en la hoja de pares. */
  roomLabel?: string;
  connection?: 'connected' | 'connecting' | 'offline';
  /** Aviso de error o información pasajera. */
  notice?: string | null;
  /** Contenido extra del resultado (p. ej. el botón "Jugar otra partida"). */
  resultFooter?: ReactNode;
}

const ROOT_VARS = {
  '--frame': 'clamp(10px, 2.6dvh, 24px)',
  '--corner': 'clamp(28px, 9dvh, 60px)',
  '--medal': 'clamp(26px, 8dvh, 56px)',
  // Alto de cartas: tu mano, las de los rivales y las de la pila central. Todo sale de la altura de pantalla.
  '--ch': 'clamp(52px, 21dvh, 140px)',
  '--oh': 'clamp(30px, 11dvh, 74px)',
  '--ph': 'clamp(40px, 16dvh, 96px)',
} as CSSProperties;

/** Giro estable (±14°) a partir del id de la carta, para que la pila de pares se vea natural. */
function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 29) - 14;
}

function centerOf(el: Element | null | undefined): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function GameTable({
  state,
  seat,
  onMove,
  onLeave,
  roomLabel,
  connection,
  notice,
  resultFooter,
}: GameTableProps) {
  const game = useElCagaoGame({ state, seat, onMove });
  const { event } = game;
  const [dealerOpen, setDealerOpen] = useState(state.roundNo === 1 && !state.players.some(isBotPlayer));
  const [endNoticeDismissed, setEndNoticeDismissed] = useState(false);
  const [pairsOpen, setPairsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<number, HTMLElement>());
  const flightSeq = useRef(0);
  const lastEventSeq = useRef(event?.seq ?? 0);
  const lastPairCount = useRef(state.pairs.length);

  const names = state.players.map((p, s) => (s === seat ? 'Tú' : p.name));
  const loserName = state.loserSeat !== null ? state.players[state.loserSeat].name : '';

  const registerAnchor = useCallback((s: number, el: HTMLElement | null) => {
    if (el) anchors.current.set(s, el);
    else anchors.current.delete(s);
  }, []);

  const spawn = useCallback((items: Omit<Flight, 'id'>[]) => {
    if (prefersReducedMotion()) return;
    setFlights((current) => [...current, ...items.map((item) => ({ ...item, id: ++flightSeq.current }))]);
  }, []);

  const endFlight = useCallback((id: number) => {
    setFlights((current) => current.filter((f) => f.id !== id));
  }, []);

  // El bloqueo de scroll de la página mientras la mesa ocupa toda la pantalla.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  // Cada robo: una carta boca abajo vuela del rival a quien la jaló; si hace par, el par va a la pila.
  useEffect(() => {
    if (!event || event.seq === lastEventSeq.current) return;
    lastEventSeq.current = event.seq;
    const from = centerOf(anchors.current.get(event.from)) ?? centerOf(handRef.current);
    const to = centerOf(anchors.current.get(event.by)) ?? centerOf(handRef.current);
    const pile = centerOf(pileRef.current);
    const items: Omit<Flight, 'id'>[] = [];
    if (from && to) {
      items.push({ from, to, card: null, heightVar: '--oh', durationMs: 520 });
    }
    if (event.pair && to && pile) {
      event.pair.forEach((card, i) =>
        items.push({
          from: to,
          to: { x: pile.x + (i ? 10 : -10), y: pile.y },
          card,
          heightVar: '--ph',
          delayMs: 520 + i * 70,
          durationMs: 480,
          endRotate: i ? 8 : -8,
        }),
      );
    }
    if (items.length > 0) spawn(items);
  }, [event, spawn]);

  // Pares que bajan los rivales en la fase inicial: vuelan de su asiento al centro.
  useEffect(() => {
    const before = lastPairCount.current;
    lastPairCount.current = state.pairs.length;
    if (state.pairs.length <= before) return;
    const pile = centerOf(pileRef.current);
    if (!pile) return;
    const fresh = state.pairs.slice(before).filter((p) => p.seat !== seat).slice(0, 4);
    const items: Omit<Flight, 'id'>[] = [];
    fresh.forEach((pair, k) => {
      const from = centerOf(anchors.current.get(pair.seat));
      if (!from) return;
      pair.cards.forEach((card, i) =>
        items.push({
          from,
          to: { x: pile.x + (i ? 10 : -10), y: pile.y },
          card,
          heightVar: '--ph',
          delayMs: k * 140 + i * 60,
          durationMs: 480,
          endRotate: i ? 8 : -8,
        }),
      );
    });
    if (items.length > 0) spawn(items);
  }, [state.pairs, seat, spawn]);

  /** Baja el par de una carta de tu mano y hace volar las dos hacia la pila central. */
  const pairWithFlight = useCallback(
    (card: Card): boolean => {
      const twin = game.twinOf(card.id);
      const pile = centerOf(pileRef.current);
      const origins = twin
        ? [card, twin].map((c) => centerOf(handRef.current?.querySelector(`[data-hand-id="${c.id}"]`)))
        : [];
      const pair = game.pairByCard(card.id);
      if (!pair || !pile) return false;
      pair.forEach((c, i) => {
        const from = origins[i];
        if (from) {
          spawn([
            {
              from,
              to: { x: pile.x + (i ? 10 : -10), y: pile.y },
              card: c,
              heightVar: '--ch',
              durationMs: 480,
              delayMs: i * 60,
              endRotate: i ? 8 : -8,
            },
          ]);
        }
      });
      return true;
    },
    [game, spawn],
  );

  const pickFromSeat = (s: number, index: number) => {
    if (game.myTurn && s === game.victimSeat) game.drawAt(index);
  };

  const hint = (() => {
    if (game.pairing) {
      if (game.pairableIds.size > 0) return 'Baja tus pares: toca una carta con pareja o arrástrala a la mesa.';
      return '¡Listo! Esperando a que los demás bajen sus pares...';
    }
    if (!game.playing) return '';
    if (game.iAmOut) return '¡Te salvaste! Mira cómo termina la partida.';
    if (game.myTurn) return `Tu turno: jala una carta de ${names[game.victimSeat]}. ¡A ciegas!`;
    if (game.victimSeat === seat) return `${names[state.turn]} te está robando una carta.`;
    return `${names[state.turn]} le está robando a ${names[game.victimSeat]}...`;
  })();

  const turnLabel = game.gameOver ? 'Fin' : game.pairing ? 'Bajando pares' : game.myTurn ? 'Tu turno' : names[state.turn];
  const lastPairs = state.pairs.slice(-4);
  const showDropHint = game.pairing && game.pairableIds.size > 0;

  const renderSeat = (s: number, side: 'left' | 'top' | 'right') => (
    <PlayerSeat
      key={s}
      side={side}
      seat={s}
      name={state.players[s].name}
      count={state.hands[s].length}
      isTurn={game.playing && state.turn === s}
      isVictim={game.victimSeat === s}
      out={state.hands[s].length === 0 && !game.pairing}
      pickable={game.myTurn && game.victimSeat === s}
      onPick={pickFromSeat}
      registerAnchor={registerAnchor}
    />
  );

  return (
    <div
      className="fixed inset-0 z-30 h-[100dvh] w-[100dvw] touch-none select-none overflow-hidden overscroll-none bg-[#2a160a] bg-[radial-gradient(ellipse_at_50%_35%,#4a2a12,#1e0e05_75%)] text-amber-50"
      style={ROOT_VARS}
    >
      <OrientationGuard />
      <WoodFrame />

      {dealerOpen && (
        <DealerReveal players={state.players} dealer={state.dealer} onDone={() => setDealerOpen(false)} />
      )}
      {game.gameOver &&
        !endNoticeDismissed &&
        (game.iLost ? (
          <DefeatNotice
            title="¡Eres El Cagao!"
            message="Te quedaste con el A♠ y no pudiste emparejarlo. ¡Pide la revancha!"
            continueLabel="Continuar"
            onContinue={() => setEndNoticeDismissed(true)}
          />
        ) : (
          <VictoryCelebration
            title="¡TE SALVASTE!"
            message={`${loserName} se quedó con El Cagao.`}
            continueLabel="Continuar"
            onContinue={() => setEndNoticeDismissed(true)}
          />
        ))}

      {/* Rejilla de la mesa: rivales a izquierda, arriba y derecha; tú abajo; el tablero en el centro. */}
      <div className="absolute inset-[calc(var(--frame)+4px)] grid grid-cols-[19%_minmax(0,1fr)_19%] grid-rows-[24%_minmax(0,1fr)_36%]">
        {/* Esquinas superiores: salir y pares a la izquierda; turno y sonido a la derecha */}
        <div className="z-30 flex items-start gap-1.5 p-1 pl-[calc(var(--corner)*0.8)]">
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              aria-label="Salir de la partida"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/40 text-amber-50 ring-1 ring-amber-200/30 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setPairsOpen(true)}
            aria-label={`Pares bajados: ${state.pairs.length}`}
            className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-black/40 px-2 text-xs font-bold tabular-nums text-amber-50 ring-1 ring-amber-200/30 active:scale-95"
          >
            <Layers className="h-4 w-4" aria-hidden />
            {state.pairs.length}
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-evenly gap-2">{game.layout.top.map((s) => renderSeat(s, 'top'))}</div>

        <div className="z-30 flex items-start justify-end gap-1.5 p-1 pr-[calc(var(--corner)*0.8)]">
          <span
            aria-live="polite"
            className={`max-w-[7rem] truncate rounded-full px-2.5 py-1.5 text-[11px] font-bold leading-none ${
              game.myTurn ? 'bg-amber-400 text-stone-900' : 'bg-black/40 text-amber-50 ring-1 ring-amber-200/30'
            }`}
          >
            {turnLabel}
          </span>
          <button
            type="button"
            onClick={game.toggleMute}
            aria-label={game.isMuted ? 'Activar sonido' : 'Silenciar'}
            aria-pressed={game.isMuted}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/40 text-amber-50 ring-1 ring-amber-200/30 active:scale-95"
          >
            {game.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Laterales */}
        <div className="min-h-0 min-w-0">{game.layout.left !== null && renderSeat(game.layout.left, 'left')}</div>

        {/* Centro: tablero de madera en perspectiva 2.5D. Los textos van fuera de la parte inclinada. */}
        <div className="relative min-h-0 min-w-0">
          <div className="absolute inset-0 [perspective:1100px]">
            <div
              ref={boardRef}
              className={`cagao-board absolute inset-x-[3%] inset-y-[6%] rounded-[3.5%] [transform-origin:50%_100%] [transform:rotateX(16deg)] ${
                dragging && showDropHint ? 'cagao-board-drop' : ''
              }`}
            >
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78%,22dvh)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-200/35" />
              <div ref={pileRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative flex items-center justify-center">
                  {state.pairs.length === 0 ? (
                    <span className="block rounded-md border-2 border-dashed border-amber-100/40" style={{ height: 'var(--ph)', aspectRatio: '2.5/3.5' }} />
                  ) : (
                    lastPairs.flatMap((pair) => pair.cards).map((card, i, all) => (
                      <span
                        key={card.id}
                        className={`${i === all.length - 1 || i === all.length - 2 ? 'pile-land' : ''} absolute`}
                        style={{ transform: `rotate(${tilt(card.id)}deg) translate(${(i - all.length / 2) * 3}px, ${(i % 2) * 3}px)` }}
                      >
                        <PlayingCard card={card} heightVar="--ph" />
                      </span>
                    ))
                  )}
                  {state.pairs.length > 0 && (
                    <span style={{ height: 'var(--ph)', aspectRatio: '2.5/3.5' }} className="invisible block" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de la última jugada */}
          {event && game.playing && (
            <div className="pointer-events-none absolute inset-x-0 top-1 z-30 flex justify-center px-1">
            <div
              key={event.seq}
              role="status"
              className={`animate-combo-label flex max-w-full items-center gap-1.5 rounded-xl px-3 py-1 text-center text-[11px] ring-1 sm:text-xs ${
                event.cagao
                  ? 'bg-rose-600/80 font-bold text-rose-50 ring-rose-200'
                  : event.pair
                    ? 'bg-amber-500/80 font-semibold text-stone-900 ring-amber-200'
                    : 'bg-black/55 text-amber-50 ring-white/15'
              }`}
            >
              {event.cagao && <Skull className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span>
                {event.cagao
                  ? event.by === seat
                    ? `¡Robaste El Cagao (A♠) de ${names[event.from]}!`
                    : event.from === seat
                      ? `¡${names[event.by]} te quitó El Cagao!`
                      : `¡${names[event.by]} le robó El Cagao a ${names[event.from]}!`
                  : event.pair
                    ? event.by === seat
                      ? `Robaste a ${names[event.from]} y bajaste par de ${rankLabel(event.pair[0])}.`
                      : event.from === seat
                        ? `${names[event.by]} te robó y bajó par de ${rankLabel(event.pair[0])}.`
                        : `${names[event.by]} bajó par de ${rankLabel(event.pair[0])}.`
                    : event.by === seat
                      ? `Le robaste una carta a ${names[event.from]}.`
                      : event.from === seat
                        ? `${names[event.by]} te robó una carta.`
                        : `${names[event.by]} le robó una carta a ${names[event.from]}.`}
                {event.outSeats.length > 0 && ` ${event.outSeats.map((s) => names[s]).join(' y ')} se salvó.`}
              </span>
            </div>
            </div>
          )}

          {hint && (
            <p className="pointer-events-none absolute bottom-0 left-1/2 z-30 max-w-[96%] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-medium leading-tight text-amber-50 ring-1 ring-white/10 sm:text-xs">
              {hint}
            </p>
          )}
        </div>

        <div className="min-h-0 min-w-0">{game.layout.right !== null && renderSeat(game.layout.right, 'right')}</div>

        {/* Abajo: tu placa, tu mano en abanico y las acciones */}
        <div className="z-30 flex items-end p-1 pl-[calc(var(--corner)*0.6)]">
          <SeatPlaque
            name={state.players[seat].name}
            count={game.hand.length}
            isTurn={game.myTurn}
            out={game.iAmOut}
            isMe
          />
        </div>

        <div className="relative flex min-h-0 min-w-0 items-end justify-center overflow-visible pb-[calc(var(--frame)*1.5)] pt-4">
          {game.iAmOut ? (
            <p className="flex items-center gap-2 pb-6 text-sm font-bold text-emerald-200">
              <Check className="h-4 w-4" aria-hidden />
              Sin cartas: ¡te salvaste!
            </p>
          ) : (
            <HandFan
              cards={game.shownHand}
              heightVar="--ch"
              avail="min(56dvw, 620px)"
              pairableIds={game.pairableIds}
              twinOf={game.twinOf}
              highlightId={game.newCardId}
              interactive={game.pairing}
              dropRef={boardRef}
              onTap={(card) => void pairWithFlight(card)}
              onDrop={pairWithFlight}
              onDraggingChange={setDragging}
              containerRef={(el) => {
                (handRef as { current: HTMLDivElement | null }).current = el;
                if (el) anchors.current.set(seat, el);
              }}
            />
          )}
        </div>

        <div className="z-30 flex flex-col items-end justify-end gap-1.5 p-1 pr-[calc(var(--corner)*0.6)]">
          {game.pairing && (
            <button
              type="button"
              onClick={game.pairAll}
              disabled={game.pairableIds.size === 0}
              className="min-h-[44px] w-full touch-manipulation rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-2 py-2 text-[11px] font-extrabold leading-tight text-stone-900 shadow ring-1 ring-amber-100/60 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:text-xs"
            >
              Bajar todos los pares
            </button>
          )}
          <button
            type="button"
            onClick={game.shuffleHand}
            disabled={game.hand.length < 2}
            className="flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-1.5 rounded-lg bg-black/45 px-2 py-2 text-[11px] font-bold text-amber-50 ring-1 ring-amber-200/40 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 sm:text-xs"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            Mezclar mano
          </button>
        </div>
      </div>

      {game.gameOver && endNoticeDismissed && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3">
          <div className="max-h-full w-full max-w-md space-y-2 overflow-y-auto rounded-2xl bg-[#3a2010] p-4 text-center ring-2 ring-amber-300/50">
            <h2 className="text-lg font-extrabold">
              {game.iLost ? '¡Te quedaste con El Cagao!' : `${loserName} se quedó con El Cagao`}
            </h2>
            <div className="space-y-1 text-left text-sm">
              {state.finishOrder.map((s, i) => (
                <div key={s} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1">
                  <span className="w-5 shrink-0 font-bold tabular-nums text-amber-200">{i + 1}º</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{names[s]}</span>
                  <span className="flex shrink-0 items-center gap-1 text-emerald-200">
                    <Check className="h-3 w-3" aria-hidden />
                    Se salvó
                  </span>
                </div>
              ))}
              {state.loserSeat !== null && (
                <div
                  style={{ '--rh': 'clamp(44px, 14dvh, 80px)' } as CSSProperties}
                  className="flex items-center gap-2 rounded-xl bg-rose-600/30 px-3 py-1.5 ring-1 ring-rose-300"
                >
                  <Skull className="h-4 w-4 shrink-0 text-rose-200" aria-hidden />
                  <span className="min-w-0 flex-1 font-bold">
                    <span className="block truncate">{names[state.loserSeat]}</span>
                    <span className="block text-rose-100">El Cagao</span>
                  </span>
                  {state.hands[state.loserSeat].map((card) => (
                    <PlayingCard key={card.id} card={card} heightVar="--rh" />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {resultFooter}
              {onLeave && (
                <button
                  type="button"
                  onClick={onLeave}
                  className="min-h-[44px] rounded-lg bg-stone-200 px-6 py-2 text-xs font-bold text-stone-900 active:scale-95 sm:text-sm"
                >
                  Salir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pairsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-3" onClick={() => setPairsOpen(false)}>
          <div
            role="dialog"
            aria-label="Pares bajados"
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 text-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Pares bajados: {state.pairs.length}</h2>
                {roomLabel && <p className="text-xs text-stone-500">{roomLabel}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPairsOpen(false)}
                aria-label="Cerrar"
                className="grid h-10 w-10 place-items-center rounded-lg bg-stone-100 text-stone-700 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {state.players.map((player, s) => {
                const mine = state.pairs.filter((p) => p.seat === s);
                return (
                  <div key={player.id}>
                    <p className="mb-1 text-xs font-semibold text-stone-700">
                      {names[s]} · {mine.length} {mine.length === 1 ? 'par' : 'pares'}
                    </p>
                    <div style={{ '--sh': 'clamp(40px, 12dvh, 64px)' } as CSSProperties} className="flex flex-wrap gap-x-3 gap-y-1.5">
                      {mine.map((p) => (
                        <span key={p.cards[0].id} className="flex items-center gap-0.5">
                          <PlayingCard card={p.cards[0]} heightVar="--sh" />
                          <PlayingCard card={p.cards[1]} heightVar="--sh" />
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <FlightLayer flights={flights} onDone={endFlight} />

      {(connection === 'offline' || connection === 'connecting') && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+0.25rem)] z-50 mx-auto max-w-sm rounded-full bg-amber-500 px-3 py-1 text-center text-[11px] font-semibold text-stone-900 shadow-lg"
        >
          {connection === 'offline' ? 'Sin conexión. Reintentando...' : 'Conectando al servidor...'}
        </p>
      )}
      {notice && (
        <p
          role="alert"
          className="pointer-events-none absolute inset-x-3 top-[calc(env(safe-area-inset-top)+2rem)] z-50 mx-auto max-w-md rounded-xl bg-rose-600 px-3 py-2 text-center text-xs font-medium text-white shadow-lg"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
