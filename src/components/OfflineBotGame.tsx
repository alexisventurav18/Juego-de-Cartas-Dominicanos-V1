import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, WifiOff } from 'lucide-react';
import { applyGameMove } from '@/games/engine';
import { botStep, botTickDelay } from '@/games/bots';
import { createSoloPlayers } from '@/games';
import { createCasinoGame, type CasinoMove, type CasinoState } from '@/games/casino';
import type { Player } from '@/games/shared';
import CasinoTable from './CasinoTable';

export type OfflineBotMode = 'team' | 'solo';

interface OfflineBotGameProps {
  playerName: string;
  mode: OfflineBotMode;
  onLeave: () => void;
}

/** Casino local: usa el mismo motor y la misma IA, pero no depende de Supabase. */
export default function OfflineBotGame({ playerName, mode, onLeave }: OfflineBotGameProps) {
  const players = useMemo<Player[]>(
    () => createSoloPlayers('casino', { id: 'local-human', name: playerName }, mode === 'solo' ? 2 : 4),
    [mode, playerName],
  );
  const [state, setState] = useState<CasinoState>(() => createCasinoGame(players, 0));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const delay = botTickDelay(state);
    if (delay === null || busy) return;
    const timer = window.setTimeout(() => {
      const step = botStep(state);
      if (!step || 'error' in step.result) return;
      setState(step.result.state as CasinoState);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [busy, state]);

  const move = (nextMove: CasinoMove) => {
    if (busy) return;
    setBusy(true);
    const result = applyGameMove(state, 0, nextMove);
    if ('state' in result) setState(result.state as CasinoState);
    setBusy(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6 sm:py-8">
      <header className="mb-3 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Salir de la partida
        </button>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-widest text-stone-500 sm:text-xs">
            <WifiOff className="h-3 w-3" /> Sin conexión
          </p>
          <p className="font-semibold text-stone-900">Casino · {mode === 'solo' ? '1 contra 1' : 'equipos'}</p>
        </div>
      </header>

      <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-stone-200/70 px-3 py-1.5 text-[11px] font-medium text-stone-600 sm:mb-5 sm:py-2 sm:text-xs">
        <Bot className="h-3.5 w-3.5" />
        {mode === 'solo' ? 'Tú contra un bot' : 'Tú y tu bot contra dos bots'} · partida local
      </div>

      <div className={busy ? 'pointer-events-none opacity-80 transition' : 'transition'}>
        <CasinoTable state={state} seat={0} onMove={move} />
      </div>
    </div>
  );
}
