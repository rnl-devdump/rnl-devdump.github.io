import { useState, useEffect } from 'react';
import { getTopRated, getNowPlaying } from '../api/jikan.js';
import ContentCard from '../components/ContentCard.jsx';

const SPECIAL_PAGES = {
  top_rated: { title: 'Top Rated', fetch: (page) => getTopRated(page) },
  now_playing: { title: 'Now Playing', fetch: (page) => getNowPlaying(page) },
};

export default function GenrePage({ genreId, navigate }) {
  const [items, setItems] = useState([]);
  const [genreName, setGenreName] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [genreId]);

  useEffect(() => {
    setLoading(true);

    const special = SPECIAL_PAGES[genreId];
    if (special) {
      setGenreName(special.title);
      special.fetch(page).then((data) => {
        // Jikan returns the array directly
        const results = (data || []).filter(r => r.images?.jpg?.image_url);
        setItems(results);
        setTotalPages(5); // Fixed for now
      }).catch(() => setItems([]))
        .finally(() => setLoading(false));
      return;
    }

    // Normal genres aren't fully implemented in this MVP, fallback to top rated
    setGenreName('Anime');
    getTopRated(page).then((data) => {
      const results = (data || []).filter(r => r.images?.jpg?.image_url);
      setItems(results);
      setTotalPages(5);
    }).catch(() => setItems([]))
      .finally(() => setLoading(false));

  }, [genreId, page]);

  return (
    <div style={{ paddingTop: 100, minHeight: '80vh' }}>
      <div className="layout-container">
        <h1 className="hero-title" style={{ textTransform: 'none', fontSize: '1.75rem', marginBottom: 24 }}>
          {genreName} Anime
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
                <ContentCard key={item.mal_id} item={item} navigate={navigate} />
              ))}
            </div>

            {items.length === 0 && !loading && (
              <div className="empty-state">
                <p className="empty-state-title">No content found</p>
                <p className="empty-state-text">Try a different category</p>
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
