import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import { canStartGame, GAMES, isGameFinished } from '@/games';
import type { CasinoMove } from '@/games/casino';
import type { CinquilloMove } from '@/games/cinquillo';
import type { BurakoMove } from '@/games/burako';
import { botTickDelay } from '@/games/bots';
import { isBotPlayer } from '@/games/shared';
import { getPlayerId } from '@/lib/identity';
import { botTick, fetchRoom, requestStart, type RoomConnectionStatus, type RoomRow, sendMove, subscribeToRoom } from '@/lib/rooms';
import WaitingRoom from './WaitingRoom';
import CasinoTable from './CasinoTable';
import CinquilloTable from './CinquilloTable';
import BurakoTable from './BurakoTable';
import CoinToss from './CoinToss';

interface RoomViewProps {
  roomId: string;
  onLeave: () => void;
}

// Errores tras los cuales no tiene sentido seguir en la sala.
const FATAL_MESSAGES = ['Esta sala ya no existe.', 'No estás en esta sala.'];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Algo salió mal. Inténtalo de nuevo.';
}

export default function RoomView({ roomId, onLeave }: RoomViewProps) {
  const [playerId] = useState(getPlayerId);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [coinOpen, setCoinOpen] = useState(false);
  const [connection, setConnection] = useState<RoomConnectionStatus>('connecting');
  const [retryToken, setRetryToken] = useState(0);
  const versionRef = useRef(-1);

  const acceptRow = useCallback((row: RoomRow) => {
    setRoom((prev) => {
      const next = !prev || row.version >= prev.version ? row : prev;
      versionRef.current = next.version;
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      setConnection('connecting');
      fetchRoom(roomId)
        .then((row) => {
          if (!active) return;
          setLoadError(null);
          setConnection('connected');
          acceptRow(row);
        })
        .catch((err: unknown) => {
          if (!active) return;
          const message = errorMessage(err);
          setConnection('offline');
          if (FATAL_MESSAGES.includes(message) || versionRef.current === -1) setLoadError(message);
          else setNotice(message);
        });
    };

    refresh();
    const unsubscribe = subscribeToRoom(roomId, (version) => {
      if (version > versionRef.current) refresh();
    }, setConnection);
    const refreshTimer = window.setInterval(refresh, 15000);
    const handleOffline = () => setConnection('offline');
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', handleOffline);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomId, acceptRow, retryToken]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // El primer humano de la sala pide al servidor las jugadas de los bots; el servidor es quien las calcula.
  useEffect(() => {
    if (!room?.state || !room.players.some(isBotPlayer)) return;
    if (room.players.find((p) => !isBotPlayer(p))?.id !== playerId) return;
    const delay = botTickDelay(room.state);
    if (delay === null) return;
    const timer = setTimeout(() => {
      botTick(room.id, room.version).then(acceptRow).catch((err: unknown) => setNotice(errorMessage(err)));
    }, delay);
    return () => clearTimeout(timer);
  }, [room, playerId, acceptRow]);

  if (loadError) {
    return (
      <StatusMessage
        message={loadError}
        onRetry={() => {
          versionRef.current = -1;
          setRoom(null);
          setLoadError(null);
          setRetryToken((value) => value + 1);
        }}
        onLeave={onLeave}
      />
    );
  }
  if (!room) {
    return <p className="py-20 text-center text-sm text-stone-500">Cargando sala...</p>;
  }

  const seat = room.players.findIndex((p) => p.id === playerId);
  if (seat === -1) {
    return <StatusMessage message="No estás en esta sala." onLeave={onLeave} />;
  }

  const run = async (action: () => Promise<RoomRow>) => {
    setSaving(true);
    try {
      acceptRow(await action());
    } catch (err) {
      setNotice(errorMessage(err));
      fetchRoom(roomId).then(acceptRow).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const startGame = () => {
    if (!canStartGame(room.game, room.players.length)) {
      setNotice(`Este juego necesita ${GAMES[room.game].playerCountLabel.toLowerCase()}.`);
      return;
    }
    if (room.game === 'casino' && room.players.some(isBotPlayer)) {
      setCoinOpen(true);
      return;
    }
    void run(() => requestStart(room.id));
  };

  const startSoloGame = (humanWonToss: boolean) => {
    setCoinOpen(false);
    const dealer = humanWonToss ? room.players.findIndex(isBotPlayer) : seat;
    void run(() => requestStart(room.id, dealer));
  };

  const state = room.state;
  const info = GAMES[room.game];

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6 sm:py-8">
      <header className="mb-3 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 sm:gap-2 sm:px-3 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Salir de la sala
        </button>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-stone-500 sm:text-xs">{info.name}</p>
          <p className="font-mono text-base font-semibold tracking-[0.3em] text-stone-900 sm:text-lg">{room.code}</p>
        </div>
      </header>

      <div
        role="status"
        aria-live="polite"
        className={`mb-3 flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-medium sm:mb-5 sm:px-4 sm:py-2 sm:text-xs ${
          connection === 'connected'
            ? 'bg-emerald-50 text-emerald-700'
            : connection === 'offline'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-amber-50 text-amber-700'
        }`}
      >
        {connection === 'connected' && <Wifi className="h-3.5 w-3.5" />}
        {connection === 'offline' && <WifiOff className="h-3.5 w-3.5" />}
        {connection === 'connecting' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
        {connection === 'connected' ? 'Conectado al servidor' : connection === 'offline' ? 'Sin conexión. Reintentando...' : 'Conectando al servidor...'}
      </div>

      {notice && (
        <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 shadow-sm">
          {notice}
        </p>
      )}

      {coinOpen && <CoinToss onDone={startSoloGame} />}

      {state === null || room.status === 'waiting' ? (
        <WaitingRoom room={room} myId={playerId} busy={saving} onStart={startGame} />
      ) : (
        <div className={`transition ${saving ? 'pointer-events-none opacity-80' : ''}`}>
          {state.game === 'casino' && (
            <CasinoTable state={state} seat={seat} onMove={(move: CasinoMove) => void run(() => sendMove(room.id, move))} />
          )}
          {state.game === 'cinquillo' && (
            <CinquilloTable state={state} seat={seat} onMove={(move: CinquilloMove) => void run(() => sendMove(room.id, move))} />
          )}
          {state.game === 'burako' && (
            <BurakoTable state={state} seat={seat} onMove={(move: BurakoMove) => void run(() => sendMove(room.id, move))} />
          )}
          {isGameFinished(state) && seat === 0 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-800"
              >
                <RotateCcw className="h-4 w-4" />
                Jugar otra partida
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusMessage({ message, onRetry, onLeave }: { message: string; onRetry?: () => void; onLeave: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-stone-700">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Reintentar
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
