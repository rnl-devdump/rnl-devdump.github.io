import { useState, useEffect } from 'react';
import { getPopular } from '../api/jikan.js';
import ContentCard from '../components/ContentCard.jsx';

export default function BrowsePage({ navigate }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPopular(page).then((data) => {
      const results = (data || []).filter(r => r.images?.jpg?.image_url);
      setItems(results);
      setTotalPages(5); // Fixed for now as pagination metadata isn't passed through
    }).catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ paddingTop: 100, minHeight: '80vh' }}>
      <div className="layout-container">
        <h1 className="hero-title" style={{ textTransform: 'none', fontSize: '1.75rem', marginBottom: 24 }}>
          Browse Anime
        </h1>

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
                <ContentCard key={item.mal_id} item={item} navigate={navigate} />
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
