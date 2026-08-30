import { useState, useEffect } from 'react';
import { discoverByGenre, getGenres, getTopRated, getNowPlaying } from '../api/tmdb.js';
import ContentCard from '../components/ContentCard.jsx';

const SPECIAL_PAGES = {
  top_rated: { title: 'Top Rated', fetch: (type, page) => getTopRated(type, page) },
  now_playing: { title: 'Now Playing', fetch: (_, page) => getNowPlaying(page) },
};

export default function GenrePage({ type = 'movie', genreId, navigate }) {
  const [items, setItems] = useState([]);
  const [genreName, setGenreName] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [genreId, type]);

  useEffect(() => {
    setLoading(true);

    const special = SPECIAL_PAGES[genreId];
    if (special) {
      setGenreName(special.title);
      special.fetch(type, page).then((data) => {
        setItems(data.results || []);
        setTotalPages(Math.min(data.total_pages || 1, 50));
      }).catch(() => setItems([]))
        .finally(() => setLoading(false));
      return;
    }

    // Regular genre
    getGenres(type).then((data) => {
      const genre = (data.genres || []).find((g) => String(g.id) === String(genreId));
      setGenreName(genre?.name || 'Genre');
    }).catch(() => {});

    discoverByGenre(type, genreId, page).then((data) => {
      setItems(data.results || []);
      setTotalPages(Math.min(data.total_pages || 1, 50));
    }).catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, genreId, page]);

  return (
    <div style={{ paddingTop: 100, minHeight: '80vh' }}>
      <div className="layout-container">
        <h1 className="hero-title" style={{ textTransform: 'none', fontSize: '1.75rem', marginBottom: 24 }}>
          {genreName} {type === 'tv' ? 'TV Shows' : 'Movies'}
        </h1>

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
                <ContentCard key={item.id} item={{ ...item, media_type: type }} navigate={navigate} />
              ))}
            </div>

            {items.length === 0 && !loading && (
              <div className="empty-state">
                <p className="empty-state-title">No content found</p>
                <p className="empty-state-text">Try a different genre or category</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span style={{ color: 'var(--color-text-mid)', fontSize: '0.85rem', padding: '0 8px' }}>
                  Page {page} of {totalPages}
                </span>
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
