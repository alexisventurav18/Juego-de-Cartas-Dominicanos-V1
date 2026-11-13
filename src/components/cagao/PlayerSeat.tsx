import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { OpponentFan } from './Fans';
import type { SeatSide } from './types';

interface SeatPlaqueProps {
  name: string;
  count: number;
  isTurn: boolean;
  /** Le están robando a este jugador ahora. */
  isVictim?: boolean;
  /** Se quedó sin cartas: se salvó. */
  out: boolean;
  isMe?: boolean;
  /** Versión baja para barras superiores apretadas (Casino y Tres y Dos). */
  compact?: boolean;
  /** Etiqueta pequeña bajo el nombre (p. ej. "Compañero"). */
  tag?: string;
}

/** Placa de madera con el avatar. Cuando es su turno se ilumina en dorado. */
export function SeatPlaque({ name, count, isTurn, isVictim, out, isMe, compact = false, tag }: SeatPlaqueProps) {
  return (
    <div
      className={`relative flex min-w-0 max-w-full items-center ${compact ? 'gap-1 rounded-lg px-1 py-0.5' : 'gap-1.5 rounded-xl px-1.5 py-1'} wood-block ${
        out ? 'opacity-70' : ''
      }`}
    >
      {isTurn && <span aria-hidden className="turn-glow pointer-events-none absolute -inset-1 rounded-2xl" />}
      <span
        className={`relative grid ${compact ? 'h-[clamp(18px,4.6dvh,26px)] w-[clamp(18px,4.6dvh,26px)] text-[clamp(10px,2.4dvh,13px)]' : 'h-[clamp(22px,7dvh,40px)] w-[clamp(22px,7dvh,40px)] text-[clamp(11px,3.4dvh,18px)]'} shrink-0 place-items-center rounded-full border-2 bg-gradient-to-br from-amber-100 to-amber-300 font-extrabold text-amber-950 ${
          isTurn ? 'border-yellow-300' : isVictim ? 'border-rose-300' : 'border-amber-900/70'
        }`}
      >
        {name.trim().slice(0, 1).toUpperCase()}
      </span>
      <span className="relative min-w-0 leading-tight">
        <span className={`block truncate font-bold text-amber-50 ${compact ? 'text-[clamp(9px,2.1dvh,12px)]' : 'text-[clamp(10px,2.8dvh,14px)]'}`}>{isMe ? 'Tú' : name}</span>
        <span className={`flex items-center gap-1 whitespace-nowrap font-semibold text-amber-200 ${compact ? 'text-[clamp(8px,1.9dvh,10px)]' : 'text-[clamp(9px,2.4dvh,12px)]'}`}>
          {out ? (
            <>
              <Check className="h-3 w-3" aria-hidden />
              Salvó
            </>
          ) : (
            `${tag ? `${tag} · ` : ''}${count} ${count === 1 ? 'carta' : 'cartas'}`
          )}
        </span>
      </span>
    </div>
  );
}

interface PlayerSeatProps {
  side: Exclude<SeatSide, 'bottom'>;
  seat: number;
  name: string;
  count: number;
  isTurn: boolean;
  isVictim: boolean;
  out: boolean;
  /** Te toca robarle a este jugador. */
  pickable: boolean;
  onPick: (seat: number, index: number) => void;
  registerAnchor: (seat: number, el: HTMLElement | null) => void;
  children?: ReactNode;
}

const ROTATION: Record<PlayerSeatProps['side'], number> = { top: 180, left: 90, right: -90 };

/**
 * Un rival sentado a la izquierda, arriba o a la derecha: su placa y sus cartas boca abajo en abanico
 * cerrado apuntando al centro de la mesa.
 */
export default function PlayerSeat({
  side,
  seat,
  name,
  count,
  isTurn,
  isVictim,
  out,
  pickable,
  onPick,
  registerAnchor,
}: PlayerSeatProps) {
  const vertical = side !== 'top';
  const fan =
    count > 0 ? (
      <OpponentFan
        count={count}
        heightVar="--oh"
        avail={vertical ? 'min(21dvh, 160px)' : 'min(28dvw, 300px)'}
        rotation={ROTATION[side]}
        active={pickable}
        label={name}
        onPick={(index) => onPick(seat, index)}
        containerRef={(el) => registerAnchor(seat, el)}
      />
    ) : (
      <span ref={(el) => registerAnchor(seat, el)} aria-hidden className="block h-[var(--oh)] w-[var(--oh)]" />
    );

  if (!vertical) {
    return (
      <div className="flex min-w-0 items-center justify-center gap-2">
        <SeatPlaque name={name} count={count} isTurn={isTurn} isVictim={isVictim} out={out} />
        <div className="flex h-[calc(var(--oh)+14px)] min-w-0 items-center justify-center px-2">{fan}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-1">
      <SeatPlaque name={name} count={count} isTurn={isTurn} isVictim={isVictim} out={out} />
      {/* El abanico se gira 90°: la caja reserva su largo como alto y el alto de carta como ancho. */}
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 'calc(var(--oh) + 16px)', height: 'min(24dvh, 175px)' }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{fan}</div>
      </div>
    </div>
  );
}
