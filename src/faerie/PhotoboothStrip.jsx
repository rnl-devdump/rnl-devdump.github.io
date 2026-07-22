import { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';
import GIF from 'gif.js';

export default function PhotoboothStrip({ photos, onRetake }) {
  const stripRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');

  const handleSaveImage = async () => {
    if (!stripRef.current) return;
    setIsProcessing(true);
    setStatusText('Generating Image...');
    try {
      const dataUrl = await htmlToImage.toJpeg(stripRef.current, { quality: 0.95 });
      const link = document.createElement('a');
      link.download = 'faerie-photobooth.jpg';
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
      const gif = new GIF({
        workers: 2,
        quality: 10,
        workerScript: '/node_modules/gif.js/dist/gif.worker.js' 
        // Note: For a real production build, gif.worker.js needs to be served publicly, 
        // but for local dev this often works, or we can use a CDN worker.
        // As a fallback if it fails, it will throw an error.
      });

      // Load all images onto canvases to add to GIF
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
      alert('Failed to generate GIF. Make sure gif.js worker is accessible.');
      setIsProcessing(false);
      setStatusText('');
    }
  };

  return (
    <div className="pb-strip-view">
      <div className="pb-strip-container" ref={stripRef}>
        <div className="pb-strip-header">Faerie Photobooth</div>
        <div className="pb-strip-photos">
          {photos.map((src, i) => (
            <img key={i} src={src} alt={`Photo ${i+1}`} className="pb-strip-img" />
          ))}
        </div>
        <div className="pb-strip-footer">{new Date().toLocaleDateString()}</div>
      </div>

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
