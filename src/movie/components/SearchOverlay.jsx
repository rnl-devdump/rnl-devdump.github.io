import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMulti, posterUrl } from '../api/tmdb.js';

export default function SearchOverlay({ open, onClose, navigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const doSearch = useCallback((q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    searchMulti(q).then((data) => {
      const filtered = (data.results || []).filter(
        (r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path
      );
      setResults(filtered);
    }).catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const handleItemClick = (item) => {
    const type = item.media_type === 'tv' ? 'tv' : 'movie';
    navigate(`/${type}/${item.id}`);
    onClose();
  };

  return (
    <div className={`search-overlay ${open ? 'open' : ''}`}>
      <div className="search-overlay-header">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-lo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search movies, TV shows..."
          value={query}
          onChange={handleInput}
        />
        <button className="search-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="search-results">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p className="empty-state-title">No results found</p>
            <p className="empty-state-text">Try a different search term</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-results-grid">
            {results.map((item) => {
              const title = item.title || item.name;
              const year = (item.release_date || item.first_air_date || '').slice(0, 4);
              const poster = posterUrl(item.poster_path, 'w342');
              const rating = item.vote_average?.toFixed(1);

              return (
                <div
                  key={item.id}
                  className="content-card"
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  style={{ width: '100%' }}
                >
                  <div className="content-card-poster">
                    {poster && <img src={poster} alt={title} loading="lazy" />}
                    {rating > 0 && (
                      <div className="content-card-rating">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-star)" stroke="var(--color-star)" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {rating}
                      </div>
                    )}
                    <div className="content-card-play">
                      <div className="content-card-play-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="content-card-title">{title}</p>
                  <p className="content-card-year">
                    {item.media_type === 'tv' ? 'TV' : 'Movie'}{year ? ` · ${year}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !query && (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="empty-state-title">Search for movies & TV shows</p>
            <p className="empty-state-text">Find your favorite content to watch</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
