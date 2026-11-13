import { useState, type FormEvent } from 'react';
import { Bot, ChevronDown, DoorOpen, RefreshCw, Spade, Users, WifiOff } from 'lucide-react';
import { GAMES } from '@/games';
import type { GameId } from '@/games/shared';
import { createRoom, createSoloRoom, joinRoom } from '@/lib/rooms';
import { getPlayerId, getStoredName, resetPlayerIdentity, storeName } from '@/lib/identity';
import GameCarousel from './GameCarousel';
import type { OfflineSetup } from './OfflineBotGame';

interface LobbyProps {
  onEnter: (roomId: string) => void;
  onStartOffline: (setup: OfflineSetup) => void;
}

const GAME_ORDER: GameId[] = ['casino', 'tresydos', 'cagao'];

interface OfflineOption {
  /** Jugadores en total, contando al humano. */
  count: number;
  label: string;
}

/** Tamaños de mesa que se pueden jugar sin conexión: el Casino va por equipos; los otros, por número de bots. */
function offlineOptions(game: GameId): OfflineOption[] {
  if (game === 'casino') {
    return [
      { count: 4, label: 'En equipo (3 bots)' },
      { count: 2, label: '1 contra 1' },
    ];
  }
  return GAMES[game].playerCounts.map((count) => ({ count, label: `${count - 1} bot${count === 2 ? '' : 's'}` }));
}

const inputClass =
  'w-full rounded-xl bg-black/35 px-4 py-2.5 text-amber-50 ring-1 ring-amber-200/30 placeholder:text-amber-100/40 transition focus:outline-none focus:ring-2 focus:ring-amber-300';
const primaryButton =
  'btn-gold flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
const leafButton =
  'btn-leaf flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
const quietButton =
  'btn-wood flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

