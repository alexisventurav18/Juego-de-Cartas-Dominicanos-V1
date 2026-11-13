import { useEffect, useRef } from 'react';
import PlayingCard from './PlayingCard';
import type { Card, Point } from './types';

export interface Flight {
  id: number;
  from: Point;
  to: Point;
  /** Carta que vuela (visible) o null para un reverso. */
  card: Card | null;
  /** Variable CSS con el alto de la carta que vuela (--ch, --oh o --ph). */
  heightVar: string;
  delayMs?: number;
  durationMs?: number;
  /** Giro final en grados. */
  endRotate?: number;
}

function FlyingCard({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const start = `translate3d(${flight.from.x - width / 2}px, ${flight.from.y - height / 2}px, 0) scale(1) rotate(0deg)`;
    const end = `translate3d(${flight.to.x - width / 2}px, ${flight.to.y - height / 2}px, 0) scale(0.92) rotate(${flight.endRotate ?? 0}deg)`;
    // Solo transform y opacity: la animación corre en el compositor, sin tocar el layout.
    const animation = el.animate(
      [
        // Invisible mientras espera su turno (delay) y aparece justo al arrancar.
        { transform: start, opacity: 0, offset: 0 },
        { transform: start, opacity: 1, offset: 0.001 },
        { transform: end, opacity: 1, offset: 0.88 },
        { transform: end, opacity: 0, offset: 1 },
      ],
      {
        duration: flight.durationMs ?? 520,
        delay: flight.delayMs ?? 0,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'both',
      },
    );
    animation.onfinish = () => onDone(flight.id);
    return () => animation.cancel();
  }, [flight, onDone]);

  return (
    <div ref={ref} className="pointer-events-none fixed left-0 top-0 z-[55] will-change-transform" style={{ opacity: 0 }}>
      <PlayingCard card={flight.card ?? undefined} faceDown={!flight.card} heightVar={flight.heightVar} />
    </div>
  );
}

/** Capa con las cartas que vuelan: del rival a tu mano, o de la mano al centro cuando se baja un par. */
export default function FlightLayer({ flights, onDone }: { flights: Flight[]; onDone: (id: number) => void }) {
  return (
    <>
      {flights.map((flight) => (
        <FlyingCard key={flight.id} flight={flight} onDone={onDone} />
      ))}
    </>
  );
}
