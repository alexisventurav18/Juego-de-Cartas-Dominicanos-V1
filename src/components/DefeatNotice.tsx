interface DefeatNoticeProps {
  onContinue: () => void;
}

export default function DefeatNotice({ onContinue }: DefeatNoticeProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md space-y-8 text-center">
        <h2
          className="text-5xl font-black tracking-tight text-rose-300 drop-shadow-[0_4px_24px_rgba(253,164,175,0.35)] sm:text-6xl"
          style={{ animation: 'victory-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        >
          Perdiste la partida
        </h2>
        <p className="text-base text-stone-100">
          El otro equipo llegó primero a 21. Revisa el desglose para ver dónde se decidió.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-stone-100 px-6 py-3 text-sm font-semibold text-stone-900 shadow-lg transition hover:bg-white"
        >
          Ver el desglose
        </button>
      </div>
    </div>
  );
}
