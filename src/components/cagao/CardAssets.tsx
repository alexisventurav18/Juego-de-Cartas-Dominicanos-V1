import { useId } from 'react';
import type { Suit } from './types';

/* ------------------------------------------------------------------ */
/* Palos                                                               */
/* ------------------------------------------------------------------ */

const SUIT_PATH: Record<string, string> = {
  corazones:
    'M50 90C8 60 4 34 22 21C37 11 50 23 50 32C50 23 63 11 78 21C96 34 92 60 50 90Z',
  diamantes: 'M50 6L88 50L50 94L12 50Z',
  picas:
    'M50 6C82 36 94 52 81 69C70 82 56 76 54 66C56 80 60 88 68 94H32C40 88 44 80 46 66C44 76 30 82 19 69C6 52 18 36 50 6Z',
  treboles:
    'M50 8C61 8 69 17 69 27C69 33 66 38 61 42C64 41 67 40 71 40C82 40 90 48 90 58C90 68 82 76 71 76C63 76 57 72 53 66C53 78 56 87 63 94H37C44 87 47 78 47 66C43 72 37 76 29 76C18 76 10 68 10 58C10 48 18 40 29 40C33 40 36 41 39 42C34 38 31 33 31 27C31 17 39 8 50 8Z',
};

export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  const path = SUIT_PATH[suit];
  if (!path) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="currentColor">
      <path d={path} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mazorca de cacao                                                    */
/* ------------------------------------------------------------------ */

