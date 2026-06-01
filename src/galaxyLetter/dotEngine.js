export const DOT_STEP = 5;

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
  for (let y = 0; y < H; y += DOT_STEP) {
    for (let x = 0; x < W; x += DOT_STEP) {
      if (px[(y * W + x) * 4 + 3] < 60) continue;
      const jx = x + (Math.random() - 0.5) * DOT_STEP * 0.7;
      const jy = y + (Math.random() - 0.5) * DOT_STEP * 0.7;
      state.dots.push({
        ox: jx,
        oy: jy,
        r: Math.random() * 0.9 + 0.7,
        minA: 0.65 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2,
        spd: Math.random() * 1.0 + 0.25,
        born: now + Math.random() * 2500,
        fadeMs: 300 + Math.random() * 400,
      });
    }
  }
  state.dotsReady = true;
}

export function drawLetterDots(ctx, ts, state) {
  const t = ts * 0.001;
  if (!state.dotsReady) return;

  for (const d of state.dots) {
    const age = ts - d.born;
    if (age < 0) continue;
    const fadeIn = Math.min(age / d.fadeMs, 1);
    const shimmer = d.minA + (1 - d.minA) * (0.5 + 0.5 * Math.sin(t * d.spd + d.ph));
    const alpha = shimmer * fadeIn;
    const radius = d.r;
    const cx = d.ox;
    const cy = d.oy;

    const glowR = radius * 1.8;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grd.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
    grd.addColorStop(0.75, `rgba(230,215,255,${(alpha * 0.6).toFixed(3)})`);
    grd.addColorStop(1, "rgba(200,180,255,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(alpha * 1.2, 1).toFixed(3)})`;
    ctx.fill();
  }
}
