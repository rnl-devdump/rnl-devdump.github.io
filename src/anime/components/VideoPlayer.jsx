import { useState, useEffect } from 'react';
import { getDetails as getJikanDetails } from '../api/jikan.js';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const SERVERS = [
  { 
    id: 'vidlink', 
    name: 'Server 1 (Ad-Free, Recommended)', 
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=ec4899&autoplay=false`,
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=ec4899&autoplay=false`
  },
  { 
    id: 'superembed', 
    name: 'Server 2 (Fast)', 
    getTvUrl: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    getMovieUrl: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`
  },
  { 
    id: 'vidsrc', 
    name: 'Server 3 (Backup)', 
    getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
    getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`
  },
  { 
    id: 'vidking', 
    name: 'Server 4 (Legacy)', 
    getTvUrl: (id, s, e) => `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=ec4899&autoPlay=false`,
    getMovieUrl: (id) => `https://www.vidking.net/embed/movie/${id}?color=ec4899&autoPlay=false`
  }
];

// Helper to map Anime title to TMDB ID for video streaming
async function getTmdbIdForAnime(malId) {
  try {
    const animeData = await getJikanDetails(malId);
    if (!animeData) return null;
    
    const title = animeData.title_english || animeData.title;
    const isMovie = animeData.type === 'Movie';

    const searchUrl = new URL(`https://api.themoviedb.org/3/search/${isMovie ? 'movie' : 'tv'}`);
    searchUrl.searchParams.set('api_key', TMDB_API_KEY);
    searchUrl.searchParams.set('query', title);

    const res = await fetch(searchUrl.toString());
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return { id: data.results[0].id, type: isMovie ? 'movie' : 'tv' };
    }
  } catch (err) {
    console.error("Failed to map MAL to TMDB:", err);
  }
  return null;
}

export default function VideoPlayer({ malId, children }) {
  const [loaded, setLoaded] = useState(false);
  const [server, setServer] = useState(SERVERS[0]);
  const [tmdbData, setTmdbData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
    getTmdbIdForAnime(malId).then((res) => {
      if (res) setTmdbData(res);
      else setError(true);
    });
  }, [malId]);

  // Anime episodes in standard TMDB format are usually Season 1, Episode X (unless it's a long running show where TMDB splits seasons differently)
  // For simplicity, if we don't have a specific episode from route, we default to S1 E1.
  const season = 1;
  const episode = 1;

  let embedUrl = '';
  if (tmdbData) {
    embedUrl = tmdbData.type === 'tv'
      ? server.getTvUrl(tmdbData.id, season, episode)
      : server.getMovieUrl(tmdbData.id);
  }

  return (
    <div className="video-player-container">
      <div className="server-selector" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '12px', alignItems: 'center' }}>
        {children}
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
        {!loaded && !error && (
          <div className="video-player-skeleton">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
              <span className="text-sm text-text-lo">Finding anime source... {server.name}</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="video-player-skeleton">
            <span className="text-sm text-text-lo">Stream not available for this Anime yet.</span>
          </div>
        )}

        {tmdbData && !error && (
          <iframe
            src={embedUrl}
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            referrerPolicy="origin"
            onLoad={() => setLoaded(true)}
            title="Anime Player"
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
