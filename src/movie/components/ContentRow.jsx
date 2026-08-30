import { useRef } from 'react';
import ContentCard from './ContentCard.jsx';

export default function ContentRow({ title, items, navigate, seeAllPath }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (!items?.length) return null;

  return (
    <div className="content-row layout-container">
      <div className="content-row-header">
        <h3 className="content-row-title">{title}</h3>
        {seeAllPath && (
          <button className="content-row-see-all" onClick={() => navigate(seeAllPath)}>
            See All
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button className="scroll-btn left" onClick={() => scroll('left')} aria-label="Scroll left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="content-scroll" ref={scrollRef}>
          {items.map((item) => (
            <ContentCard key={item.id} item={item} navigate={navigate} />
          ))}
        </div>

        <button className="scroll-btn right" onClick={() => scroll('right')} aria-label="Scroll right">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
