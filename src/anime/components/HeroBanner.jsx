import { useState, useEffect, useRef, useCallback } from 'react';
import { getTrending, backdropUrl } from '../api/jikan.js';

export default function HeroBanner({ navigate }) {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    getTrending(1).then((data) => {
      const results = (data || []).filter(r => r.images?.jpg?.image_url || r.trailer?.images?.maximum_image_url);
      setItems(results.slice(0, 5));
    }).catch(() => {});
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % (items.length || 1));
    }, 7000);
  }, [items.length]);

  useEffect(() => {
    if (items.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length, resetTimer]);

  const goTo = (idx) => {
    setCurrent(idx);
    resetTimer();
  };

  if (!items.length) {
    return <div className="hero-banner skeleton" />;
  }

  const item = items[current];
  const genres = (item.genres || []).slice(0, 2).map(g => g.name);
  const year = item.year || (item.aired?.prop?.from?.year) || '';
  const rating = item.score?.toFixed(1);

  return (
    <div className="hero-banner">
      {items.map((it, i) => (
        <img
          key={it.mal_id}
          src={backdropUrl(it.trailer?.images) || backdropUrl(it.images)}
          alt={it.title_english || it.title}
          className="hero-backdrop"
          style={{ opacity: i === current ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      <div className="hero-vignette" aria-hidden="true" />

      <div className="hero-content">
        <div className="layout-container">
          <div style={{ maxWidth: 600 }}>
            <h2 className="hero-title fade-in-up" key={`title-${current}`}>
              {item.title_english || item.title}
            </h2>

            <div className="detail-meta-row fade-in-up" key={`meta-${current}`} style={{ animationDelay: '0.1s' }}>
              {rating && (
                <span className="detail-meta-item" style={{ color: 'var(--color-star)' }}>
                  <StarIcon /> {rating}
                </span>
              )}
              {year && (
                <>
                  <span className="detail-meta-divider" />
                  <span className="detail-meta-item">{year}</span>
                </>
              )}
              {genres.map((g) => (
                <span key={g} className="detail-meta-item">
                  <span className="detail-meta-divider" /> {g}
                </span>
              ))}
            </div>

            <p className="hero-description fade-in-up" key={`desc-${current}`} style={{ animationDelay: '0.2s' }}>
              {item.synopsis}
            </p>

            <div className="flex items-center gap-3 fade-in-up" key={`cta-${current}`} style={{ animationDelay: '0.3s' }}>
              <button
                className="btn-primary"
                onClick={() => navigate(`/play/anime/${item.mal_id}`)}
              >
                <PlayIcon /> <span className="hidden md:inline">Play</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate(`/anime/${item.mal_id}`)}
              >
                <InfoIcon /> See More
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-dots">
        {items.map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
