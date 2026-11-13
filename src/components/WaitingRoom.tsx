import { useState } from 'react';
import { Check, Copy, Play, Users } from 'lucide-react';
import { canStartGame, GAMES } from '@/games';
import type { Player } from '@/games/shared';
import type { RoomRow } from '@/lib/rooms';

interface WaitingRoomProps {
  room: RoomRow;
  myId: string;
  busy: boolean;
  onStart: () => void;
}

export default function WaitingRoom({ room, myId, busy, onStart }: WaitingRoomProps) {
  const isHost = room.players[0]?.id === myId;
  const info = GAMES[room.game];
  const canStart = canStartGame(room.game, room.players.length);
  const slots = Math.max(info.maxPlayers - room.players.length, 0);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(room.code);
      } else {
        const input = document.createElement('textarea');
        input.value = room.code;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col justify-between gap-6 wood-panel p-6">
        <div className="space-y-2">
          <p className="text-sm font-bold text-amber-200">Sala de {info.name}</p>
          <p className="text-sm text-amber-100/85">Comparte este código con tus amigos para que entren.</p>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-4xl font-semibold tracking-[0.35em] text-amber-300">{room.code}</p>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 btn-wood inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-transform active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Código copiado' : 'Copiar código'}
          </button>
        </div>
      </div>

      <div className="wood-panel space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-amber-50">Jugadores</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-amber-100/70">
            <Users className="h-4 w-4" />
            {room.players.length} de {info.maxPlayers}
          </span>
        </div>

        <ul className="space-y-2">
          {room.players.map((player, index) => (
            <PlayerRow key={player.id} player={player} index={index} isMe={player.id === myId} />
          ))}
          {Array.from({ length: slots }, (_, i) => (
            <li
              key={`empty-${i}`}
              className="rounded-xl border border-dashed border-amber-200/30 px-4 py-3 text-sm text-amber-100/50"
            >
              Esperando jugador...
            </li>
          ))}
        </ul>

        <p className="text-sm text-amber-100/70">
          {canStart
            ? 'Ya hay suficientes jugadores. Cuando estén listos, empiecen.'
            : `Para empezar se necesitan ${info.playerCountLabel.toLowerCase()}.`}
        </p>

        {isHost ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart || busy}
            className="btn-gold flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {busy ? 'Repartiendo...' : 'Empezar partida'}
          </button>
        ) : (
          <p className="rounded-xl bg-black/30 px-4 py-3 text-center text-sm text-amber-100/80">
            Esperando a que {room.players[0]?.name} empiece la partida.
          </p>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player, index, isMe }: { player: Player; index: number; isMe: boolean }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3 ring-1 ring-amber-200/15">
      <span className="flex h-7 w-7 items-center justify-center rounded-full wood-block text-xs font-bold text-amber-100">
        {index + 1}
      </span>
      <span className="flex-1 truncate text-sm font-bold text-amber-50">{player.name}</span>
      {isMe && <span className="text-xs font-bold text-lime-400">Tú</span>}
    </li>
  );
}
