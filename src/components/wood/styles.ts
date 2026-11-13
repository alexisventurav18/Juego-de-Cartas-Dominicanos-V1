/** Clases de los botones de acción de las mesas (mismo aspecto que los de El Cagao). */
const BASE =
  'min-h-[44px] min-w-0 flex-1 touch-manipulation rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 min-[380px]:text-xs sm:flex-none sm:px-4 sm:text-sm';

export const ACTION_MAIN = `${BASE} btn-gold font-extrabold`;
export const ACTION_FORM = `${BASE} btn-leaf`;
export const ACTION_DROP = `${BASE} btn-wood`;
export const ACTION_SING = `${BASE} btn-gold animate-pulse font-extrabold ring-2 ring-yellow-200`;

/** Botones de los paneles y ventanas. */
export const PANEL_BUTTON =
  'btn-gold inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-extrabold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
export const PANEL_BUTTON_QUIET =
  'btn-wood inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';

/** Chip cuadrado de la barra superior (salir, sonido...). */
export const CHIP_BUTTON = 'wood-chip grid h-9 w-9 shrink-0 place-items-center rounded-lg active:scale-95';
