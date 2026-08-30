import { profileUrl } from '../api/tmdb.js';

export default function CastRow({ cast }) {
  if (!cast?.length) return null;

  const visibleCast = cast.filter((c) => c.known_for_department === 'Acting').slice(0, 20);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 className="content-row-title" style={{ marginBottom: 16 }}>Cast</h3>
      <div className="cast-scroll">
        {visibleCast.map((person) => (
          <div key={person.id} className="cast-item">
            <div className="cast-avatar">
              {person.profile_path ? (
                <img src={profileUrl(person.profile_path)} alt={person.name} loading="lazy" />
              ) : (
                <div className="cast-avatar-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
            <p className="cast-name">{person.name}</p>
            <p className="cast-character">{person.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