export function CacaoPod({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 112" className={className} aria-hidden>
      <defs>
        <linearGradient id={`pod${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#f0a846" />
          <stop offset="0.5" stopColor="#bd6a20" />
          <stop offset="1" stopColor="#7a3a10" />
        </linearGradient>
      </defs>
      <path d="M30 14C48 28 57 64 30 106C3 64 12 28 30 14Z" fill={`url(#pod${id})`} stroke="#4a210a" strokeWidth="2" />
      <g fill="none" stroke="#5a2b0c" strokeWidth="1.7" strokeLinecap="round">
        <path d="M30 17C37 42 37 78 30 103" />
        <path d="M30 17C23 42 23 78 30 103" />
        <path d="M30 22C45 42 47 72 31 101" opacity="0.6" />
        <path d="M30 22C15 42 13 72 29 101" opacity="0.6" />
      </g>
      <path d="M21 44C23 33 27 26 30 21" stroke="#f6cd86" strokeWidth="2.2" opacity="0.6" fill="none" strokeLinecap="round" />
      <path d="M30 14C30 8 33 4 39 2" stroke="#456a1f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M36 6C44 0 54 2 56 8C48 12 40 11 36 6Z" fill="#5f8f35" stroke="#2f4d14" strokeWidth="1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Máscara de carnaval dominicano (diablo cojuelo)                     */
/* ------------------------------------------------------------------ */

export function CarnivalMask({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 120 132" className={className} aria-hidden>
      <defs>
        <linearGradient id={`face${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8452c" />
          <stop offset="1" stopColor="#9c1d1d" />
        </linearGradient>
        <linearGradient id={`horn${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f3c13a" />
          <stop offset="1" stopColor="#b9801a" />
        </linearGradient>
      </defs>
      <path d="M36 46C24 24 12 14 3 14C6 36 18 56 38 68Z" fill={`url(#horn${id})`} stroke="#5a3a07" strokeWidth="2" />
      <path d="M84 46C96 24 108 14 117 14C114 36 102 56 82 68Z" fill={`url(#horn${id})`} stroke="#5a3a07" strokeWidth="2" />
      <path
        d="M60 10C88 10 101 40 99 70C97 101 81 122 60 126C39 122 23 101 21 70C19 40 32 10 60 10Z"
        fill={`url(#face${id})`}
        stroke="#4a0d0d"
        strokeWidth="2.4"
      />
      <path d="M60 18L69 30L60 42L51 30Z" fill="#19a7a1" stroke="#0b5d5a" strokeWidth="1.4" />
      <path d="M28 50C37 38 52 38 58 48M92 50C83 38 68 38 62 48" fill="none" stroke="#f3c13a" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M32 62C39 51 52 51 57 62C51 70 39 70 32 62Z" fill="#161616" />
      <path d="M88 62C81 51 68 51 63 62C69 70 81 70 88 62Z" fill="#161616" />
      <circle cx="42" cy="60" r="3" fill="#fff" opacity="0.85" />
      <circle cx="78" cy="60" r="3" fill="#fff" opacity="0.85" />
      <path d="M60 64L51 87C55 92 65 92 69 87Z" fill="#a31f1f" stroke="#4a0d0d" strokeWidth="1.6" />
      <path d="M36 99C47 112 73 112 84 99C73 104 47 104 36 99Z" fill="#2a0707" />
      <path d="M39 100L44 108L49 102L54 110L60 103L66 110L71 102L76 108L81 100" fill="none" stroke="#fff6dc" strokeWidth="2.4" strokeLinejoin="round" />
      <g fill="#f3c13a">
        <circle cx="32" cy="82" r="3.2" />
        <circle cx="88" cy="82" r="3.2" />
        <circle cx="38" cy="92" r="2.4" />
        <circle cx="82" cy="92" r="2.4" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Marco de madera tallada                                             */
/* ------------------------------------------------------------------ */

function CornerOrnament({ className }: { className?: string }) {
  return (
    <div className={`absolute z-30 h-[var(--corner)] w-[var(--corner)] ${className ?? ''}`}>
      <div className="wood-block absolute inset-0 rounded-br-[40%]" />
      <CacaoPod className="absolute left-[14%] top-[10%] h-[78%] -rotate-[28deg]" />
      <CacaoPod className="absolute left-[40%] top-[6%] h-[62%] rotate-[22deg] opacity-95" />
    </div>
  );
}

function MaskMedallion({ className }: { className?: string }) {
  return (
    <div className={`absolute z-30 h-[var(--medal)] w-[var(--medal)] ${className ?? ''}`}>
      <div className="wood-block absolute inset-0 rounded-full" />
      <CarnivalMask className="absolute inset-[10%] h-[80%] w-[80%]" />
    </div>
  );
}

/**
 * Marco exterior: cuatro rieles de madera, mazorcas de cacao en las esquinas y máscaras de carnaval
 * en el centro de los lados largos. Es decoración pura (no recibe toques).
 */
export function WoodFrame() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div className="wood-rail absolute inset-x-0 top-0 h-[var(--frame)]" />
      <div className="wood-rail absolute inset-x-0 bottom-0 h-[var(--frame)]" />
      <div className="wood-rail absolute inset-y-0 left-0 w-[var(--frame)]" />
      <div className="wood-rail absolute inset-y-0 right-0 w-[var(--frame)]" />
      <div className="absolute inset-[var(--frame)] rounded-[10px] shadow-[inset_0_0_0_2px_rgba(255,214,140,0.35),inset_0_6px_18px_rgba(0,0,0,0.55)]" />
      <CornerOrnament className="left-0 top-0" />
      <CornerOrnament className="right-0 top-0 -scale-x-100" />
      <CornerOrnament className="bottom-0 left-0 -scale-y-100" />
      <CornerOrnament className="bottom-0 right-0 -scale-100" />
      <MaskMedallion className="left-1/2 top-[calc(var(--frame)*-0.35)] -translate-x-1/2" />
      <MaskMedallion className="bottom-[calc(var(--frame)*-0.35)] left-1/2 -translate-x-1/2" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reverso de las cartas: cacao sobre fondo crema                      */
/* ------------------------------------------------------------------ */

const LEAF = (x: number, y: number, rot: number, s = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C14-14 38-14 52 0C38 14 14 14 0 0Z" fill="#5f8f35" stroke="#2f4d14" stroke-width="1.6"/><path d="M2 0H50" stroke="#2f4d14" stroke-width="1.4"/></g>`;

const POD = (x: number, y: number, rot: number, s = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C18 14 27 50 0 92C-27 50 -18 14 0 0Z" fill="#bd6a20" stroke="#4a210a" stroke-width="2"/><path d="M0 4C7 30 7 64 0 88M0 4C-7 30 -7 64 0 88" fill="none" stroke="#5a2b0c" stroke-width="1.6"/><path d="M-9 28C-7 18 -3 11 0 6" stroke="#f6cd86" stroke-width="2" fill="none" opacity=".6"/></g>`;

const BACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350">
<rect width="250" height="350" rx="16" fill="#f4e8c8"/>
<rect x="9" y="9" width="232" height="332" rx="11" fill="none" stroke="#a8742a" stroke-width="3"/>
<rect x="17" y="17" width="216" height="316" rx="7" fill="none" stroke="#c9962b" stroke-width="1.4" stroke-dasharray="2 5"/>
<path d="M125 36C108 90 142 140 125 196C108 246 140 296 125 318" fill="none" stroke="#4d7326" stroke-width="5" stroke-linecap="round"/>
${LEAF(122, 82, -148, 0.95)}${LEAF(128, 100, -32, 0.95)}${LEAF(122, 232, -148, 0.95)}${LEAF(128, 250, -32, 0.95)}
${LEAF(124, 150, -158, 0.8)}${LEAF(126, 168, -22, 0.8)}
${POD(88, 168, 14, 0.95)}${POD(162, 168, -14, 0.95)}
<g fill="#e9a3ab" stroke="#b9626d" stroke-width="1"><circle cx="112" cy="130" r="4.5"/><circle cx="139" cy="214" r="4.5"/><circle cx="114" cy="276" r="4"/><circle cx="137" cy="70" r="4"/></g>
<g fill="#5f8f35" stroke="#2f4d14" stroke-width="1">
<path d="M28 28c14 0 22 8 22 22c-14 0-22-8-22-22Z"/><path d="M222 28c-14 0-22 8-22 22c14 0 22-8 22-22Z"/>
<path d="M28 322c14 0 22-8 22-22c-14 0-22 8-22 22Z"/><path d="M222 322c-14 0-22-8-22-22c14 0 22 8 22 22Z"/></g>
</svg>`;

/** Fondo del reverso (una sola imagen reutilizada por todas las cartas boca abajo). */
export const CARD_BACK_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(BACK_SVG)}")`;

/* ------------------------------------------------------------------ */
/* El Cagao (A♠) y figuras con detalles dorados                        */
/* ------------------------------------------------------------------ */

/** Cara especial del A♠: la carta sin pareja. */
export function CagaoFaceArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 250 350" className={className} aria-hidden>
      <defs>
        <linearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d77a" />
          <stop offset="0.5" stopColor="#c9962b" />
          <stop offset="1" stopColor="#8a5f12" />
        </linearGradient>
        <radialGradient id={`glow${id}`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="1" stopColor="#f1e0b3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="250" height="350" rx="16" fill="#f7ecce" />
      <rect width="250" height="350" rx="16" fill={`url(#glow${id})`} />
      <rect x="9" y="9" width="232" height="332" rx="11" fill="none" stroke={`url(#gold${id})`} strokeWidth="4" />
      <rect x="18" y="18" width="214" height="314" rx="7" fill="none" stroke="#7a1d1d" strokeWidth="1.5" />
      <path
        d="M125 62C185 118 208 150 184 184C163 210 135 198 131 178C135 206 143 224 157 236H93C107 224 115 206 119 178C115 198 87 210 66 184C42 150 65 118 125 62Z"
        fill="#1d1b2e"
        stroke={`url(#gold${id})`}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M125 96C150 124 160 140 150 154" fill="none" stroke="#f6d77a" strokeWidth="3" opacity="0.5" strokeLinecap="round" />
      <path d="M26 306C70 292 180 292 224 306L214 330H36Z" fill="#a31f2b" stroke="#4a0d12" strokeWidth="2.4" />
      <text x="125" y="318" textAnchor="middle" fontSize="23" fontWeight="800" fill="#ffe9a8" fontFamily="Georgia, serif" letterSpacing="2">
        EL CAGAO
      </text>
      <g transform="translate(28 38) rotate(-14)" opacity="0.95">
        <path d="M0 0C12 10 17 30 0 56C-17 30 -12 10 0 0Z" fill="#bd6a20" stroke="#4a210a" strokeWidth="1.6" />
      </g>
      <g transform="translate(222 38) rotate(14)" opacity="0.95">
        <path d="M0 0C12 10 17 30 0 56C-17 30 -12 10 0 0Z" fill="#bd6a20" stroke="#4a210a" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

/** Adorno dorado para las figuras (J, Q y K). */
export function FaceCrest({ rank, className }: { rank: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 130" className={className} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8dc84" />
          <stop offset="0.55" stopColor="#c9962b" />
          <stop offset="1" stopColor="#8a5f12" />
        </linearGradient>
      </defs>
      <g fill={`url(#g${id})`} stroke="#6b470b" strokeWidth="2" strokeLinejoin="round">
        {rank === 13 && (
          <>
            <path d="M14 58L22 24L38 44L50 14L62 44L78 24L86 58Z" />
            <rect x="14" y="58" width="72" height="12" rx="3" />
            <circle cx="50" cy="14" r="5" />
            <circle cx="22" cy="24" r="4" />
            <circle cx="78" cy="24" r="4" />
          </>
        )}
        {rank === 12 && (
          <>
            <path d="M18 60C18 40 30 28 50 28C70 28 82 40 82 60Z" />
            <path d="M30 30L38 12L50 28L62 12L70 30" />
            <circle cx="38" cy="12" r="4" />
            <circle cx="62" cy="12" r="4" />
            <circle cx="50" cy="44" r="6" fill="#a31f2b" stroke="#4a0d12" />
            <rect x="16" y="60" width="68" height="10" rx="3" />
          </>
        )}
        {rank === 11 && (
          <>
            <path d="M18 62C18 38 34 26 52 26C66 26 78 34 82 46L96 22C98 40 92 56 84 62Z" />
            <rect x="16" y="62" width="68" height="10" rx="3" />
            <path d="M50 76L50 118M42 86H58" stroke="#6b470b" strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
      <path d="M22 96C34 108 66 108 78 96" fill="none" stroke={`url(#g${id})`} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
