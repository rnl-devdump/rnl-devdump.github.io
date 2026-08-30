import { useState, useEffect } from 'react';
import { getDetails, backdropUrl } from '../api/jikan.js';
import GenreChips from '../components/GenreChips.jsx';
import CastRow from '../components/CastRow.jsx';
import ContentRow from '../components/ContentRow.jsx';

export default function AnimeDetailPage({ id, navigate }) {
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDetails(id)
      .then(setAnime)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const openPlayer = () => {
    const url = window.location.origin + window.location.pathname + `#/play/anime/${id}`;
    window.open(url, '_blank', 'toolbar=no,scrollbars=no,resizable=yes,fullscreen=yes,width=1280,height=720');
  };

  if (loading || !anime) {
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

  const title = anime.title_english || anime.title;
  const year = anime.year || (anime.aired?.prop?.from?.year);
  const episodes = anime.episodes ? `${anime.episodes} Episodes` : null;
  const rating = anime.score?.toFixed(1);
  const backdrop = backdropUrl(anime.trailer?.images) || backdropUrl(anime.images);
  const genres = anime.genres || [];

  return (
    <div className="fade-in-up">
      {/* Backdrop */}
      <div className="detail-backdrop-wrap">
        {backdrop && (
          <img src={backdrop} alt={title} className="detail-backdrop" />
        )}
        <div className="detail-backdrop-overlay" />
      </div>

      {/* Info Section */}
      <div className="detail-info">
        <div className="layout-container">

          <h1 className="hero-title" style={{ textTransform: 'none', marginBottom: 12 }}>
            {title}
          </h1>

          {anime.title_japanese && (
            <p style={{ color: 'var(--color-text-lo)', fontStyle: 'italic', margin: '0 0 12px', fontSize: '0.9rem' }}>
              {anime.title_japanese}
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
            {year && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{year}</span>
              </>
            )}
            {episodes && (
              <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{episodes}</span>
              </>
            )}
            {anime.rating && (
               <>
                <span className="detail-meta-divider" />
                <span className="detail-meta-item">{anime.rating}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <button className="btn-primary" onClick={openPlayer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Watch Anime
            </button>
          </div>

          <GenreChips genres={genres} navigate={navigate} type="anime" />

          <p className="detail-overview">{anime.synopsis}</p>

        </div>
      </div>
    </div>
  );
}
