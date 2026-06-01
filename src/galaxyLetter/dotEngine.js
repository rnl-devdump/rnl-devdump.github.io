export const DOT_STEP = 5;
export const MIGRATE_DUR = 1800;

export function createDotState() {
  const offC = document.createElement("canvas");
  return {
    dots: [],
    dotsReady: false,
    dotPhase: "letter",
    migrateStart: 0,
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
        x: jx,
        y: jy,
        tx: jx,
        ty: jy,
        r: Math.random() * 0.9 + 0.7,
        minA: 0.65 + Math.random() * 0.2,
        ph: Math.random() * Math.PI * 2,
        spd: Math.random() * 1.0 + 0.25,
        born: now + Math.random() * 2500,
        fadeMs: 300 + Math.random() * 400,
        delay: Math.random() * 500,
      });
    }
  }
  state.dotsReady = true;
}

function perimPoint(bx, by, bw, bh, r, t, perim) {
  const seg = [
    { len: bw - 2 * r, type: "line", x0: bx + r, y0: by, dx: 1, dy: 0 },
    { len: (Math.PI / 2) * r, type: "arc", cx: bx + bw - r, cy: by + r, a0: -Math.PI / 2, da: 1 },
    { len: bh - 2 * r, type: "line", x0: bx + bw, y0: by + r, dx: 0, dy: 1 },
    { len: (Math.PI / 2) * r, type: "arc", cx: bx + bw - r, cy: by + bh - r, a0: 0, da: 1 },
    { len: bw - 2 * r, type: "line", x0: bx + bw - r, y0: by + bh, dx: -1, dy: 0 },
    { len: (Math.PI / 2) * r, type: "arc", cx: bx + r, cy: by + bh - r, a0: Math.PI / 2, da: 1 },
    { len: bh - 2 * r, type: "line", x0: bx, y0: by + bh - r, dx: 0, dy: -1 },
    { len: (Math.PI / 2) * r, type: "arc", cx: bx + r, cy: by + r, a0: Math.PI, da: 1 },
  ];
  let rem = ((t % perim) + perim) % perim;
  for (const s of seg) {
    if (rem <= s.len) {
      const frac = rem / s.len;
      if (s.type === "line") return { x: s.x0 + s.dx * rem, y: s.y0 + s.dy * rem };
      const angle = s.a0 + s.da * (Math.PI / 2) * frac;
      return { x: s.cx + Math.cos(angle) * r, y: s.cy + Math.sin(angle) * r };
    }
    rem -= s.len;
  }
  return { x: bx, y: by };
}

function getBoxOutlineTargets(state) {
  const RADIUS = 6;
  const rects = [0, 1, 2, 3].map((i) => document.getElementById(`b${i}`).getBoundingClientRect());
  const allPts = [];

  for (const rect of rects) {
    const { left: bx, top: by, width: bw, height: bh } = rect;
    const straightW = bw - 2 * RADIUS;
    const straightH = bh - 2 * RADIUS;
    const arcLen = (Math.PI / 2) * RADIUS;
    const perim = 2 * (straightW + straightH) + 4 * arcLen;
    const STEPS = Math.ceil(perim / 4);
    for (let i = 0; i < STEPS; i++) {
      const t = (i / STEPS) * perim;
      const pt = perimPoint(bx, by, bw, bh, RADIUS, t, perim);
      allPts.push({ x: pt.x + (Math.random() - 0.5) * 2, y: pt.y + (Math.random() - 0.5) * 2 });
    }
  }

  for (let i = allPts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPts[i], allPts[j]] = [allPts[j], allPts[i]];
  }

  return state.dots.map((_, i) => allPts[i % allPts.length]);
}

function easeOutQuart(t) {
  return 1 - (1 - t) ** 4;
}

export function startMigration(state) {
  if (!state.dotsReady) {
    setTimeout(() => startMigration(state), 80);
    return;
  }

  const targets = getBoxOutlineTargets(state);
  state.dots.forEach((d, i) => {
    d.tx = targets[i].x;
    d.ty = targets[i].y;
  });

  state.dotPhase = "migrate";
  state.migrateStart = performance.now();
  setTimeout(() => {
    state.dotPhase = "outline";
  }, MIGRATE_DUR + 800);
}

export function drawDots(ctx, ts, state) {
  const t = ts * 0.001;
  if (!state.dotsReady) return;

  for (const d of state.dots) {
    let cx;
    let cy;
    let alpha;
    let radius;

    if (state.dotPhase === "letter") {
      const age = ts - d.born;
      if (age < 0) continue;
      const fadeIn = Math.min(age / d.fadeMs, 1);
      const shimmer = d.minA + (1 - d.minA) * (0.5 + 0.5 * Math.sin(t * d.spd + d.ph));
      alpha = shimmer * fadeIn;
      radius = d.r;
      cx = d.ox;
      cy = d.oy;
    } else if (state.dotPhase === "migrate") {
      const elapsed = ts - state.migrateStart - d.delay;
      const rawP = Math.max(0, Math.min(elapsed / MIGRATE_DUR, 1));
      const p = easeOutQuart(rawP);
      cx = d.ox + (d.tx - d.ox) * p;
      cy = d.oy + (d.ty - d.oy) * p;
      d.x = cx;
      d.y = cy;
      const shimmer = d.minA + (1 - d.minA) * (0.5 + 0.5 * Math.sin(t * d.spd + d.ph));
      alpha = shimmer * (0.5 + rawP * 0.5);
      radius = d.r;
    } else {
      cx = d.x;
      cy = d.y;
      const shimmer = 0.5 + 0.5 * Math.sin(t * d.spd * 0.7 + d.ph);
      alpha = 0.45 + shimmer * 0.5;
      radius = d.r * (0.85 + shimmer * 0.3);
    }

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

export function resetDotPhase(state) {
  state.dotPhase = "letter";
}
