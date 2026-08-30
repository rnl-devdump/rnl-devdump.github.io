import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import MobileNav from './components/MobileNav.jsx';
import SearchOverlay from './components/SearchOverlay.jsx';
import Footer from './components/Footer.jsx';
import HomePage from './pages/HomePage.jsx';
import MovieDetailPage from './pages/MovieDetailPage.jsx';
import TvDetailPage from './pages/TvDetailPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import GenrePage from './pages/GenrePage.jsx';
import PlayerPage from './pages/PlayerPage.jsx';
import AiAssistantButton from './components/AiAssistantButton.jsx';

function parseHash() {
  const hash = window.location.hash.replace('#', '') || '/';
  const roomMatch = window.location.hash.match(/[?&]room=([A-Z0-9]+)/i);
  const roomId = roomMatch ? roomMatch[1].toUpperCase() : null;

  const cleanHash = hash.split('?')[0];
  const parts = cleanHash.split('/').filter(Boolean);

  if (parts.length === 0) return { page: 'home' };
  if (parts[0] === 'play' && parts[1] === 'movie') return { page: 'play', type: 'movie', id: parts[2], roomId };
  if (parts[0] === 'play' && parts[1] === 'tv') return { page: 'play', type: 'tv', id: parts[2], season: parseInt(parts[3] || 1), episode: parseInt(parts[4] || 1), roomId };
  if (parts[0] === 'movie' && parts[1]) return { page: 'movie', id: parts[1], play: parts[2] === 'play' };
  if (parts[0] === 'tv' && parts[1]) {
    return {
      page: 'tv',
      id: parts[1],
      season: parts[2] ? parseInt(parts[2]) : 1,
      episode: parts[3] ? parseInt(parts[3]) : 1,
      play: parts.includes('play'),
    };
  }
  if (parts[0] === 'search') return { page: 'search', query: decodeURIComponent(parts[1] || '') };
  if (parts[0] === 'browse') return { page: 'browse', type: parts[1] || 'movie' };
  if (parts[0] === 'genre') return { page: 'genre', type: parts[1] || 'movie', id: parts[2] };
  return { page: 'home' };
}

export default function MovieApp() {
  const [route, setRoute] = useState(parseHash);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);

  const renderPage = () => {
    switch (route.page) {
      case 'movie':
        return <MovieDetailPage id={route.id} autoPlay={route.play} navigate={navigate} />;
      case 'tv':
        return <TvDetailPage id={route.id} season={route.season} episode={route.episode} autoPlay={route.play} navigate={navigate} />;
      case 'search':
        return <SearchPage query={route.query} navigate={navigate} />;
      case 'browse':
        return <BrowsePage type={route.type} navigate={navigate} />;
      case 'genre':
        return <GenrePage type={route.type} genreId={route.id} navigate={navigate} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  if (route.page === 'play') {
    return <PlayerPage route={route} navigate={navigate} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-neo-bg)' }}>
      <Header
        navigate={navigate}
        onSearchOpen={() => setSearchOpen(true)}
        currentPage={route.page}
      />
      <main>{renderPage()}</main>
      <AiAssistantButton navigate={navigate} />
      <Footer />
      <MobileNav navigate={navigate} currentPage={route.page} onSearchOpen={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} navigate={navigate} />
    </div>
  );
}
