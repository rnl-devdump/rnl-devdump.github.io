import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function WatchParty({ route }) {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [countdown, setCountdown] = useState(null);

  // Listen to room data
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'watchParties', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        
        // Handle countdown sync
        if (data.syncPlayAt) {
          const targetTime = data.syncPlayAt.toMillis ? data.syncPlayAt.toMillis() : data.syncPlayAt;
          const now = Date.now();
          const diff = targetTime - now;
          if (diff > 0 && diff < 5000) {
            startCountdown(targetTime);
          }
        }
      }
    });
    return () => unsub();
  }, [roomId]);

  const startCountdown = (targetTime) => {
    const tick = () => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        setCountdown('CLICK PLAY!');
        setTimeout(() => setCountdown(null), 3000);
      } else {
        setCountdown(Math.ceil(remaining / 1000));
        setTimeout(tick, 100);
      }
    };
    tick();
  };

  const createRoom = async () => {
    const newId = generateRoomId();
    await setDoc(doc(db, 'watchParties', newId), {
      type: route.type,
      tmdbId: route.id,
      season: route.season || 1,
      episode: route.episode || 1,
      syncPlayAt: null,
      createdAt: serverTimestamp()
    });
    setRoomId(newId);
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    const id = joinId.toUpperCase();
    const docSnap = await getDoc(doc(db, 'watchParties', id));
    if (docSnap.exists()) {
      setRoomId(id);
    } else {
      alert("Room not found!");
    }
  };

  const triggerSyncPlay = async () => {
    if (!roomId) return;
    await updateDoc(doc(db, 'watchParties', roomId), {
      syncPlayAt: Date.now() + 4000 // 4 seconds from now to allow for network delay
    });
  };

  const updateRoomMedia = async () => {
    if (!roomId) return;
    await updateDoc(doc(db, 'watchParties', roomId), {
      type: route.type,
      tmdbId: route.id,
      season: route.season || 1,
      episode: route.episode || 1,
    });
  };

  // Check if current route matches room data
  const isSyncMedia = roomData 
    ? (roomData.tmdbId === route.id && roomData.type === route.type && (roomData.type === 'movie' || (roomData.season === route.season && roomData.episode === route.episode)))
    : true;

  const jumpToRoomMedia = () => {
    if (roomData.type === 'movie') {
      window.location.hash = `/play/movie/${roomData.tmdbId}`;
    } else {
      window.location.hash = `/play/tv/${roomData.tmdbId}/${roomData.season}/${roomData.episode}`;
    }
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10002 }}>
        {!isOpen ? (
          <button onClick={() => setIsOpen(true)} className="btn-primary" style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, display: 'inline' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Watch Together
          </button>
        ) : (
          <div style={{ background: 'var(--color-neo-surface)', padding: 20, borderRadius: 12, border: '1px solid var(--color-neo-border)', width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Watch Together</h3>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
            </div>

            {!roomId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-lo)' }}>Create a room or join one to sync up.</p>
                <button onClick={createRoom} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Create Room</button>
                <div style={{ textAlign: 'center', color: 'var(--color-text-lo)', fontSize: '0.8rem', margin: '4px 0' }}>or</div>
                <form onSubmit={joinRoom} style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Room ID" style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-neo-border)', color: 'white', textTransform: 'uppercase' }} maxLength={5} />
                  <button type="submit" className="btn-secondary">Join</button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-lo)', marginBottom: 4 }}>Room ID</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: 4 }}>{roomId}</div>
                </div>

                {!isSyncMedia && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, marginTop: 8 }}>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 8px 0' }}>The room is watching something else!</p>
                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                      <button onClick={jumpToRoomMedia} className="btn-primary" style={{ background: '#ef4444', border: 'none', width: '100%', justifyContent: 'center' }}>Jump to Room's Video</button>
                      <button onClick={updateRoomMedia} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Set Room to MY Video</button>
                    </div>
                  </div>
                )}

                {isSyncMedia && (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-lo)' }}>
                      Since we use third-party embeds, we can't pause the video for you automatically. 
                      Click the button below to do a synced countdown!
                    </p>
                    <button onClick={triggerSyncPlay} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#22c55e', border: 'none', padding: '12px 0' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
                        <polygon points="5 3 19 12 5 21"></polygon>
                      </svg>
                      Start Countdown Sync
                    </button>
                  </>
                )}

                <button onClick={() => setRoomId('')} className="btn-secondary" style={{ marginTop: 8, width: '100%', justifyContent: 'center', padding: '6px 0', fontSize: '0.8rem' }}>Leave Room</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Massive Countdown Overlay */}
      {countdown && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 999999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '8rem', fontWeight: 'bold', textShadow: '0 10px 30px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}>
          {countdown}
        </div>
      )}
    </>
  );
}
