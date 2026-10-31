let tCanvas = null;
const transition = {
  active: false, type: 'slash', startTime: 0, duration: 800,
  callback: null, callbackExecuted: false, shards: [],
  slashAngle: 0, currentT: 0, returning: false
};

export function setTransitionCanvas(cv) { tCanvas = cv; }
function dims() { return { w: tCanvas.clientWidth, h: tCanvas.clientHeight }; }

export function startTransition(callback, type = 'slash') {
  transition.active = true;
  transition.type = type;
  transition.startTime = Date.now();
  transition.callback = callback;
  transition.callbackExecuted = false;
  transition.currentT = 0;
  transition.returning = false;
  transition.slashAngle = (Math.random() - 0.5) * 0.5;
  if (type === 'shatter') {
    transition.shards = [];
    const { w, h } = dims();
    for (let i = 0; i < 15; i++) {
      transition.shards.push({
        x: Math.random() * w, y: Math.random() * h,
        size: 40 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
        rotation: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.2,
        delay: Math.random() * 0.3
      });
    }
  }
}

export function updateTransition() {
  if (!transition.active) return;
  const elapsed = Date.now() - transition.startTime;
  const half = transition.duration / 2;
  if (elapsed < half) {
    transition.returning = false;
    const p = elapsed / half;
    transition.currentT = p * p * (3 - 2 * p);
  } else if (elapsed < transition.duration) {
    transition.returning = true;
    if (!transition.callbackExecuted && transition.callback) { transition.callback(); transition.callbackExecuted = true; }
    const p = (elapsed - half) / half, inv = 1 - p;
    transition.currentT = inv * inv * (3 - 2 * inv);
  } else {
    transition.returning = false;
    if (!transition.callbackExecuted && transition.callback) transition.callback();
    transition.active = false; transition.currentT = 0;
  }
}

export function isTransitionActive() { return transition.active; }

export function drawTransition(ctx) {
  if (!tCanvas) return;
  const { w, h } = dims();
  ctx.clearRect(0, 0, w, h);
  if (!transition.active) return;
  const t = transition.currentT;
  switch (transition.type) {
    case 'slash': drawSlashTransition(ctx, t); break;
    case 'slide': drawSlideTransition(ctx, t); break;
    case 'zoom': drawZoomTransition(ctx, t); break;
    case 'shatter': drawShatterTransition(ctx, t); break;
    case 'diagonal': drawDiagonalTransition(ctx, t); break;
    case 'introToGame': drawIntroToGameTransition(ctx, t); break;
  }
}

function drawSlashTransition(ctx, t) {
  const { w, h } = dims();
  ctx.save();
  const angle = -0.3 + transition.slashAngle;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  const maxWidth = Math.max(w, h) * 3;
  const currentWidth = maxWidth * t;
  ctx.fillStyle = '#000000';
  ctx.fillRect(-maxWidth / 2, -currentWidth / 2, maxWidth, currentWidth);
  if (t > 0.2) {
    const redAlpha = Math.min(1, (t - 0.2) * 2);
    ctx.fillStyle = `rgba(229, 57, 53, ${redAlpha})`;
    const rw = currentWidth * 0.08;
    ctx.fillRect(-maxWidth / 2, -currentWidth / 2 - rw - 3, maxWidth, rw);
    ctx.fillRect(-maxWidth / 2, currentWidth / 2 + 3, maxWidth, rw);
  }
  ctx.restore();
}

function drawSlideTransition(ctx, t) {
  const { w, h } = dims();
  const bw = w * t;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, bw, h);
  ctx.fillRect(w - bw, 0, bw, h);
  if (t > 0.1 && t < 0.95) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const y = (h / 10) * i + h / 10 / 2;
      const ll = 80 * (1 - Math.abs(t - 0.5) * 2);
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(bw - ll, y); ctx.lineTo(bw, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w - bw, y); ctx.lineTo(w - bw + ll, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (t > 0.7) {
    const ci = (t - 0.7) * 3.3;
    ctx.fillStyle = `rgba(229, 57, 53, ${Math.min(1, ci)})`;
    ctx.fillRect(w / 2 - 4, 0, 8, h);
  }
}

