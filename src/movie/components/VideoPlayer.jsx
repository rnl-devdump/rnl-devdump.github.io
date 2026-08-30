import { useState } from 'react';

const SERVERS = [
  { 
    id: 'vidlink', 
    name: 'Server 1 (Ad-Free, Recommended)', 
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=6366f1&autoplay=false`, 
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=6366f1&autoplay=false` 
  },
  { 
    id: 'superembed', 
    name: 'Server 2 (Fast)', 
    getMovieUrl: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`, 
    getTvUrl: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}` 
  },
  { 
    id: 'vidsrc', 
    name: 'Server 3 (Backup)', 
    getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`, 
    getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` 
  },
  { 
    id: 'vidking', 
    name: 'Server 4 (Legacy)', 
    getMovieUrl: (id) => `https://www.vidking.net/embed/movie/${id}?color=6366f1&autoPlay=false`, 
    getTvUrl: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=6366f1&autoPlay=false` 
  }
];

export default function VideoPlayer({ type, tmdbId, season, episode }) {
  const [loaded, setLoaded] = useState(false);
  const [server, setServer] = useState(SERVERS[0]);

  const embedUrl = type === 'tv'
    ? server.getTvUrl(tmdbId, season, episode)
    : server.getMovieUrl(tmdbId);

  return (
    <div className="video-player-container">
      <div className="server-selector" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-lo)' }}>
          Seeing ads or stream not loading? Switch servers:
        </span>
        <select 
          value={server.id} 
          onChange={(e) => {
            setServer(SERVERS.find(s => s.id === e.target.value));
            setLoaded(false);
          }}
          style={{ 
            padding: '8px 16px', 
            borderRadius: '8px', 
            background: 'var(--color-neo-surface)', 
            border: '1px solid var(--color-neo-border)', 
            color: 'white', 
            outline: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {SERVERS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="video-player-wrap" id="video-player">
        {!loaded && (
          <div className="video-player-skeleton">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
              <span className="text-sm text-text-lo">Loading {server.name}...</span>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="origin"
          onLoad={() => setLoaded(true)}
          title={`${type === 'tv' ? 'TV Show' : 'Movie'} Player`}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
