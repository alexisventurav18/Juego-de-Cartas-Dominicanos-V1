import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

const FLIGHT_MS = 480;
const FLIGHT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface DealFlightProps {
  origin: RefObject<HTMLElement | null>;
  animate: boolean;
  children: ReactNode;
}

/** Hace que la carta vuele desde `origin` (el mazo) hasta su lugar al montarse durante el reparto. */
export default function DealFlight({ origin, animate, children }: DealFlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const from = origin.current?.getBoundingClientRect();
    if (!animate || !el || !from) return;
    const to = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.7)`;
    el.style.opacity = '0';
    el.getBoundingClientRect();
    el.style.transition = `transform ${FLIGHT_MS}ms ${FLIGHT_EASE}, opacity 200ms ease-out`;
    el.style.transform = '';
    el.style.opacity = '';
  }, [animate, origin]);

  return (
    <div ref={ref} className="inline-flex">
      {children}
    </div>
  );
}
