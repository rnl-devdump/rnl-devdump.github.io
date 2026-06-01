export const DOT_STEP = 5;

/** purple → amethyst → lavender */
const DOT_PALETTES = [
  { core: [186, 130, 255], glow: [220, 190, 255], edge: [140, 85, 210] },
  { core: [167, 105, 240], glow: [200, 165, 255], edge: [120, 70, 195] },
  { core: [210, 175, 255], glow: [235, 215, 255], edge: [160, 120, 220] },
  { core: [150, 90, 230], glow: [190, 150, 255], edge: [110, 60, 180] },
  { core: [195, 160, 255], glow: [225, 200, 255], edge: [145, 100, 215] },
];

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function pickPalette() {
  return DOT_PALETTES[Math.floor(Math.random() * DOT_PALETTES.length)];
}

export function createDotState() {
  const offC = document.createElement("canvas");
  return {
    dots: [],
    dotsReady: false,
    offC,
    offCtx: offC.getContext("2d"),
  };
}

export function getDotLabel(header) {
  const word = (header || "FAE").split(/[\s,]+/)[0] || "FAE";
  const letters = word.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters || "FAE";
}

export function sampleLetterDots(state, label) {
  state.dots = [];
  state.dotsReady = false;
  const W = window.innerWidth;
  const H = window.innerHeight;
  state.offC.width = W;
  state.offC.height = H;

  const fontSize = Math.min(W * 0.28, H * 0.5, 240);
  state.offCtx.clearRect(0, 0, W, H);
  state.offCtx.font = `700 ${fontSize}px 'Cormorant Garamond', serif`;
  state.offCtx.textAlign = "center";
  state.offCtx.textBaseline = "middle";
  state.offCtx.fillStyle = "#fff";
  state.offCtx.fillText(label, W / 2, H / 2);

  const px = state.offCtx.getImageData(0, 0, W, H).data;
  state.offCtx.clearRect(0, 0, W, H);

  const now = performance.now();
  const candidates = [];

  for (let y = 0; y < H; y += DOT_STEP) {
    for (let x = 0; x < W; x += DOT_STEP) {
      if (px[(y * W + x) * 4 + 3] < 60) continue;
      const jx = x + (Math.random() - 0.5) * DOT_STEP * 0.7;
      const jy = y + (Math.random() - 0.5) * DOT_STEP * 0.7;
      const palette = pickPalette();
      candidates.push({
        ox: jx,
        oy: jy,
        r: Math.random() * 0.9 + 0.7,
        minA: 0.55 + Math.random() * 0.25,
        ph: Math.random() * Math.PI * 2,
        spd: Math.random() * 1.0 + 0.25,
        born: 0,
        fadeMs: 280 + Math.random() * 2200,
        fadeOutAt: null,
        fadeOutMs: 400 + Math.random() * 900,
        rgb: palette,
      });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const staggerWindow = 4200;
  candidates.forEach((d, i) => {
    d.born = now + (i / Math.max(candidates.length, 1)) * staggerWindow * 0.35 + Math.random() * staggerWindow * 0.65;
  });

  state.dots = candidates;
  state.dotsReady = true;
}

export function beginLetterFadeOut(state) {
  const now = performance.now();
  for (const d of state.dots) {
    d.fadeOutAt = now + Math.random() * 1100;
    d.fadeOutMs = 350 + Math.random() * 850;
  }
}

export function drawLetterDots(ctx, ts, state) {
  const t = ts * 0.001;
  if (!state.dotsReady) return;

  for (const d of state.dots) {
    const age = ts - d.born;
    if (age < 0) continue;

    let fadeIn = easeOutCubic(Math.min(age / d.fadeMs, 1));
    if (d.fadeOutAt != null) {
      const outAge = ts - d.fadeOutAt;
      if (outAge > 0) {
        fadeIn *= 1 - easeOutCubic(Math.min(outAge / d.fadeOutMs, 1));
      }
    }
    if (fadeIn <= 0.01) continue;

    const shimmer = d.minA + (1 - d.minA) * (0.5 + 0.5 * Math.sin(t * d.spd + d.ph));
    const alpha = shimmer * fadeIn;
    const radius = d.r;
    const cx = d.ox;
    const cy = d.oy;
    const [cr, cg, cb] = d.rgb.core;
    const [gr, gg, gb] = d.rgb.glow;
    const [er, eg, eb] = d.rgb.edge;

    const glowR = radius * 2.1;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grd.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`);
    grd.addColorStop(0.45, `rgba(${gr},${gg},${gb},${(alpha * 0.75).toFixed(3)})`);
    grd.addColorStop(1, `rgba(${er},${eg},${eb},0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${Math.min(alpha * 1.15, 1).toFixed(3)})`;
    ctx.fill();
  }
}
