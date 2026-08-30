import { useRef } from 'react';
import { posterUrl } from '../api/jikan.js';

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
            const poster = posterUrl(item.images);

            return (
              <div
                key={item.mal_id}
                className="top-ten-item"
                onClick={() => navigate(`/anime/${item.mal_id}`)}
                role="button"
                tabIndex={0}
              >
                <span className="top-ten-rank">{index + 1}</span>
                <div className="top-ten-poster">
                  {poster ? (
                    <img src={poster} alt={item.title_english || item.title} loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-lo text-xs p-2 text-center">
                      {item.title_english || item.title}
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
