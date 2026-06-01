import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  beginLetterFadeOut,
  createDotState,
  drawLetterDots,
  getDotLabel,
  sampleLetterDots,
} from "./galaxyLetter/dotEngine";
import { resolvePicUrl } from "./lib/letterConfig";

function splitParagraphs(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function TulipPin({ gradId }) {
  return (
    <span className="tulip-pin" aria-hidden="true">
      <svg className="tulip-pin-svg" viewBox="0 0 32 44" width="28" height="38" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ede4ff" />
            <stop offset="40%" stopColor="#c49bff" />
            <stop offset="100%" stopColor="#7e4fd4" />
          </linearGradient>
        </defs>
        <ellipse cx="9" cy="16" rx="5.5" ry="8.5" fill="#d4b5ff" opacity="0.9" />
        <ellipse cx="23" cy="16" rx="5.5" ry="8.5" fill="#d4b5ff" opacity="0.9" />
        <ellipse cx="16" cy="14" rx="9" ry="10" fill={`url(#${gradId})`} />
        <path d="M16 23v15" stroke="#5a3d8a" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="6.5" r="4.2" fill="#dcc8ff" stroke="#9b6de0" strokeWidth="1" />
        <circle cx="16" cy="6.5" r="1.4" fill="#faf7ff" opacity="0.95" />
      </svg>
    </span>
  );
}

export default function GalaxyLetterExperience({ config }) {
  const { header, content, regards, signature, expectedPin, pic1, pic2 } = config;
  const pic1Url = useMemo(() => resolvePicUrl(pic1), [pic1]);
  const pic2Url = useMemo(() => resolvePicUrl(pic2), [pic2]);
  const tulipGradA = useId().replace(/:/g, "");
  const tulipGradB = useId().replace(/:/g, "");

  const dotStateRef = useRef(null);
  if (!dotStateRef.current) dotStateRef.current = createDotState();

  const starsCanvasRef = useRef(null);
  const letterCanvasRef = useRef(null);
  const galaxyCanvasRef = useRef(null);
  const glitterCanvasRef = useRef(null);
  const pinInputRef = useRef(null);
  const pageStarsRef = useRef(null);
  const pagePinRef = useRef(null);
  const pinTransitionedRef = useRef(false);

  const [pinVal, setPinVal] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinShake, setPinShake] = useState(false);
  const [pinUiVisible, setPinUiVisible] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [galaxyActive, setGalaxyActive] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [pinPageActive, setPinPageActive] = useState(false);
  const [letterSceneActive, setLetterSceneActive] = useState(true);

  const paragraphs = useMemo(() => splitParagraphs(content), [content]);
  const dotLabel = useMemo(() => getDotLabel(header), [header]);

  const updatePinBoxes = useCallback((value) => {
    for (let i = 0; i < 4; i++) {
      const box = document.getElementById(`b${i}`);
      if (!box) continue;
      box.classList.remove("active", "filled");
      if (i < value.length) box.classList.add("filled");
      else if (i === value.length) box.classList.add("active");
    }
    const btn = document.getElementById("pinBtn");
    if (btn) btn.classList.toggle("ready", value.length === 4);
  }, []);

  const goToLetter = useCallback(() => {
    const overlay = document.getElementById("fade-overlay");
    const noteWrap = document.getElementById("noteWrap");
    if (!overlay) return;

    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "all";

    setTimeout(() => {
      setPinPageActive(false);
      setGalaxyActive(true);
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      setTimeout(() => {
        if (noteWrap) noteWrap.classList.add("visible");
        setNoteVisible(true);
      }, 700);
    }, 1050);
  }, []);

  const submitPin = useCallback(() => {
    if (pinVal.length < 4) return;
    if (pinVal === expectedPin) {
      goToLetter();
      return;
    }
    setPinError(true);
    setPinShake(true);
    setTimeout(() => setPinShake(false), 520);
    setPinVal("");
    if (pinInputRef.current) pinInputRef.current.value = "";
    updatePinBoxes("");
  }, [pinVal, expectedPin, goToLetter, updatePinBoxes]);

  const goToPin = useCallback(() => {
    setScrollHidden(true);
    beginLetterFadeOut(dotStateRef.current);

    const pageStars = pageStarsRef.current;
    const overlay = document.getElementById("fade-overlay");

    setTimeout(() => {
      setPinPageActive(true);
      if (overlay) {
        overlay.style.opacity = "1";
        overlay.style.pointerEvents = "none";
      }
      if (pageStars) {
        pageStars.style.transition = "opacity 1s ease";
        pageStars.style.opacity = "0";
      }

      setTimeout(() => {
        setLetterSceneActive(false);
        if (pageStars) pageStars.style.display = "none";
        if (overlay) overlay.style.opacity = "0";
        setPinUiVisible(true);
        pinInputRef.current?.focus();
      }, 1000);
    }, 1100);
  }, []);

  useEffect(() => {
    const init = () => sampleLetterDots(dotStateRef.current, dotLabel);
    if (document.fonts?.ready) {
      document.fonts.ready.then(init);
    } else {
      init();
    }
  }, [dotLabel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pinTransitionedRef.current) return;
      pinTransitionedRef.current = true;
      goToPin();
    }, 5000);
    return () => clearTimeout(timer);
  }, [goToPin]);

  useEffect(() => {
    updatePinBoxes(pinVal);
  }, [pinVal, updatePinBoxes]);

  useEffect(() => {
    if (!letterSceneActive) return undefined;

    const bgC = starsCanvasRef.current;
    const dotC = letterCanvasRef.current;
    if (!bgC || !dotC) return undefined;

    const bgCtx = bgC.getContext("2d");
    const dotCtx = dotC.getContext("2d");
    const state = dotStateRef.current;

    const resize = () => {
      bgC.width = dotC.width = window.innerWidth;
      bgC.height = dotC.height = window.innerHeight;
    };
    resize();

    const STAR_N = 450;
    let stars = [];
    const initStars = () => {
      stars = [];
      for (let i = 0; i < STAR_N; i++) {
        const isLav = Math.random() > 0.55;
        stars.push({
          x: Math.random() * bgC.width,
          y: Math.random() * bgC.height,
          r: Math.random() * 1.2 + 0.15,
          base: Math.random() * 0.5 + 0.12,
          ph: Math.random() * Math.PI * 2,
          spd: Math.random() * 0.5 + 0.1,
          rgb: isLav
            ? `${(210 + Math.random() * 40) | 0},${(185 + Math.random() * 30) | 0},255`
            : "255,255,255",
        });
      }
    };
    initStars();

    const onResize = () => {
      resize();
      initStars();
      sampleLetterDots(state, dotLabel);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const draw = (ts) => {
      const t = ts * 0.001;
      const W = bgC.width;
      const H = bgC.height;
      bgCtx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = s.base * (0.45 + 0.55 * Math.sin(t * s.spd + s.ph));
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(${s.rgb},${a.toFixed(3)})`;
        bgCtx.fill();
      }
      dotCtx.clearRect(0, 0, W, H);
      drawLetterDots(dotCtx, ts, state);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [dotLabel, letterSceneActive]);

  useEffect(() => {
    const gc = galaxyCanvasRef.current;
    const gl = glitterCanvasRef.current;
    if (!gc || !gl) return undefined;

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

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

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
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onPinInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPinVal(raw);
    e.target.value = raw;
    setPinError(false);
  };

  const onPinKeyDown = (e) => {
    if (e.key === "Enter" && pinVal.length === 4) submitPin();
  };

  return (
    <div className="galaxy-letter-root">
      <div id="fade-overlay" />

      <div id="page-stars" className="page" ref={pageStarsRef}>
        <canvas id="stars-canvas" ref={starsCanvasRef} />
        <canvas id="letter-canvas" ref={letterCanvasRef} />
        <div className={`scroll-hint${scrollHidden ? " hidden" : ""}`}>
          <span>wait</span>
          <div className="chev" />
        </div>
      </div>

      <div id="page-pin" className={`page${pinPageActive ? " active" : ""}`} ref={pagePinRef}>
        <input
          id="pin-input"
          ref={pinInputRef}
          type="tel"
          maxLength={4}
          autoComplete="off"
          inputMode="numeric"
          onInput={onPinInput}
          onKeyDown={onPinKeyDown}
        />
        <div
          className={`pin-ui${pinUiVisible ? " visible" : ""}`}
          onClick={() => pinInputRef.current?.focus()}
          role="presentation"
        >
          <div className="pin-label">enter your pin</div>
          <div className={`pin-boxes${pinShake ? " shake" : ""}`}>
            {[0, 1, 2, 3].map((i) => (
              <div className="pin-box" id={`b${i}`} key={i}>
                <div className="pin-cursor" />
                <div className="pin-dot-indicator" />
              </div>
            ))}
          </div>
          <div className={`pin-error${pinError ? " show" : ""}`}>incorrect — try again</div>
          <button type="button" className="pin-btn" id="pinBtn" onClick={submitPin}>
            Continue
          </button>
        </div>
      </div>

      <div id="page-galaxy" className={`page${galaxyActive ? " active" : ""}`}>
        <canvas id="galaxy-canvas" ref={galaxyCanvasRef} />
        <canvas id="glitter-canvas" ref={glitterCanvasRef} />
        <div className={`note-wrap${noteVisible ? " visible" : ""}`} id="noteWrap">
          <div className="note-card">
            <div className="note-heading">{header}</div>
            <div className="note-rule" />
            <div className="note-body">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
            {pic1Url || pic2Url ? (
              <div className="note-pics">
                {pic1Url ? (
                  <figure className="note-pic-frame note-pic-frame--left">
                    <TulipPin gradId={tulipGradA} />
                    <img className="note-pic" src={pic1Url} alt="" />
                  </figure>
                ) : null}
                {pic2Url ? (
                  <figure className="note-pic-frame note-pic-frame--right">
                    <TulipPin gradId={tulipGradB} />
                    <img className="note-pic" src={pic2Url} alt="" />
                  </figure>
                ) : null}
              </div>
            ) : null}
            <div className="note-regards">
              {regards}
              <div className="note-signature">{signature}</div>
            </div>
            <div className="letter-end-shimmer" aria-hidden="true">
              <div className="shimmer-plus">
                <span className="shimmer-plus-arm shimmer-plus-arm-h" />
                <span className="shimmer-plus-arm shimmer-plus-arm-v" />
                <span className="shimmer-plus-core" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
