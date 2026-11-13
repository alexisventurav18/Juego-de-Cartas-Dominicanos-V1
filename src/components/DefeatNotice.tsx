interface DefeatNoticeProps {
  onContinue: () => void;
  /** Textos opcionales: por defecto son los del Casino (partida por equipos a 21). */
  title?: string;
  message?: string;
  continueLabel?: string;
}

export default function DefeatNotice({
  onContinue,
  title = 'Perdiste la partida',
  message = 'El otro equipo llegó primero a 21. Revisa el desglose para ver dónde se decidió.',
  continueLabel = 'Ver el desglose',
}: DefeatNoticeProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md space-y-8 text-center">
        <h2
          className="text-[clamp(2rem,11vw,3.75rem)] font-black tracking-tight text-rose-300 drop-shadow-[0_4px_24px_rgba(253,164,175,0.35)] "
          style={{ animation: 'victory-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        >
          {title}
        </h2>
        <p className="text-base text-amber-50">{message}</p>
        <button
          type="button"
          onClick={onContinue}
          className="btn-wood min-h-[44px] rounded-lg px-6 py-3 text-sm font-bold shadow-lg transition-transform active:scale-95"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
