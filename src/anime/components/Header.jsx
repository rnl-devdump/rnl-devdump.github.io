import { useState, useEffect } from 'react';

export default function Header({ navigate, onSearchOpen, currentPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = () => setBrowseOpen(false);
    if (browseOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [browseOpen]);

  return (
    <header className={`movie-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="layout-container">
        <div className="flex items-center justify-between h-[68px] md:h-[80px]">
          {/* Logo */}
          <a
            href="#/"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-pink-500/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border border-pink-500/40">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c-2.5-4-5-6-5-10a5 5 0 0 1 10 0c0 4-2.5 6-5 10z"/>
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(72 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(144 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(216 12 12)" />
                <path d="M7 12c-4-2.5-6-5-10-5a5 5 0 0 1 0 10c4 0 6-2.5 10-5z" transform="rotate(288 12 12)" />
                <circle cx="12" cy="12" r="3" fill="#f472b6" />
              </svg>
            </div>
            <span className="text-xl md:text-2xl font-bold text-white tracking-wide">キルー</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              label="Home"
              icon={<HomeIcon />}
              active={currentPage === 'home'}
              onClick={() => navigate('/')}
            />
            <NavLink
              label="Anime"
              icon={<FilmIcon />}
              active={currentPage === 'browse'}
              onClick={() => navigate('/browse/anime')}
            />
            <button
              onClick={() => {
                if (currentPage !== 'home') navigate('/');
                setTimeout(() => {
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }, 100);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm text-white hover:text-primary hover:bg-white/10 cursor-pointer border-none bg-transparent font-medium"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Watch Together</span>
            </button>

            {/* Browse Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setBrowseOpen(!browseOpen); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm text-white hover:text-primary hover:bg-white/10 cursor-pointer"
              >
                <GridIcon />
                <span className="font-medium">Browse</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${browseOpen ? 'rotate-180' : ''}`}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {browseOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl glass-card-dark p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  {[
                    { label: 'Popular Anime', path: '/browse/anime' },
                    { label: 'Top Rated Anime', path: '/genre/anime/top_rated' },
                    { label: 'Now Airing', path: '/genre/anime/now_playing' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setBrowseOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-mid hover:text-white hover:bg-white/8 transition-all cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <button
              onClick={onSearchOpen}
              className="p-2 ml-1 rounded-lg hover:bg-white/10 text-white hover:text-primary transition-all duration-200 cursor-pointer"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm cursor-pointer border-none bg-transparent font-medium ${
        active ? 'text-primary bg-white/8' : 'text-white hover:text-primary hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 12h18" />
      <path d="M12 3v18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
