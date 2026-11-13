import { ArrowLeft, Trophy } from 'lucide-react';
import { TARGET_WINS, type TresYDosState } from '@/games/tresYDos';
import { SeatPlaque } from './cagao/PlayerSeat';
import { DorsoUI } from './CartaUI';
import { CHIP_BUTTON } from './wood/styles';

interface TresYDosHudProps {
  state: TresYDosState;
  seat: number;
  /** Asiento al que le toca jugar (null mientras se reparte o entre rondas). */
  turn: number | null;
  /** Texto de estado cuando no hay turno (p. ej. "Reparto"). */
  statusText: string;
  onLeave?: () => void;
}

/**
 * Parte superior: salir, número de ronda, tus rondas ganadas, turno actual y los rivales con su placa
 * de madera y sus cartas boca abajo. En horizontal todo pasa a una fila.
 */
export default function TresYDosHud({ state, seat, turn, statusText, onLeave }: TresYDosHudProps) {
  const seats = state.players.length;
  const others = Array.from({ length: seats - 1 }, (_, i) => (seat + 1 + i) % seats);
  const turnLabel = turn === null ? statusText : turn === seat ? 'Tu turno' : state.players[turn].name;

  return (
    <header className="mx-auto flex h-full w-full max-w-5xl flex-col gap-1 px-1 landscape:flex-row landscape:items-stretch landscape:gap-2">
      <div className="flex shrink-0 items-center gap-1.5 px-[max(0px,calc(var(--corner)-var(--frame)-6px))] landscape:px-0 landscape:pl-[max(0px,calc(var(--corner)-var(--frame)-6px))]">
        {onLeave && (
          <button type="button" onClick={onLeave} aria-label="Salir de la partida" className={CHIP_BUTTON}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="wood-chip shrink-0 rounded-lg px-2 py-2 text-[11px] font-bold leading-none sm:text-xs">
          Ronda {state.roundNo}
        </span>
        <span
          className="wood-block flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-extrabold leading-none text-amber-50 ring-1 ring-amber-300 sm:text-xs"
          title={`Rondas ganadas: ${state.wins[seat]} de ${TARGET_WINS}`}
        >
          <Trophy className="h-3 w-3 text-amber-300" aria-hidden />
          <span className="tabular-nums">
            Tú {state.wins[seat]}/{TARGET_WINS}
          </span>
        </span>
        <span
          aria-live="polite"
          className={`max-w-[6.5rem] shrink-0 truncate rounded-full px-2.5 py-1.5 text-[10px] font-bold leading-none sm:max-w-[10rem] sm:text-xs ${
            turn === seat ? 'wood-chip-turn' : 'wood-chip'
          }`}
        >
          {turnLabel}
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center gap-1 sm:gap-6">
        {others.map((s) => {
          const count = state.hands[s].length;
          return (
            <div
              key={state.players[s].id}
              title={`${state.players[s].name}: ${count} cartas, ${state.wins[s]} rondas ganadas`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
            >
              <SeatPlaque
                compact
                name={state.players[s].name}
                count={count}
                isTurn={turn === s}
                out={false}
                tag={`${state.wins[s]} ganadas`}
              />
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {Array.from({ length: count }, (_, i) => (
                  <DorsoUI
                    key={i}
                    // Con 5 o 6 cartas el abanico tiene que caber en el bloque del rival: miniaturas con solape fijo.
                    className={`h-full max-h-10 sm:max-h-14 [@media(max-height:480px)]:max-h-10 ${
                      i === 0 ? '' : '-ml-4 sm:-ml-6 [@media(max-height:480px)]:-ml-4'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
