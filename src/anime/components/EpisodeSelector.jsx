import { useState, useEffect } from 'react';
import { getSeasonDetails, posterUrl } from '../api/jikan.js';

export default function EpisodeSelector({ tvId, seasons, currentSeason, currentEpisode, onSelect }) {
  const [selectedSeason, setSelectedSeason] = useState(currentSeason || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSeasonDetails(tvId, selectedSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [tvId, selectedSeason]);

  const validSeasons = (seasons || []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0
  );

  return (
    <div className="episode-selector">
      <h3 className="content-row-title" style={{ marginBottom: 16 }}>Episodes</h3>

      {/* Season Tabs */}
      <div className="season-tabs">
        {validSeasons.map((s) => (
          <button
            key={s.season_number}
            className={`season-tab ${selectedSeason === s.season_number ? 'active' : ''}`}
            onClick={() => setSelectedSeason(s.season_number)}
          >
            Season {s.season_number}
          </button>
        ))}
      </div>

      {/* Episodes Grid */}
      {loading ? (
        <div className="episodes-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="episode-card">
              <div className="episode-still skeleton" />
              <div className="episode-info">
                <div className="skeleton" style={{ width: 60, height: 12, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '80%', height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '100%', height: 24 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="episodes-grid">
          {episodes.map((ep) => {
            const isActive = selectedSeason === currentSeason && ep.episode_number === currentEpisode;
            return (
              <div
                key={ep.id}
                className={`episode-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(selectedSeason, ep.episode_number)}
                role="button"
                tabIndex={0}
              >
                <div className="episode-still">
                  {ep.still_path ? (
                    <img src={posterUrl(ep.still_path, 'w300')} alt={ep.name} loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-lo text-xs">
                      Ep {ep.episode_number}
                    </div>
                  )}
                </div>
                <div className="episode-info">
                  <p className="episode-number">Episode {ep.episode_number}</p>
                  <p className="episode-name">{ep.name}</p>
                  {ep.overview && <p className="episode-overview">{ep.overview}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
