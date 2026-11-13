import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { WoodFrame } from '../cagao/CardAssets';

interface WoodShellProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Medidas del marco. Más chicas que en El Cagao porque Casino y Tres y Dos también se juegan en vertical. */
const SHELL_VARS = {
  '--frame': 'clamp(8px, 2.2dvh, 18px)',
  '--corner': 'clamp(22px, 6dvh, 44px)',
  '--medal': 'clamp(20px, 5dvh, 38px)',
} as CSSProperties;

/**
 * Pantalla completa de una mesa: fondo de madera, marco tallado con mazorcas de cacao y máscaras,
 * y el contenido dentro del marco. Es el mismo acabado de El Cagao, compartido por todos los juegos.
 */
export default function WoodShell({ children, className = '', style }: WoodShellProps) {
  // La mesa ocupa toda la pantalla: se bloquea el scroll de la página mientras está abierta.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  return (
    <div
      style={{ ...SHELL_VARS, ...style }}
      className={`wood-stage fixed inset-0 z-30 flex h-dvh w-screen touch-manipulation select-none flex-col justify-between overflow-hidden overscroll-none px-[calc(var(--frame)+2px)] pb-[calc(env(safe-area-inset-bottom)+var(--corner)*0.75)] pt-[calc(env(safe-area-inset-top)+var(--frame)+var(--medal)*0.45)] ${className}`}
    >
      <WoodFrame />
      {children}
    </div>
  );
}
