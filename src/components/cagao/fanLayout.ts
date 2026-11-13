/**
 * Geometría de los abanicos de cartas, expresada en CSS para que escale con la pantalla.
 * El ancho de una carta es 5/7 de su alto (proporción 2.5 : 3.5).
 */
const CARD_RATIO = 2.5 / 3.5;

/**
 * Margen izquierdo de cada carta (menos la primera): solapa lo justo para que `n` cartas quepan en
 * `avail` (una longitud CSS), sin separarlas más de lo que se solaparían con `overlap` fijo.
 */
export function fanMargin(n: number, heightVar: string, avail: string, overlap = 0.5): string {
  if (n <= 1) return '0px';
  const w = `(var(${heightVar}) * ${CARD_RATIO})`;
  return `calc(min(${w} * ${1 - overlap}, (${avail} - ${w}) / ${n - 1}) - ${w})`;
}

/** Giro y caída de cada carta para que el abanico se curve como una mano sostenida. */
export function fanPose(i: number, n: number, heightVar: string, maxSpreadDeg = 26) {
  const center = (n - 1) / 2;
  const d = i - center;
  const step = n > 1 ? Math.min(5, maxSpreadDeg / (n - 1)) : 0;
  return {
    rotate: d * step,
    drop: `calc(var(${heightVar}) * ${(0.006 * d * d).toFixed(4)})`,
  };
}
