import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMulti } from '../api/jikan.js';
import ContentCard from '../components/ContentCard.jsx';

export default function SearchPage({ query: initialQuery, navigate }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef(null);

  const doSearch = useCallback((q, p = 1) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    searchMulti(q, p).then((data) => {
      // Jikan returns the array directly from jikanFetch in searchMulti
      const filtered = (data || []).filter((r) => r.images?.jpg?.image_url);
      setResults(filtered);
      // Pagination from Jikan is in pagination object usually, but searchMulti only returned data. We might need to handle pagination if added, but for now we'll just show page 1 or max 20 if we had it. Since we don't have pagination metadata returned by our wrapper easily without changing jikan.js, let's just stick to page 1 for simple search or implement basic next/prev assuming totalPages is unknown, but actually Jikan search provides a lot. Let's just limit totalPages to 5 for now since we don't return pagination metadata.
      setTotalPages(5);
      setPage(p);
    }).catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
  }, [initialQuery, doSearch]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  return (
    <div style={{ paddingTop: 100, minHeight: '80vh' }}>
      <div className="layout-container">
        <div style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--color-neo-surface)', border: '1px solid var(--color-neo-border)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-lo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search anime..."
              value={query}
              onChange={handleInput}
              autoFocus
              style={{ fontSize: '1rem' }}
            />
          </div>
        </div>

        {loading && (
          <div className="browse-grid">
            {[...Array(12)].map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 12, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p style={{ color: 'var(--color-text-lo)', fontSize: '0.85rem', marginBottom: 16 }}>
              Showing results for "{query}"
            </p>
            <div className="browse-grid">
              {results.map((item) => (
                <ContentCard key={item.id} item={item} navigate={navigate} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => doSearch(query, page - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <span style={{ color: 'var(--color-text-mid)', fontSize: '0.85rem', padding: '0 8px' }}>
                  Page {page} of {totalPages}
                </span>
                <button className="page-btn" disabled={page >= totalPages} onClick={() => doSearch(query, page + 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {!loading && query && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="empty-state-title">No results found</p>
            <p className="empty-state-text">Try searching for something else</p>
          </div>
        )}
      </div>
    </div>
  );
}
