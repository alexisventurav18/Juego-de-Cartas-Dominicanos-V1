import { AlertTriangle } from 'lucide-react';
import { CASINO_TARGET, type ClosingNeeds, closingLabel } from '@/games/casino';

export interface ClosingAlert {
  team: string;
  score: number;
  needs: ClosingNeeds;
  entered: boolean;
}

interface ClosingZoneBannerProps {
  alerts: ClosingAlert[];
  onDismiss: () => void;
}

export default function ClosingZoneBanner({ alerts, onDismiss }: ClosingZoneBannerProps) {
  return (
    <section
      role="status"
      className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Zona de Cierre</p>
          {alerts.map((alert) => (
            <p key={alert.team} className="text-sm leading-relaxed text-stone-800">
              <span className="font-semibold">{alert.team}</span>
              {alert.entered ? ' entró en la Zona de Cierre' : ''} con {alert.score} puntos. Para llegar a{' '}
              {CASINO_TARGET} exactos necesita {closingLabel(alert.needs)} (faltan {CASINO_TARGET - alert.score} pts).
            </p>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="self-end rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-amber-400 sm:self-center"
      >
        Entendido
      </button>
    </section>
  );
}
