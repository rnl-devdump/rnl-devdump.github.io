import { useEffect, useRef, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function FaerieLanding() {
  const [isLoadingLetter, setIsLoadingLetter] = useState(false);
  const galaxyCanvasRef = useRef(null);
  const glitterCanvasRef = useRef(null);

  const handleLatestLetterClick = async (e) => {
    e.preventDefault();
    if (isLoadingLetter) return;
    setIsLoadingLetter(true);
    try {
      const q = query(collection(db, "letterC"), orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const latestId = snap.docs[0].id;
        const data = snap.docs[0].data();
        const hasPics = data.pic1 || data.pic2;
        const base = hasPics ? "/letterx" : "/letter";
        window.location.href = `${base}/?id=${encodeURIComponent(latestId)}`;
      } else {
        alert("No letters found.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch the latest letter.");
    } finally {
      setIsLoadingLetter(false);
    }
  };

  useEffect(() => {
    const gc = galaxyCanvasRef.current;
    const gl = glitterCanvasRef.current;
    if (!gc || !gl) return;

    const gCtx = gc.getContext("2d");
    const glCtx = gl.getContext("2d");

    const PAL = [
      "220,200,255",
      "195,165,255",
      "175,140,245",
      "210,185,255",
      "240,230,255",
      "255,255,255",
      "230,210,255",
    ];
    let glitters = [];

    const drawBg = () => {
      const W = gc.width;
      const H = gc.height;
      gCtx.clearRect(0, 0, W, H);
      gCtx.fillStyle = "#06040f";
      gCtx.fillRect(0, 0, W, H);
      const wash = gCtx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      wash.addColorStop(0, "rgba(155,120,230,0.10)");
      wash.addColorStop(0.5, "rgba(110,80,200,0.06)");
      wash.addColorStop(1, "rgba(50,30,100,0)");
      gCtx.fillStyle = wash;
      gCtx.fillRect(0, 0, W, H);
      
      const ox = W * 0.74;
      const oy = H * 0.1;
      const orR = Math.min(W, H) * 0.74;
      const halo = gCtx.createRadialGradient(ox, oy, orR * 0.5, ox, oy, orR * 1.18);
      halo.addColorStop(0, "rgba(160,120,230,0)");
      halo.addColorStop(0.5, "rgba(130,90,210,0.15)");
      halo.addColorStop(1, "rgba(60,30,120,0)");
      gCtx.beginPath();
      gCtx.arc(ox, oy, orR * 1.18, 0, Math.PI * 2);
      gCtx.fillStyle = halo;
      gCtx.fill();
      
      const orb = gCtx.createRadialGradient(ox * 0.88, oy * 1.3, 0, ox, oy, orR);
      orb.addColorStop(0, "rgba(245,240,255,0.97)");
      orb.addColorStop(0.15, "rgba(220,208,248,0.90)");
      orb.addColorStop(0.38, "rgba(185,162,232,0.70)");
      orb.addColorStop(0.65, "rgba(130,95,200,0.38)");
      orb.addColorStop(1, "rgba(45,20,90,0)");
      gCtx.beginPath();
      gCtx.arc(ox, oy, orR, 0, Math.PI * 2);
      gCtx.fillStyle = orb;
      gCtx.fill();
      
      gCtx.save();
      gCtx.beginPath();
      gCtx.arc(ox, oy, orR - 2, 0, Math.PI * 2);
      gCtx.strokeStyle = "rgba(195,170,255,0.28)";
      gCtx.lineWidth = 2.5;
      gCtx.stroke();
      gCtx.restore();
      
      const dust = gCtx.createRadialGradient(W * 0.28, H * 0.92, 0, W * 0.28, H * 0.92, W * 0.74);
      dust.addColorStop(0, "rgba(150,100,230,0.32)");
      dust.addColorStop(0.35, "rgba(100,65,190,0.14)");
      dust.addColorStop(1, "rgba(25,10,70,0)");
      gCtx.beginPath();
      gCtx.arc(W * 0.28, H * 0.92, W * 0.74, 0, Math.PI * 2);
      gCtx.fillStyle = dust;
      gCtx.fill();
      
      const wisp = gCtx.createRadialGradient(W * 0.08, H * 0.6, 0, W * 0.08, H * 0.6, W * 0.35);
      wisp.addColorStop(0, "rgba(130,90,210,0.14)");
      wisp.addColorStop(1, "rgba(80,50,160,0)");
      gCtx.beginPath();
      gCtx.arc(W * 0.08, H * 0.6, W * 0.35, 0, Math.PI * 2);
      gCtx.fillStyle = wisp;
      gCtx.fill();
    };

    const initGlitters = () => {
      glitters = [];
      const W = gl.width;
      const H = gl.height;
      for (let i = 0; i < 340; i++) {
        const t = Math.pow(Math.random(), 0.6);
        glitters.push({
          x: Math.random() * W,
          y: H * 0.35 + t * H * 0.65,
          r: Math.random() * 1.8 + 0.35,
          ph: Math.random() * Math.PI * 2,
          spd: Math.random() * 1.5 + 0.4,
          rgb: PAL[Math.floor(Math.random() * PAL.length)],
          base: Math.random() * 0.6 + 0.2,
        });
      }
      for (let i = 0; i < 80; i++) {
        glitters.push({
          x: W * 0.5 + (Math.random() - 0.5) * W * 0.55,
          y: (Math.random() - 0.1) * H * 0.55,
          r: Math.random() * 1.0 + 0.2,
          ph: Math.random() * Math.PI * 2,
          spd: Math.random() * 0.8 + 0.25,
          rgb: Math.random() > 0.4 ? "240,230,255" : "255,255,255",
          base: Math.random() * 0.25 + 0.04,
        });
      }
    };

    const resize = () => {
      gc.width = gl.width = window.innerWidth;
      gc.height = gl.height = window.innerHeight;
      drawBg();
      initGlitters();
    };
    resize();

    window.addEventListener("resize", resize);

    let raf = 0;
    const animGlitter = (ts) => {
      const t = ts * 0.001;
      const W = gl.width;
      const H = gl.height;
      glCtx.clearRect(0, 0, W, H);
      for (const g of glitters) {
        const a = g.base * (0.2 + 0.8 * Math.abs(Math.sin(t * g.spd + g.ph)));
        if (a < 0.01) continue;
        if (g.r > 1.1) {
          glCtx.save();
          glCtx.globalAlpha = a * 0.9;
          glCtx.strokeStyle = `rgb(${g.rgb})`;
          glCtx.lineWidth = 0.7;
          const arm = g.r * 3.8;
          glCtx.beginPath();
          glCtx.moveTo(g.x - arm, g.y);
          glCtx.lineTo(g.x + arm, g.y);
          glCtx.moveTo(g.x, g.y - arm);
          glCtx.lineTo(g.x, g.y + arm);
          glCtx.stroke();
          glCtx.globalAlpha = a * 0.3;
          const d = arm * 0.5;
          glCtx.beginPath();
          glCtx.moveTo(g.x - d, g.y - d);
          glCtx.lineTo(g.x + d, g.y + d);
          glCtx.moveTo(g.x + d, g.y - d);
          glCtx.lineTo(g.x - d, g.y + d);
          glCtx.stroke();
          glCtx.restore();
        }
        const grd = glCtx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r * 3);
        grd.addColorStop(0, `rgba(${g.rgb},${a.toFixed(3)})`);
        grd.addColorStop(1, `rgba(${g.rgb},0)`);
        glCtx.beginPath();
        glCtx.arc(g.x, g.y, g.r * 3, 0, Math.PI * 2);
        glCtx.fillStyle = grd;
        glCtx.fill();
      }
      raf = requestAnimationFrame(animGlitter);
    };
    raf = requestAnimationFrame(animGlitter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="faerie-root">
      <div id="page-stars">
        <canvas id="galaxy-canvas" ref={galaxyCanvasRef} />
        <canvas id="glitter-canvas" ref={glitterCanvasRef} />
        
        <div className="faerie-content">
          <h1 className="faerie-title">For Faerie</h1>
          
          <div className="faerie-cards">
            <a href="#/photobooth" className="faerie-card">
              <div className="faerie-card-icon">
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h2 className="faerie-card-title">Photobooth</h2>
              <p className="faerie-card-desc">Take pictures together with your babi</p>
            </a>
            
            <a href="/letter/" className="faerie-card" onClick={handleLatestLetterClick} style={{ cursor: isLoadingLetter ? "wait" : "pointer" }}>
              <div className="faerie-card-icon">
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 className="faerie-card-title">{isLoadingLetter ? "Loading..." : "Latest Letter"}</h2>
              <p className="faerie-card-desc">Read the latest letter from your babi</p>
            </a>

            <a href="/letterhelper/" className="faerie-card">
              <div className="faerie-card-icon">
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <h2 className="faerie-card-title">Letter Helper</h2>
              <p className="faerie-card-desc">Write and edit your own letter and send to your babi</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
