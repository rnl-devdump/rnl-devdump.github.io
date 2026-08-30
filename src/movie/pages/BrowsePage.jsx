import { useState, useEffect } from 'react';
import { getPopular, getGenres, discoverByGenre } from '../api/tmdb.js';
import ContentCard from '../components/ContentCard.jsx';

export default function BrowsePage({ type = 'movie', navigate }) {
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [activeType, setActiveType] = useState(type);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGenres(activeType).then((data) => setGenres(data.genres || [])).catch(() => {});
  }, [activeType]);

  useEffect(() => {
    setLoading(true);
    const fetchFn = activeGenre
      ? discoverByGenre(activeType, activeGenre, page)
      : getPopular(activeType, page);

    fetchFn.then((data) => {
      setItems(data.results || []);
      setTotalPages(Math.min(data.total_pages || 1, 50));
    }).catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeType, activeGenre, page]);

  const handleTypeChange = (t) => {
    setActiveType(t);
    setActiveGenre(null);
    setPage(1);
    navigate(`/browse/${t}`);
  };

  const handleGenreClick = (genreId) => {
    setActiveGenre(activeGenre === genreId ? null : genreId);
    setPage(1);
  };

  return (
    <div style={{ paddingTop: 100, minHeight: '80vh' }}>
      <div className="layout-container">
        <h1 className="hero-title" style={{ textTransform: 'none', fontSize: '1.75rem', marginBottom: 24 }}>
          Browse {activeType === 'tv' ? 'TV Shows' : 'Movies'}
        </h1>

        {/* Type Filter */}
        <div className="filter-bar">
          <button
            className={`filter-tab ${activeType === 'movie' ? 'active' : ''}`}
            onClick={() => handleTypeChange('movie')}
          >
            Movies
          </button>
          <button
            className={`filter-tab ${activeType === 'tv' ? 'active' : ''}`}
            onClick={() => handleTypeChange('tv')}
          >
            TV Shows
          </button>
        </div>

        {/* Genre Chips */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 24 }}>
            {genres.map((g) => (
              <button
                key={g.id}
                className={`genre-chip ${activeGenre === g.id ? 'active' : ''}`}
                onClick={() => handleGenreClick(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="browse-grid">
            {[...Array(18)].map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 12, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="browse-grid">
              {items.map((item) => (
                <ContentCard key={item.id} item={{ ...item, media_type: activeType }} navigate={navigate} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                {generatePageNumbers(page, totalPages).map((p, i) => (
                  p === '...' ? (
                    <span key={`dots-${i}`} style={{ color: 'var(--color-text-lo)', padding: '0 4px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`page-btn ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                ))}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function generatePageNumbers(current, total) {
  const pages = [];
  const maxVisible = 5;

  if (total <= maxVisible + 2) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
