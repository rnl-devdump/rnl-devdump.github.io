import { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';

const TEMPLATES = [
  {
    id: 'galaxy',
    name: '✦ Galaxy',
    bg: 'linear-gradient(180deg, #160a29 0%, #290847 50%, #160a29 100%)',
    border: '2px solid rgba(210, 170, 255, 0.4)',
    shadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(130,60,255,0.2)',
    headerColor: '#fce8ff',
    headerFont: "'Great Vibes', cursive",
    headerShadow: '0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(190,120,255,0.8)',
    footerColor: 'rgba(255,255,255,0.7)',
    imgBorder: '3px solid rgba(255,255,255,0.9)',
    imgShadow: '0 4px 12px rgba(0,0,0,0.6)',
    overlay: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 1px, transparent 1px)',
    overlaySize: '50px 50px',
  },
  {
    id: 'rose',
    name: '🌹 Rose',
    bg: 'linear-gradient(180deg, #2a0a14 0%, #4a0e24 50%, #2a0a14 100%)',
    border: '2px solid rgba(255, 150, 180, 0.4)',
    shadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 0 30px rgba(255,60,120,0.15)',
    headerColor: '#ffe0ea',
    headerFont: "'Great Vibes', cursive",
    headerShadow: '0 0 10px rgba(255,200,220,0.5), 0 0 20px rgba(255,100,150,0.6)',
    footerColor: 'rgba(255,220,230,0.7)',
    imgBorder: '3px solid rgba(255,200,210,0.8)',
    imgShadow: '0 4px 12px rgba(0,0,0,0.5)',
    overlay: 'radial-gradient(circle at 15% 25%, rgba(255,180,200,0.06) 1px, transparent 1px), radial-gradient(circle at 85% 75%, rgba(255,180,200,0.06) 1px, transparent 1px)',
    overlaySize: '40px 40px',
  },
  {
    id: 'classic',
    name: '🖤 Classic',
    bg: 'linear-gradient(180deg, #111 0%, #222 50%, #111 100%)',
    border: '2px solid rgba(255,255,255,0.2)',
    shadow: '0 10px 40px rgba(0,0,0,0.8)',
    headerColor: '#fff',
    headerFont: "'Cormorant Garamond', serif",
    headerShadow: 'none',
    footerColor: 'rgba(255,255,255,0.5)',
    imgBorder: '3px solid #fff',
    imgShadow: '0 4px 12px rgba(0,0,0,0.8)',
    overlay: 'none',
    overlaySize: '0',
  },
  {
    id: 'polaroid',
    name: '📸 Polaroid',
    bg: '#faf8f5',
    border: '1px solid #e0ddd8',
    shadow: '0 10px 30px rgba(0,0,0,0.25)',
    headerColor: '#333',
    headerFont: "'Great Vibes', cursive",
    headerShadow: 'none',
    footerColor: '#888',
    imgBorder: '1px solid #ddd',
    imgShadow: '0 2px 8px rgba(0,0,0,0.15)',
    overlay: 'none',
    overlaySize: '0',
  },
  {
    id: 'neon',
    name: '💜 Neon',
    bg: '#0a0a0a',
    border: '2px solid #b026ff',
    shadow: '0 0 20px rgba(176,38,255,0.5), 0 0 60px rgba(176,38,255,0.2), inset 0 0 20px rgba(176,38,255,0.1)',
    headerColor: '#e0b0ff',
    headerFont: "'Arial', sans-serif",
    headerShadow: '0 0 10px #b026ff, 0 0 30px #b026ff',
    footerColor: 'rgba(200,160,255,0.7)',
    imgBorder: '2px solid #b026ff',
    imgShadow: '0 0 12px rgba(176,38,255,0.4)',
    overlay: 'none',
    overlaySize: '0',
  },
];

export default function PhotoboothStrip({ photos, onRetake }) {
  const stripRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [templateIdx, setTemplateIdx] = useState(0);

  const tpl = TEMPLATES[templateIdx];

  const handleSaveImage = async () => {
    if (!stripRef.current) return;
    setIsProcessing(true);
    setStatusText('Generating Image...');
    try {
      const dataUrl = await htmlToImage.toJpeg(stripRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = `faerie-photobooth-${tpl.id}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to save image', err);
      alert('Failed to save image.');
    }
    setIsProcessing(false);
    setStatusText('');
  };

  const handleSaveGif = async () => {
    setIsProcessing(true);
    setStatusText('Generating GIF...');
    try {
      const GIF = (await import('gif.js')).default;
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: '/node_modules/gif.js/dist/gif.worker.js',
      });

      for (const src of photos) {
        const img = new Image();
        img.src = src;
        await new Promise(r => { img.onload = r; });
        gif.addFrame(img, { delay: 600 });
      }

      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'faerie-photobooth.gif';
        link.href = url;
        link.click();
        setIsProcessing(false);
        setStatusText('');
      });

      gif.render();
    } catch (err) {
      console.error('Failed to generate GIF', err);
      alert('Failed to generate GIF.');
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const stripStyle = {
    background: tpl.bg,
    border: tpl.border,
    boxShadow: tpl.shadow,
    padding: '24px',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const overlayStyle = tpl.overlay !== 'none' ? {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: tpl.overlay,
    backgroundSize: tpl.overlaySize,
    pointerEvents: 'none',
  } : null;

  return (
    <div className="pb-strip-view">
      {/* Template Selector */}
      <div className="pb-template-selector">
        <div className="pb-template-label">Choose a template</div>
        <div className="pb-template-options">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              className={`pb-template-btn ${i === templateIdx ? 'active' : ''}`}
              onClick={() => setTemplateIdx(i)}
              style={i === templateIdx ? { borderColor: '#b026ff', boxShadow: '0 0 12px rgba(176,38,255,0.5)' } : {}}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* The Rendered Strip */}
      <div ref={stripRef} style={stripStyle}>
        {overlayStyle && <div style={overlayStyle}></div>}
        <div style={{
          fontFamily: tpl.headerFont,
          color: tpl.headerColor,
          fontSize: '32px',
          marginBottom: '20px',
          textShadow: tpl.headerShadow,
          position: 'relative',
          zIndex: 2,
        }}>
          Faerie Photobooth
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 2 }}>
          {photos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Photo ${i + 1}`}
              style={{
                width: '260px',
                height: 'auto',
                borderRadius: '4px',
                border: tpl.imgBorder,
                boxShadow: tpl.imgShadow,
              }}
            />
          ))}
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          color: tpl.footerColor,
          fontSize: '16px',
          marginTop: '16px',
          letterSpacing: '2px',
          position: 'relative',
          zIndex: 2,
        }}>
          {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pb-strip-actions">
        <button className="faerie-btn" onClick={handleSaveImage} disabled={isProcessing}>
          Save as Image
        </button>
        <button className="faerie-btn" onClick={handleSaveGif} disabled={isProcessing}>
          Save as GIF
        </button>
        <button className="faerie-btn retake-btn" onClick={onRetake} disabled={isProcessing}>
          Retake
        </button>
        {statusText && <div className="pb-status-text">{statusText}</div>}
      </div>
    </div>
  );
}
