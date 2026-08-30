export default function Footer() {
  return (
    <footer className="movie-footer">
      <div className="layout-container">
        <div className="movie-footer-inner">
          <span className="movie-footer-brand">Kiruu</span>
          <p className="movie-footer-text">
            Kiruu does not host any content. All media is provided by third-party services.
            This site does not store any files on its server.
          </p>
          <div className="movie-footer-tmdb">
            <svg width="40" height="16" viewBox="0 0 190 28" fill="none">
              <text x="0" y="22" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" fill="#01b4e4">TMDB</text>
            </svg>
            <span>Data provided by TMDB</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
