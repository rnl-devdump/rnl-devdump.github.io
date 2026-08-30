import { useState, useEffect } from 'react';
import { getDetails, backdropUrl } from '../api/tmdb.js';
import EpisodeSelector from '../components/EpisodeSelector.jsx';
import GenreChips from '../components/GenreChips.jsx';
import CastRow from '../components/CastRow.jsx';
import ContentRow from '../components/ContentRow.jsx';

export default function TvDetailPage({ id, season: initSeason, episode: initEpisode, navigate }) {
  const [show, setShow] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(initSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState(initEpisode || 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setCurrentSeason(initSeason || 1);
    setCurrentEpisode(initEpisode || 1);
    getDetails('tv', id)
      .then(setShow)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, initSeason, initEpisode]);

  const openPlayer = (season, episode) => {
    const url = window.location.origin + window.location.pathname + `#/play/tv/${id}/${season}/${episode}`;
    window.open(url, '_blank', 'toolbar=no,scrollbars=no,resizable=yes,fullscreen=yes,width=1280,height=720');
  };

  const handleEpisodeSelect = (season, episode) => {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    openPlayer(season, episode);
  };

  if (loading || !show) {
    return (
      <div>
        <div className="detail-backdrop-wrap skeleton" />
        <div className="layout-container" style={{ paddingTop: 40 }}>
          <div className="skeleton" style={{ width: 300, height: 36, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '80%', height: 60 }} />
        </div>
      </div>
    );
  }

  const year = show.first_air_date?.slice(0, 4);
  const endYear = show.last_air_date?.slice(0, 4);
  const yearRange = year ? (show.status === 'Ended' && endYear ? `${year}–${endYear}` : `${year}–`) : '';
  const rating = show.vote_average?.toFixed(1);
  const backdrop = backdropUrl(show.backdrop_path);
  const cast = show.credits?.cast;
  const similar = show.similar?.results;
  const seasonsCount = show.number_of_seasons;
  const episodesCount = show.number_of_episodes;

  return (
    <div className="fade-in-up">
      {/* Backdrop */}
      <div className="detail-backdrop-wrap">
        {backdrop && (
          <img src={backdrop} alt={show.name} className="detail-backdrop" />
        )}
        <div className="detail-backdrop-overlay" />
      </div>

      {/* Info */}
      <div className="detail-info">
        <div className="layout-container">

          <h1 className="hero-title" style={{ textTransform: 'none', marginBottom: 12 }}>
            {show.name}
          </h1>

          {show.tagline && (
            <p style={{ color: 'var(--color-text-lo)', fontStyle: 'italic', margin: '0 0 12px', fontSize: '0.9rem' }}>
              "{show.tagline}"
            </p>
          )}

          <div className="detail-meta-row">
            {rating > 0 && (
              <span className="detail-meta-item" style={{ color: 'var(--color-star)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {rating}
              </span>
            )}
            {yearRange && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{yearRange}</span>
              </>
            )}
            {seasonsCount && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{seasonsCount} Season{seasonsCount > 1 ? 's' : ''}</span>
              </>
            )}
            {episodesCount && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{episodesCount} Episodes</span>
              </>
            )}
            {show.status && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item" style={{
                  color: show.status === 'Returning Series' ? 'var(--color-success)' : 'var(--color-text-lo)'
                }}>
                  {show.status}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <button className="btn-primary" onClick={() => openPlayer(currentSeason, currentEpisode)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Play S{currentSeason}E{currentEpisode}
            </button>
          </div>

          <GenreChips genres={show.genres} navigate={navigate} type="tv" />

          <p className="detail-overview">{show.overview}</p>

          {/* Episode Selector */}
          <EpisodeSelector
            tvId={id}
            seasons={show.seasons}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            onSelect={handleEpisodeSelect}
          />

          {/* Cast */}
          <CastRow cast={cast} />
        </div>

        {/* Similar */}
        {similar?.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <ContentRow title="Similar Shows" items={similar} navigate={navigate} />
          </div>
        )}
      </div>
    </div>
  );
}
