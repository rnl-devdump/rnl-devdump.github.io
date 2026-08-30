import { useState, useEffect, useRef } from 'react';
import { getDetails, logoUrl } from '../api/tmdb.js';
import VideoPlayer from '../components/VideoPlayer.jsx';

export default function PlayerPage({ route, navigate }) {
  const [media, setMedia] = useState(null);
  const [logo, setLogo] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimer = useRef(null);

  const isTv = route.type === 'tv';

  useEffect(() => {
    // Hide overlay after 3 seconds of no mouse movement
    const resetOverlayTimer = () => {
      setShowOverlay(true);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      overlayTimer.current = setTimeout(() => setShowOverlay(false), 3000);
    };

    window.addEventListener('mousemove', resetOverlayTimer);
    resetOverlayTimer(); // initial

    return () => {
      window.removeEventListener('mousemove', resetOverlayTimer);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  useEffect(() => {
    getDetails(route.type, route.id).then((data) => {
      setMedia(data);
      // Find the first English logo or first logo without language
      const logos = data.images?.logos || [];
      const enLogo = logos.find(l => l.iso_639_1 === 'en');
      const fallbackLogo = logos[0];
      if (enLogo) setLogo(logoUrl(enLogo.file_path, 'w500'));
      else if (fallbackLogo) setLogo(logoUrl(fallbackLogo.file_path, 'w500'));
    }).catch(console.error);
  }, [route.type, route.id]);

  return (
    <div className="fullscreen-player-container">
      {/* Video Player */}
      <VideoPlayer 
        type={route.type} 
        tmdbId={route.id} 
        season={route.season} 
        episode={route.episode} 
      />

      {/* Hover Overlay */}
      <div className={`player-hover-overlay ${showOverlay ? 'visible' : ''}`}>
        
        {/* Back Button */}
        <button className="player-back-btn" onClick={() => window.close()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Close Player</span>
        </button>

        {/* Minimal Logo Display (Bottom Left) */}
        {logo && (
          <div className="player-watermark">
            <img src={logo} alt={media?.title || media?.name || 'Logo'} />
            {isTv && route.season && (
              <div className="player-episode-info">
                Season {route.season} • Episode {route.episode}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .fullscreen-player-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #000;
          z-index: 9999;
          overflow: hidden;
        }

        /* Override video player wrapper to take full height instead of 16/9 */
        .fullscreen-player-container .video-player-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
        }

        .fullscreen-player-container .server-selector {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 10001; /* Above overlay */
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .fullscreen-player-container:hover .server-selector {
          opacity: 1;
        }

        .fullscreen-player-container .video-player-wrap {
          flex: 1;
          aspect-ratio: auto;
          width: 100%;
          height: 100%;
        }
        
        .fullscreen-player-container iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Hover Overlay styles */
        .player-hover-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.8) 100%);
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: 10000;
        }

        .player-hover-overlay.visible {
          opacity: 1;
        }

        .player-back-btn {
          position: absolute;
          top: 32px;
          left: 32px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          pointer-events: auto;
          opacity: 0.8;
          transition: all 0.2s ease;
        }
        
        .player-back-btn:hover {
          opacity: 1;
          transform: translateX(-4px);
        }

        .player-watermark {
          position: absolute;
          bottom: 48px;
          left: 48px;
          max-width: 250px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .player-watermark img {
          width: 100%;
          height: auto;
          filter: drop-shadow(0px 4px 12px rgba(0,0,0,0.8));
          opacity: 0.9;
        }

        .player-episode-info {
          font-size: 1.1rem;
          font-weight: 500;
          color: white;
          text-shadow: 0px 2px 4px rgba(0,0,0,0.8);
        }
      `}</style>
    </div>
  );
}
