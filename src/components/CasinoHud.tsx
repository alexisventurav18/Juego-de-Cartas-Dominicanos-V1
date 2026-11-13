import type { RefObject } from 'react';
import { ArrowLeft, Layers, Lock, Sparkles } from 'lucide-react';
import { CASINO_TARGET, type CasinoState, closingNeeds } from '@/games/casino';
import { teamName, teamOf } from '@/games/shared';
import { SeatPlaque } from './cagao/PlayerSeat';
import { DorsoUI } from './CartaUI';
import { CHIP_BUTTON } from './wood/styles';

interface CasinoHudProps {
  state: CasinoState;
  seat: number;
  /** Asiento al que le toca jugar (null mientras se reparte o entre rondas). */
  turn: number | null;
  /** Texto de estado cuando no hay turno (p. ej. "Reparto"). */
  statusText: string;
  deckCount: number;
  deckRef: RefObject<HTMLDivElement>;
  capturedTotal: number;
  onOpenCaptured: () => void;
  onLeave?: () => void;
}

/**
 * Parte superior: marcador a 21, turno actual, mazo, cartas capturadas y los rivales con su placa de
 * madera y sus cartas boca abajo. En horizontal todo pasa a una sola fila.
 */
export default function CasinoHud({
  state,
  seat,
  turn,
  statusText,
  deckCount,
  deckRef,
  capturedTotal,
  onOpenCaptured,
  onLeave,
}: CasinoHudProps) {
  const myTeam = teamOf(seat);
  const others = state.players.map((_, i) => (seat + 1 + i) % state.players.length).filter((s) => s !== seat);
  const turnLabel = turn === null ? statusText : turn === seat ? 'Tu turno' : state.players[turn].name;

  return (
    <header className="mx-auto flex h-full w-full max-w-5xl flex-col gap-1 px-1 landscape:flex-row landscape:items-stretch landscape:gap-2">
      <div className="flex shrink-0 items-center gap-1.5 px-[max(0px,calc(var(--corner)-var(--frame)-6px))] landscape:px-0 landscape:pl-[max(0px,calc(var(--corner)-var(--frame)-6px))]">
        {onLeave && (
          <button type="button" onClick={onLeave} aria-label="Salir de la partida" className={CHIP_BUTTON}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {([0, 1] as const).map((team) => {
          const mine = team === myTeam;
          const needs = closingNeeds(state.scores[team]);
          const progress = Math.min(100, (state.scores[team] / CASINO_TARGET) * 100);
          return (
            <div
              key={team}
              title={teamName(state.players, team)}
              className={`wood-block flex min-w-0 flex-1 flex-col rounded-lg px-1.5 py-0.5 landscape:w-24 landscape:flex-none sm:landscape:w-28 ${
                mine ? 'ring-1 ring-amber-300' : ''
              }`}
            >
              <span className="flex items-center justify-between gap-1 text-[10px] font-semibold leading-tight text-amber-100">
                <span className="flex min-w-0 items-center gap-0.5 truncate">
                  {needs && <Lock className="h-2.5 w-2.5 shrink-0 text-amber-300" aria-label="Cierre obligatorio" />}
                  <span className="truncate">{mine ? 'Nosotros' : 'Ellos'}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-amber-300">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  {state.viraos[team]}
                </span>
              </span>
              <span className="flex items-baseline gap-0.5 leading-none">
                <span className="text-sm font-extrabold tabular-nums text-amber-50 sm:text-base">{state.scores[team]}</span>
                <span className="text-[10px] text-amber-200/70">/{CASINO_TARGET}</span>
              </span>
              <span className="mt-0.5 h-1 overflow-hidden rounded-full bg-black/40">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </span>
            </div>
          );
        })}
        <span
          aria-live="polite"
          className={`max-w-[5.5rem] shrink-0 truncate rounded-full px-2.5 py-1.5 text-[10px] font-bold leading-none sm:max-w-[9rem] sm:text-xs ${
            turn === seat ? 'wood-chip-turn' : 'wood-chip'
          }`}
        >
          {turnLabel}
        </span>
        <button
          type="button"
          onClick={onOpenCaptured}
          aria-label={`Cartas capturadas: ${capturedTotal}`}
          className="wood-chip flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold tabular-nums active:scale-95"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          {capturedTotal}
        </button>
        <div ref={deckRef} className="relative shrink-0" title={`Mazo: ${deckCount} cartas`}>
          <DorsoUI className="h-9" />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tabular-nums text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.9)]">
            {deckCount}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center gap-1 sm:gap-4">
        {others.map((s) => {
          const mate = teamOf(s) === myTeam;
          const count = state.hands[s].length;
          return (
            <div key={state.players[s].id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
              <SeatPlaque
                compact
                name={state.players[s].name}
                count={count}
                isTurn={turn === s}
                out={false}
                tag={mate ? 'Pareja' : undefined}
              />
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {Array.from({ length: count }, (_, i) => (
                  <DorsoUI key={i} className={`h-full max-h-14 ${i === 0 ? '' : '-ml-[2.6dvh]'}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
