import { useState, type FormEvent } from 'react';
import { Bot, ChevronDown, DoorOpen, Spade, Users } from 'lucide-react';
import { GAMES } from '@/games';
import type { GameId } from '@/games/shared';
import { createRoom, createSoloRoom, joinRoom } from '@/lib/rooms';
import { getPlayerId, getStoredName, storeName } from '@/lib/identity';

interface LobbyProps {
  onEnter: (roomId: string) => void;
}

const GAME_ORDER: GameId[] = ['casino', 'cinquillo', 'burako'];

export default function Lobby({ onEnter }: LobbyProps) {
  const [name, setName] = useState(getStoredName);
  const [game, setGame] = useState<GameId>('casino');
  const [code, setCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [busy, setBusy] = useState<'create' | 'join' | 'solo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const info = GAMES[game];
  const trimmedName = name.trim();

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

  const handleCreate = () =>
    run('create', async (player) => (await createRoom(game, player)).id);

  const handleSolo = () =>
    run('solo', async (player) => (await createSoloRoom(game, player)).id);

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Escribe el código de la sala.');
      return;
    }
    void run('join', async (player) => (await joinRoom(code, player)).id);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-800 text-amber-300 shadow-md">
          <Spade className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Mesa de cartas</h1>
          <p className="text-sm text-stone-500">Crea una sala, comparte el código y juega con tus amigos.</p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">Elige un juego</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {GAME_ORDER.map((id) => {
            const item = GAMES[id];
            const active = id === game;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setGame(id)}
                aria-pressed={active}
                className={`group flex flex-col rounded-2xl border p-5 text-left transition duration-200 ${
                  active
                    ? 'border-emerald-700 bg-emerald-800 text-white shadow-lg'
                    : 'border-stone-200 bg-white text-stone-800 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md'
                }`}
              >
                <span className="text-lg font-semibold">{item.name}</span>
                <span className={`mt-2 text-sm leading-relaxed ${active ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {item.tagline}
                </span>
                <span className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-amber-200' : 'text-stone-400'}`}>
                  <Users className="h-3.5 w-3.5" />
                  {item.playerCountLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white">
          {info.quickRules && (
            <div className="space-y-3 border-b border-stone-100 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Lo esencial</p>
              <ul className="space-y-2 text-sm leading-relaxed text-stone-700">
                {info.quickRules.map((rule) => (
                  <li key={rule} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
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
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-stone-700 transition hover:text-stone-900"
          >
            Reglas de {info.name}
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showRules ? 'rotate-180' : ''}`} />
          </button>
          {showRules && (
            <ul className="space-y-2 border-t border-stone-100 px-5 py-4 text-sm leading-relaxed text-stone-600">
              {info.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Crear sala de {info.name}</h2>
            <p className="mt-1 text-sm text-stone-500">Recibirás un código para que tus amigos entren.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Tu nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              placeholder="Cómo te verán los demás"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Spade className="h-4 w-4" />
            {busy === 'create' ? 'Creando sala...' : 'Crear sala'}
          </button>
          <button
            type="button"
            onClick={handleSolo}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Bot className="h-4 w-4" />
            {busy === 'solo' ? 'Preparando mesa...' : 'Jugar solo contra bots'}
          </button>
        </div>

        <form onSubmit={handleJoin} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Unirse a una sala</h2>
            <p className="mt-1 text-sm text-stone-500">Escribe el código que te compartieron.</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Código de la sala</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABC12"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-stone-900 placeholder:text-stone-300 transition focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button
            type="submit"
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <DoorOpen className="h-4 w-4" />
            {busy === 'join' ? 'Entrando...' : 'Entrar a la sala'}
          </button>
        </form>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
