import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { drawFromSeat, type CagaoMove, type CagaoState } from '@/games/cagao';
import { shuffle } from '@/games/cards';
import type { Card, SeatLayout } from '@/components/cagao/types';
import { useGameSounds } from './useGameSounds';

/** Reparte a los rivales alrededor de la mesa: el siguiente en el orden de juego queda a tu izquierda. */
export function seatLayout(total: number, me: number): SeatLayout {
  const others = Array.from({ length: total - 1 }, (_, i) => (me + 1 + i) % total);
  if (others.length <= 1) return { left: null, top: others, right: null };
  if (others.length === 2) return { left: others[0], top: [], right: others[1] };
  return { left: others[0], top: others.slice(1, -1), right: others[others.length - 1] };
}

interface Options {
  state: CagaoState;
  seat: number;
  onMove: (move: CagaoMove) => void;
}

/**
 * Lógica de la mesa de El Cagao para la interfaz: quién roba a quién, qué cartas tienen pareja,
 * qué hacer al tocar, arrastrar o jalar una carta, y los sonidos. No dibuja nada.
 */
export function useElCagaoGame({ state, seat, onMove }: Options) {
  const { playSound, isMuted, toggleMute } = useGameSounds();
  // Orden de tu mano en pantalla. "Mezclar" lo cambia solo aquí; el servidor baraja la real.
  const [order, setOrder] = useState<string[]>([]);

  const hand = state.hands[seat];
  const pairing = state.phase === 'pairing';
  const playing = state.phase === 'playing';
  const gameOver = state.phase === 'gameOver';
  const myTurn = playing && state.turn === seat;
  const victimSeat = playing ? drawFromSeat(state) : -1;
  const iAmOut = playing && hand.length === 0;
  const iLost = state.loserSeat === seat;
  const event = state.lastEvent;
  const newCardId = playing && event && event.by === seat && !event.pair ? event.drawnCardId : null;

  const layout = useMemo(() => seatLayout(state.players.length, seat), [state.players.length, seat]);

  const shownHand = useMemo(
    () =>
      [...hand].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      }),
    [hand, order],
  );

  /** Cartas de tu mano que tienen pareja (otra carta del mismo número). */
  const pairableIds = useMemo(() => {
    const byRank = new Map<number, string[]>();
    for (const card of hand) byRank.set(card.rank, [...(byRank.get(card.rank) ?? []), card.id]);
    return new Set([...byRank.values()].filter((group) => group.length >= 2).flat());
  }, [hand]);

  const twinOf = useCallback(
    (cardId: string): Card | null => {
      const card = hand.find((c) => c.id === cardId);
      if (!card) return null;
      return hand.find((c) => c.id !== cardId && c.rank === card.rank) ?? null;
    },
    [hand],
  );

  /* ------------------------------ acciones ------------------------------ */

  /** Jala la carta `index` de la mano oculta del rival al que le toca robarte. */
  const drawAt = useCallback(
    (index: number) => {
      if (myTurn) onMove({ type: 'draw', index });
    },
    [myTurn, onMove],
  );

  /** Baja el par de esa carta (con su pareja). Devuelve las dos cartas, o null si no se puede. */
  const pairByCard = useCallback(
    (cardId: string): [Card, Card] | null => {
      if (!pairing) return null;
      const card = hand.find((c) => c.id === cardId);
      const twin = twinOf(cardId);
      if (!card || !twin) return null;
      onMove({ type: 'pair', cardIds: [card.id, twin.id] });
      return [card, twin];
    },
    [pairing, hand, twinOf, onMove],
  );

  const pairAll = useCallback(() => {
    if (pairing && pairableIds.size > 0) onMove({ type: 'pairAll' });
  }, [pairing, pairableIds, onMove]);

  const shuffleHand = useCallback(() => {
    setOrder(shuffle(hand.map((c) => c.id)));
    playSound('cardShuffle');
  }, [hand, playSound]);

  /* ------------------------------ sonidos ------------------------------ */

  const lastSeq = useRef(event?.seq ?? 0);
  const lastPairs = useRef(state.pairs.length);
  const lastPhase = useRef(state.phase);

  // Barajar al empezar y al pasar de bajar pares a robar.
  useEffect(() => {
    if (lastPhase.current !== state.phase && state.phase === 'playing') playSound('cardShuffle');
    lastPhase.current = state.phase;
  }, [state.phase, playSound]);

  useEffect(() => {
    if (pairing) playSound('cardShuffle');
    // Solo al montar la mesa en la fase inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada jugada de robo: roce de carta, par bajado o la alerta de El Cagao.
  useEffect(() => {
    if (!event || event.seq === lastSeq.current) return;
    lastSeq.current = event.seq;
    playSound(event.cagao ? 'cagaoAlert' : event.pair ? 'pairMatch' : 'cardSlide');
    if (event.outSeats.includes(seat)) {
      const timer = window.setTimeout(() => playSound('win'), 420);
      return () => window.clearTimeout(timer);
    }
  }, [event, seat, playSound]);

  // Pares bajados a mano en la fase inicial (tuyos o de los bots).
  useEffect(() => {
    if (pairing && state.pairs.length > lastPairs.current) playSound('pairMatch');
    lastPairs.current = state.pairs.length;
  }, [pairing, state.pairs.length, playSound]);

  // Fin de la partida: te salvaste o eres El Cagao.
  useEffect(() => {
    if (!gameOver) return;
    const timer = window.setTimeout(() => playSound(iLost ? 'lose' : 'win'), 500);
    return () => window.clearTimeout(timer);
  }, [gameOver, iLost, playSound]);

  return {
    hand,
    shownHand,
    pairing,
    playing,
    gameOver,
    myTurn,
    victimSeat,
    iAmOut,
    iLost,
    event,
    newCardId,
    layout,
    pairableIds,
    twinOf,
    drawAt,
    pairByCard,
    pairAll,
    shuffleHand,
    isMuted,
    toggleMute,
  };
}
