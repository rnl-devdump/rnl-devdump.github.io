import { useRef } from 'react';
import { posterUrl } from '../api/tmdb.js';

export default function TopTenRow({ title, items, navigate }) {
  const scrollRef = useRef(null);

  if (!items?.length) return null;

  const topItems = items.slice(0, 10);

  return (
    <div className="content-row layout-container">
      <div className="content-row-header">
        <h3 className="content-row-title">{title}</h3>
      </div>

      <div style={{ position: 'relative' }}>
        <div className="top-ten-scroll" ref={scrollRef}>
          {topItems.map((item, index) => {
            const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
            const poster = posterUrl(item.poster_path);

            return (
              <div
                key={item.id}
                className="top-ten-item"
                onClick={() => navigate(`/${type}/${item.id}`)}
                role="button"
                tabIndex={0}
              >
                <span className="top-ten-rank">{index + 1}</span>
                <div className="top-ten-poster">
                  {poster ? (
                    <img src={poster} alt={item.title || item.name} loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-lo text-xs p-2 text-center">
                      {item.title || item.name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
