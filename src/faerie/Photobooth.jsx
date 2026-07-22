import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from './WebRTCManager';
import PhotoboothControls from './PhotoboothControls';
import PhotoboothStrip from './PhotoboothStrip';

export default function Photobooth() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcManager = useRef(null);

  const [roomState, setRoomState] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [countdown, setCountdown] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [flash, setFlash] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-30), msg]);
  }, []);

  useEffect(() => {
    async function startMedia() {
      try {
        addLog('[UI] Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        addLog('[UI] Camera access granted');
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        const manager = new WebRTCManager(
          (rStream) => {
            addLog('[UI] Remote stream received!');
            setRemoteStream(rStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = rStream;
            }
          },
          (state) => {
            setRoomState(state);
          },
          addLog
        );
        await manager.init(stream);
        webrtcManager.current = manager;
        addLog(`[UI] Initialized as ${manager.role}`);
      } catch (err) {
        addLog(`[UI] Error: ${err.message}`);
        console.error("Error accessing webcam: ", err);
      }
    }
    
    startMedia();
    return () => {
      if (webrtcManager.current) webrtcManager.current.leaveRoom();
    };
  }, [addLog]);

  useEffect(() => {
    if (roomState && roomState.callerReady && roomState.calleeReady && !isCapturing && !isFinished) {
      startCaptureSequence();
    }
  }, [roomState, isCapturing, isFinished]);

  const startCaptureSequence = async () => {
    setIsCapturing(true);
    const count = roomState.photosCount || 4;
    const captured = [];
    
    for (let i = 0; i < count; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown('SNAP!');
      setFlash(true);
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#1a0b2e';
      ctx.fillRect(0, 0, 640, 480);
      
      if (localVideoRef.current) {
        ctx.drawImage(localVideoRef.current, 10, 10, 305, 460);
      }
      if (remoteVideoRef.current) {
        ctx.drawImage(remoteVideoRef.current, 325, 10, 305, 460);
      }
      
      captured.push(canvas.toDataURL('image/jpeg', 0.8));
      setPhotos([...captured]);
      
      setTimeout(() => setFlash(false), 300);
      
      await new Promise(r => setTimeout(r, 800));
      setCountdown(null);
    }
    
    setIsFinished(true);
    webrtcManager.current.setReadyState(false);
  };

  const handleReady = (ready) => {
    if (webrtcManager.current) webrtcManager.current.setReadyState(ready);
  };

  const handlePhotosCount = (count) => {
    if (webrtcManager.current) webrtcManager.current.setPhotosCount(count);
  };

  return (
    <div className="faerie-root">
      <div id="page-stars">
        <div className="photobooth-container">
          
          <a href="#/" className="back-btn">&larr; Back to Landing</a>
          
          {!isFinished && (
            <div className="video-streams">
              <div className="video-wrapper">
                <video ref={localVideoRef} autoPlay playsInline muted className="video-feed" />
                <div className="video-label">You</div>
              </div>
              <div className="video-wrapper">
                <video ref={remoteVideoRef} autoPlay playsInline className="video-feed remote-feed" />
                <div className="video-label">Partner</div>
                {!remoteStream && <div className="waiting-overlay">Waiting for partner...</div>}
              </div>
              {countdown && <div className="countdown-overlay" key={countdown}>{countdown}</div>}
              {flash && <div className="flash-overlay"></div>}
            </div>
          )}
          
          {!isFinished ? (
            <PhotoboothControls 
              roomState={roomState}
              onReady={handleReady}
              onCountChange={handlePhotosCount}
              role={webrtcManager.current?.role}
              disabled={isCapturing}
            />
          ) : (
            <PhotoboothStrip 
              photos={photos} 
              onRetake={() => {
                setPhotos([]);
                setIsCapturing(false);
                setIsFinished(false);
              }} 
            />
          )}

          {/* Connection log */}
          <div className="connection-log">
            <div className="connection-log-header">Connection Log</div>
            <div className="connection-log-body">
              {logs.map((entry, i) => (
                <div key={i} className="connection-log-entry">{entry}</div>
              ))}
              {logs.length === 0 && <div className="connection-log-entry">Starting...</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
