import { useState } from 'react';
import Lobby from '@/components/Lobby';
import RoomView from '@/components/RoomView';
import OfflineBotGame, { type OfflineBotMode } from '@/components/OfflineBotGame';
import { getStoredRoomId, storeRoomId } from '@/lib/identity';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(getStoredRoomId);
  const [offlineGame, setOfflineGame] = useState<{ mode: OfflineBotMode; playerName: string } | null>(null);

  const enterRoom = (id: string) => {
    setOfflineGame(null);
    storeRoomId(id);
    setRoomId(id);
  };

  const leaveRoom = () => {
    storeRoomId(null);
    setRoomId(null);
  };

  const startOffline = (mode: OfflineBotMode, playerName: string) => {
    storeRoomId(null);
    setRoomId(null);
    setOfflineGame({ mode, playerName });
  };

  if (offlineGame) {
    return <OfflineBotGame {...offlineGame} onLeave={() => setOfflineGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 antialiased">
      {roomId ? (
        <RoomView key={roomId} roomId={roomId} onLeave={leaveRoom} />
      ) : (
        <Lobby onEnter={enterRoom} onStartOffline={startOffline} />
      )}
    </div>
  );
}
