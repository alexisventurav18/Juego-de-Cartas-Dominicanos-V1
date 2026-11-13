import { AlertTriangle } from 'lucide-react';
import { CASINO_TARGET, type ClosingNeeds, closingLabel } from '@/games/casino';
import { PANEL_BUTTON } from './wood/styles';

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
    <div className="fixed inset-0 z-[45] flex items-center justify-center bg-black/55 p-3">
      <section role="status" className="wood-panel flex w-full max-w-lg flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-1 gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="space-y-2">
            <p className="text-sm font-extrabold text-amber-300">Zona de Cierre</p>
            {alerts.map((alert) => (
              <p key={alert.team} className="text-sm leading-relaxed text-amber-50">
                <span className="font-bold">{alert.team}</span>
                {alert.entered ? ' entró en la Zona de Cierre' : ''} con {alert.score} puntos. Para llegar a{' '}
                {CASINO_TARGET} exactos necesita {closingLabel(alert.needs)} (faltan {CASINO_TARGET - alert.score} pts).
              </p>
            ))}
          </div>
        </div>
        <button type="button" onClick={onDismiss} className={`${PANEL_BUTTON} self-end`}>
          Entendido
        </button>
      </section>
    </div>
  );
}
