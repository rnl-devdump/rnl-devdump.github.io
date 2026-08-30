import { posterUrl } from '../api/tmdb.js';

export default function ContentCard({ item, navigate }) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average?.toFixed(1);
  const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
  const poster = posterUrl(item.poster_path);

  const handleClick = () => {
    navigate(`/${type}/${item.id}`);
  };

  return (
    <div className="content-card" onClick={handleClick} role="button" tabIndex={0} id={`card-${item.id}`}>
      <div className="content-card-poster">
        {poster ? (
          <img src={poster} alt={title} loading="lazy" decoding="async" />
        ) : (
          <div className="flex items-center justify-center h-full text-text-lo text-xs p-4 text-center">{title}</div>
        )}

        {rating && rating > 0 && (
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
      {year && <p className="content-card-year">{year}</p>}
    </div>
  );
}