function drawZoomTransition(ctx, t) {
  const { w, h } = dims();
  const cx = w / 2, cy = h / 2;
  const halfDiag = Math.hypot(w, h) / 2 + 60;
  const returning = transition.returning;
  let left, right;
  if (!returning) { left = -halfDiag; right = -halfDiag + 2 * halfDiag * t; }
  else { left = -halfDiag + 2 * halfDiag * (1 - t); right = halfDiag; }
  const edge = returning ? left : right;
  const width = right - left;
  if (width <= 0) return;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, -halfDiag, width, 2 * halfDiag); ctx.clip();
  ctx.fillStyle = '#E53935';
  ctx.fillRect(left, -halfDiag, width, 2 * halfDiag);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'; ctx.lineWidth = 2;
  const step = 36, flow = (Date.now() * 0.06) % step;
  for (let gx = left - step + flow; gx < right; gx += step) {
    ctx.beginPath(); ctx.moveTo(gx, -halfDiag); ctx.lineTo(gx, halfDiag); ctx.stroke();
  }
  const blade = 14;
  ctx.fillStyle = '#000000';
  if (!returning) {
    ctx.fillRect(edge - blade, -halfDiag, blade, 2 * halfDiag);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(edge - blade - 2, -halfDiag, 2, 2 * halfDiag);
  } else {
    ctx.fillRect(edge, -halfDiag, blade, 2 * halfDiag);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(edge + blade, -halfDiag, 2, 2 * halfDiag);
  }
  ctx.restore();
  if (t > 0.08 && t < 0.92) {
    const dir = returning ? -1 : 1;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    for (let s = 0; s < 7; s++) {
      const sy = -halfDiag + (2 * halfDiag) * ((s + 0.5) / 7);
      const len = 18 + ((s * 53) % 22);
      const ox = edge + dir * (blade + 4);
      ctx.globalAlpha = 0.2 + 0.35 * Math.abs(Math.sin(Date.now() * 0.01 + s));
      ctx.beginPath(); ctx.moveTo(ox, sy); ctx.lineTo(ox + dir * len, sy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawShatterTransition(ctx, t) {
  const { w, h } = dims();
  ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, t * 1.5)})`;
  ctx.fillRect(0, 0, w, h);
  transition.shards.forEach(shard => {
    const st = Math.max(0, Math.min(1, (t - shard.delay) / (1 - shard.delay)));
    if (st <= 0) return;
    ctx.save();
    ctx.translate(shard.x, shard.y); ctx.rotate(shard.rotation);
    ctx.fillStyle = `rgba(229, 57, 53, ${st * 0.8})`;
    ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
    ctx.strokeStyle = `rgba(0, 0, 0, ${st})`; ctx.lineWidth = 3;
    ctx.strokeRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
    ctx.restore();
  });
}

function drawDiagonalTransition(ctx, t) {
  const { w, h } = dims();
  const baseAlpha = Math.min(1, t * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${baseAlpha})`;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const exp = t * 1.5;
  const off1 = w * (1 - exp);
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w - off1, 0); ctx.lineTo(0, h - off1); ctx.closePath(); ctx.fill();
  const off2 = w * (1 - exp);
  ctx.beginPath();
  ctx.moveTo(w, h); ctx.lineTo(off2, h); ctx.lineTo(w, off2); ctx.closePath(); ctx.fill();
  if (t > 0.1) {
    const la = Math.min(1, (t - 0.1) * 2);
    ctx.strokeStyle = `rgba(229, 57, 53, ${la})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(w - off1, 0); ctx.lineTo(0, h - off1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(off2, h); ctx.lineTo(w, off2); ctx.stroke();
  }
  ctx.restore();
}

// Cortes horizontales alternados negro/rojo (estilo del juego original)
function drawIntroToGameTransition(ctx, t) {
  const { w, h } = dims();
  const baseAlpha = Math.min(1, t * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${baseAlpha})`;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  const numCuts = 6;
  for (let i = 0; i < numCuts; i++) {
    const cutDelay = i * 0.08;
    const cutProgress = Math.max(0, Math.min(1, (t - cutDelay) / (1 - cutDelay)));
    if (cutProgress <= 0) continue;
    const cutEase = cutProgress * cutProgress * (3 - 2 * cutProgress);
    const y = (h / numCuts) * i;
    const cutH = (h / numCuts) * cutEase;
    const offset = (i % 2 === 0 ? -1 : 1) * w * (1 - cutEase);
    ctx.fillStyle = i % 2 === 0 ? '#000000' : '#E53935';
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(offset, y);
    ctx.lineTo(w + offset, y);
    ctx.lineTo(w + offset, y + cutH);
    ctx.lineTo(offset, y + cutH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}