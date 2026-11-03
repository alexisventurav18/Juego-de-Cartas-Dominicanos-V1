import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { canStartGame, GAMES, isGameFinished } from '@/games';
import type { CasinoMove } from '@/games/casino';
import type { CinquilloMove } from '@/games/cinquillo';
import type { BurakoMove } from '@/games/burako';
import { botTickDelay } from '@/games/bots';
import { isBotPlayer } from '@/games/shared';
import { getPlayerId } from '@/lib/identity';
import { botTick, fetchRoom, requestStart, type RoomRow, sendMove, subscribeToRoom } from '@/lib/rooms';
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
      fetchRoom(roomId)
        .then((row) => {
          if (active) acceptRow(row);
        })
        .catch((err: unknown) => {
          if (!active) return;
          const message = errorMessage(err);
          if (FATAL_MESSAGES.includes(message) || versionRef.current === -1) setLoadError(message);
          else setNotice(message);
        });
    };

    refresh();
    const unsubscribe = subscribeToRoom(roomId, (version) => {
      if (version > versionRef.current) refresh();
    });
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  }, [roomId, acceptRow]);

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
    return <StatusMessage message={loadError} onLeave={onLeave} />;
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Salir de la sala
        </button>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-stone-500">{info.name}</p>
          <p className="font-mono text-lg font-semibold tracking-[0.3em] text-stone-900">{room.code}</p>
        </div>
      </header>

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

function StatusMessage({ message, onLeave }: { message: string; onLeave: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-stone-700">{message}</p>
      <button
        type="button"
        onClick={onLeave}
        className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
      >
        Volver al inicio
      </button>
    </div>
  );
}
