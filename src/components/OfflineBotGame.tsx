import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { createGameState, createSoloPlayers, GAMES, isGameFinished, type GameState } from '@/games';
import { botStep, botTickDelay } from '@/games/bots';
import { applyGameMove } from '@/games/engine';
import type { CagaoMove } from '@/games/cagao';
import type { CasinoMove } from '@/games/casino';
import type { GameId, Player } from '@/games/shared';
import type { TresYDosMove } from '@/games/tresYDos';
import { projectState } from '@/games/view';
import CagaoTable from './CagaoTable';
import CasinoTable from './CasinoTable';
import TresYDosTable from './TresYDosTable';
import { PANEL_BUTTON } from './wood/styles';

/** Qué partida local se va a jugar: el juego, tu nombre y cuántos jugadores habrá en total (tú + bots). */
export interface OfflineSetup {
  game: GameId;
  playerName: string;
  playerCount: number;
}

interface OfflineBotGameProps extends OfflineSetup {
  onLeave: () => void;
}

const HUMAN_SEAT = 0;
const NOTICE_MS = 4000;

/**
 * Partida sin conexión contra bots. Usa el mismo motor de reglas y la misma IA que el servidor, pero todo
 * corre en este dispositivo: no hay sala, cuenta ni red. Tú siempre eres el asiento 0.
 */
export default function OfflineBotGame({ game, playerName, playerCount, onLeave }: OfflineBotGameProps) {
  const players = useMemo<Player[]>(
    () => createSoloPlayers(game, { id: 'local-human', name: playerName }, playerCount),
    [game, playerName, playerCount],
  );
  const [state, setState] = useState<GameState>(() => createGameState(game, players));
  const [matchKey, setMatchKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Los bots juegan solos cuando les toca: cualquier cambio del estado reinicia la espera.
  useEffect(() => {
    const delay = botTickDelay(state);
    if (delay === null) return;
    const timer = window.setTimeout(() => {
      const step = botStep(state);
      if (!step) return;
      if ('error' in step.result) {
        setNotice(step.result.error);
        return;
      }
      setState(step.result.state);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const move = (nextMove: CasinoMove | TresYDosMove | CagaoMove) => {
    const result = applyGameMove(state, HUMAN_SEAT, nextMove);
    if ('error' in result) {
      setNotice(result.error);
      return;
    }
    setState(result.state);
  };

  const rematch = () => {
    setState(createGameState(game, players));
    setMatchKey((key) => key + 1);
    setNotice(null);
  };

  // Solo tu mano es visible: las de los bots llegan a la mesa como cartas boca abajo, igual que en línea.
  const view = projectState(state, HUMAN_SEAT);
  const tableProps = {
    seat: HUMAN_SEAT,
    onLeave,
    notice,
    roomLabel: `${GAMES[game].name} · contra bots · sin conexión`,
    resultFooter: isGameFinished(state) ? (
      <button type="button" onClick={rematch} className={PANEL_BUTTON}>
        <RotateCcw className="h-4 w-4" />
        Jugar otra partida
      </button>
    ) : undefined,
  };

  if (view.game === 'casino') {
    return <CasinoTable key={matchKey} state={view} {...tableProps} onMove={move} />;
  }
  if (view.game === 'tresydos') {
    return <TresYDosTable key={matchKey} state={view} {...tableProps} onMove={move} />;
  }
  return <CagaoTable key={matchKey} state={view} {...tableProps} onMove={move} />;
}
