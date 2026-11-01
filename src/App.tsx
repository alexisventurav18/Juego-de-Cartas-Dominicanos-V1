import { useState } from 'react';
import Lobby from '@/components/Lobby';
import RoomView from '@/components/RoomView';
import { getStoredRoomId, storeRoomId } from '@/lib/identity';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(getStoredRoomId);

  const enterRoom = (id: string) => {
    storeRoomId(id);
    setRoomId(id);
  };

  const leaveRoom = () => {
    storeRoomId(null);
    setRoomId(null);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 antialiased">
      {roomId ? (
        <RoomView key={roomId} roomId={roomId} onLeave={leaveRoom} />
      ) : (
        <Lobby onEnter={enterRoom} />
      )}
    </div>
  );
}