export default function Lobby({ onEnter, onStartOffline }: LobbyProps) {
  const [name, setName] = useState(getStoredName);
  const [game, setGame] = useState<GameId>('casino');
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [busy, setBusy] = useState<'create' | 'join' | 'solo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Tamaño de mesa elegido para jugar sin conexión, por juego (si no se tocó, el recomendado).
  const [offlineCounts, setOfflineCounts] = useState<Partial<Record<GameId, number>>>({});

  const info = GAMES[game];
  const trimmedName = name.trim();
  const options = offlineOptions(game);
  const offlineCount = offlineCounts[game] ?? info.soloPlayerCount;

  const run = async (kind: 'create' | 'join' | 'solo', action: (player: { id: string; name: string }) => Promise<string>) => {
    if (!trimmedName) {
      setError('Escribe tu nombre para continuar.');
      return;
    }
    setBusy(kind);
    setError(null);
    storeName(trimmedName);
    try {
      const roomId = await action({ id: getPlayerId(), name: trimmedName });
      onEnter(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () => run('create', async (player) => (await createRoom(game, player)).id);

  const handleSolo = () => run('solo', async (player) => (await createSoloRoom(game, player)).id);

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Escribe el código de la sala.');
      return;
    }
    void run('join', async (player) => (await joinRoom(code, player)).id);
  };

  const changePlayer = () => {
    resetPlayerIdentity();
    setName('');
    setCode('');
    setError(null);
  };

  const startOffline = () => {
    if (!trimmedName) {
      setError('Escribe tu nombre para continuar.');
      return;
    }
    setError(null);
    storeName(trimmedName);
    onStartOffline({ game, playerName: trimmedName, playerCount: offlineCount });
  };

  return (
    <div className="wood-stage min-h-dvh">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+2rem)] sm:px-6 sm:py-12">
        <header className="flex items-center gap-4">
          <div className="wood-block grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-amber-300">
            <Spade className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-amber-50 sm:text-3xl">Mesa de cartas</h1>
            <p className="text-sm text-amber-100/75">Juega con tus amigos en línea o contra bots, sin conexión.</p>
          </div>
        </header>

        <label className="block space-y-1.5">
          <span className="flex items-center justify-between text-sm font-bold text-amber-100">
            <span>Tu nombre</span>
            {trimmedName && (
              <button
                type="button"
                onClick={changePlayer}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200"
              >
                <RefreshCw className="h-3 w-3" />
                Cambiar jugador
              </button>
            )}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="Cómo te verán los demás"
            className={inputClass}
          />
        </label>

        <section className="space-y-2" aria-labelledby="games-heading">
          <h2 id="games-heading" className="text-sm font-bold text-amber-100">
            Elige un juego
          </h2>
          <GameCarousel games={GAME_ORDER} selected={game} onSelect={setGame} />

          <div className="wood-panel overflow-hidden">
            {info.quickRules && (
              <div className="space-y-3 border-b border-amber-200/15 px-5 py-5">
                <p className="text-sm font-extrabold text-amber-300">Lo esencial de {info.name}</p>
                <ul className="space-y-2 text-sm leading-relaxed text-amber-50/90">
                  {info.quickRules.map((rule) => (
                    <li key={rule} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              aria-expanded={showRules}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-amber-100 transition hover:text-amber-50"
            >
              Reglas de {info.name}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showRules ? 'rotate-180' : ''}`} />
            </button>
            {showRules && (
              <ul className="space-y-2 border-t border-amber-200/15 px-5 py-4 text-sm leading-relaxed text-amber-100/80">
                {info.rules.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="wood-panel space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-amber-50">
                <WifiOff className="h-4 w-4 text-amber-300" />
                Jugar sin conexión
              </h2>
              <p className="mt-1 text-sm text-amber-100/75">
                Contra bots en este dispositivo. No necesita sala, cuenta ni internet.
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold text-amber-100">
                {game === 'casino' ? 'Tipo de partida' : 'Rivales'}
              </legend>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const active = option.count === offlineCount;
                  return (
                    <button
                      key={option.count}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setOfflineCounts((current) => ({ ...current, [game]: option.count }))}
                      className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-bold transition-transform active:scale-95 sm:text-sm ${
                        active ? 'btn-gold' : 'btn-wood'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button type="button" onClick={startOffline} className={primaryButton}>
              <Bot className="h-4 w-4" />
              Jugar {info.name} sin conexión
            </button>
          </div>

          <div className="space-y-5">
            <div className="wood-panel space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-extrabold text-amber-50">Crear sala de {info.name}</h2>
                <p className="mt-1 text-sm text-amber-100/75">Recibirás un código para que tus amigos entren.</p>
              </div>
              <button type="button" onClick={handleCreate} disabled={busy !== null} className={leafButton}>
                <Spade className="h-4 w-4" />
                {busy === 'create' ? 'Creando sala...' : 'Crear sala'}
              </button>
              <button type="button" onClick={handleSolo} disabled={busy !== null} className={quietButton}>
                <Users className="h-4 w-4" />
                {busy === 'solo' ? 'Preparando mesa...' : 'Sala en línea con bots'}
              </button>
              <p className="-mt-2 text-center text-xs leading-relaxed text-amber-100/65">
                {game === 'casino'
                  ? 'Juegas en pareja con un bot contra otra pareja de bots.'
                  : `Completarás la mesa con ${info.soloPlayerCount - 1} bot${info.soloPlayerCount === 2 ? '' : 's'}.`}{' '}
                Requiere conexión.
              </p>
            </div>

            <form onSubmit={handleJoin} className="wood-panel space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-extrabold text-amber-50">Unirse a una sala</h2>
                <p className="mt-1 text-sm text-amber-100/75">Escribe el código que te compartieron.</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-amber-100">Código de la sala</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="ABC12"
                  className={`${inputClass} font-mono text-lg tracking-[0.3em]`}
                />
              </label>
              <button type="submit" disabled={busy !== null} className={quietButton}>
                <DoorOpen className="h-4 w-4" />
                {busy === 'join' ? 'Entrando...' : 'Entrar a la sala'}
              </button>
            </form>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-700/80 px-4 py-3 text-sm font-medium text-rose-50 ring-1 ring-rose-300/60">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
