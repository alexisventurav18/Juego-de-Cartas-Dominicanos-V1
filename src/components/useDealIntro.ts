import { useEffect, useState } from 'react';

const SHUFFLE_TICKS = 12;
const SHUFFLE_TICK_MS = 90;
const DEAL_STEP_MS = 220;
const CARDS_PER_HAND = 4;
const CARDS_ON_TABLE = 4;

/** Animación de barajar y repartir. Por defecto es la del Casino; el 3 y 2 reparte 5 y pone 1 en el Pozo. */
export function useDealIntro(
  roundKey: number,
  seats: number,
  cardsPerHand = CARDS_PER_HAND,
  cardsOnTable = CARDS_ON_TABLE,
) {
  const dealSteps = seats * cardsPerHand + cardsOnTable;
  const totalTicks = SHUFFLE_TICKS + dealSteps;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
  }, [roundKey]);

  useEffect(() => {
    if (tick > totalTicks) return;
    const delay = tick < SHUFFLE_TICKS ? SHUFFLE_TICK_MS : DEAL_STEP_MS;
    const id = window.setTimeout(() => setTick((t) => t + 1), delay);
    return () => window.clearTimeout(id);
  }, [tick, totalTicks]);

  const shuffling = tick < SHUFFLE_TICKS;
  const dealing = tick <= totalTicks;
  const revealed = Math.max(0, tick - SHUFFLE_TICKS);
  const handSteps = seats * cardsPerHand;

  let dealingTo: number | 'table' | null = null;
  if (dealing && !shuffling) {
    dealingTo = revealed < handSteps ? revealed % seats : 'table';
  }

  return {
    dealing,
    shuffling,
    shuffleFrame: tick,
    revealed,
    dealSteps,
    dealingTo,
    isHandDealt: (seat: number, index: number) => !dealing || index * seats + seat < revealed,
    isTableDealt: (index: number) => !dealing || handSteps + index < revealed,
  };
}
