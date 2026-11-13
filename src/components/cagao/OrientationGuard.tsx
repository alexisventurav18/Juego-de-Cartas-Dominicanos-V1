/**
 * Aviso para girar el teléfono: El Cagao se juega en horizontal. Solo se ve en pantallas angostas en
 * vertical (la regla es de CSS, así no hay parpadeo ni hace falta JavaScript).
 */
export default function OrientationGuard() {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[70] hidden flex-col items-center justify-center gap-5 bg-[#2a160a] bg-[radial-gradient(ellipse_at_50%_40%,#5b3416,#2a160a_70%)] p-8 text-center text-amber-50 portrait:max-md:flex"
    >
      <svg viewBox="0 0 64 64" className="orientation-phone h-24 w-24 text-amber-300" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="20" y="6" width="24" height="46" rx="5" />
        <path d="M29 46H35" />
        <path d="M50 24C56 28 56 38 50 42M50 42L47 37M50 42L55 40" />
      </svg>
      <h2 className="text-2xl font-extrabold tracking-tight">Gira tu dispositivo</h2>
      <p className="max-w-xs text-sm text-amber-100/85">
        El Cagao se juega en horizontal: así caben la mesa, los rivales y tus cartas. Pon el teléfono de lado
        para seguir jugando.
      </p>
    </div>
  );
}
