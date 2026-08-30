import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase.js';
import { posterUrl } from '../api/jikan.js';

export default function ActiveRoomsRow() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'watchParties'),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const activeRooms = [];
      const now = Date.now();

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include rooms updated in the last 24 hours
        const updatedTime = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.startedAt || 0);
        if (now - updatedTime < 86400000) {
          activeRooms.push({ id: doc.id, ...data });
        }
      });

      setRooms(activeRooms);
      setLoading(false);
    }, (err) => {
      console.error("Failed to fetch active rooms:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading || rooms.length === 0) return null;

  const joinRoom = (room) => {
    let path = '';
    if (room.type === 'anime' || room.malId) {
      path = `#/play/anime/${room.malId || room.tmdbId}?room=${room.id}`;
    } else {
      // Fallback for old rooms
      path = `#/play/anime/${room.tmdbId}?room=${room.id}`;
    }

    const url = window.location.origin + window.location.pathname + path;
    window.open(url, '_blank', 'toolbar=no,scrollbars=no,resizable=yes,fullscreen=yes,width=1280,height=720');
  };

  const formatElapsed = (startedAt) => {
    if (!startedAt) return 'Live now';
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 1) return 'Just started';
    if (mins < 60) return `${mins}m elapsed`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m elapsed`;
  };

  return (
    <div className="layout-container my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            Live Watch Parties
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold">
            {rooms.length} Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const poster = room.posterPath ? posterUrl(room.posterPath, 'w500') : null;

          return (
            <div
              key={room.id}
              className="glass-card-dark rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group border border-white/10 hover:border-primary/50 transition-all duration-300 shadow-lg"
            >
              {/* Background Glow */}
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-300" />

              {/* Poster */}
              <div className="w-16 h-24 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 relative shadow-md">
                {poster ? (
                  <img src={poster} alt={room.title || 'Movie'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-text-lo">No Art</div>
                )}
                <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-primary">
                  {room.id}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-white truncate group-hover:text-primary transition-colors">
                    {room.title || 'Untitled Media'}
                  </h3>
                  <p className="text-xs text-text-lo mt-0.5 flex items-center gap-2">
                    <span className="capitalize">{room.type}</span>
                    {room.type === 'tv' && (
                      <span className="text-white/80 font-medium">
                        S{room.season} E{room.episode}
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatElapsed(room.startedAt)}
                  </span>

                  <button
                    onClick={() => joinRoom(room)}
                    className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold shadow-md hover:scale-105 transition-transform"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21" />
                    </svg>
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
